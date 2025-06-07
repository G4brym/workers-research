import { LoadAPIKeyError, generateObject } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { marked } from "marked";
import { D1QB } from "workers-qb";
import { z } from "zod";
import type { Env, Variables } from "./bindings";
import { ResearchDetails } from "./layout/templates";
import { FOLLOWUP_QUESTIONS_PROMPT } from "./prompts";
import {
	CreateResearch,
	Layout,
	NewResearchQuestions,
	ResearchList,
	TopBar,
} from "./templates/layout";
import type { ResearchType, ResearchTypeDB } from "./types";
import { getModel } from "./utils";

export { ResearchWorkflow } from "./workflows";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get("/", async (c) => {
	const qb = new D1QB(c.env.DB);
	const researches = await qb
		.select<ResearchTypeDB>("researches")
		.orderBy("created_at desc")
		.all();

	return c.html(
		<Layout>
			<TopBar>
				<a
					href="/create"
					className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
				>
					+ New Research
				</a>
			</TopBar>
			<ResearchList researches={researches} />
		</Layout>,
	);
});

app.get("/create", async (c) => {
	return c.html(
		<Layout>
			<TopBar>
				<a
					href="/"
					className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					← Back to Reports
				</a>
			</TopBar>
			<CreateResearch />
			<script>loadNewResearch()</script>
		</Layout>,
	);
});

app.post("/create/questions", async (c) => {
	const form = await c.req.formData();
	const query = form.get("query") as string;

	let questions: string[];
	try {
		const { object } = await generateObject({
			model: getModel(c.env),
			messages: [
				{ role: "system", content: FOLLOWUP_QUESTIONS_PROMPT() },
				{
					role: "user",
					content: query,
				},
			],
			schema: z.object({
				questions: z
					.string()
					.array()
					.describe(
						`Follow up questions to clarify the research direction, max of 5`,
					),
			}),
		});

		questions = object.questions.slice(0, 5);
	} catch (e) {
		if (e instanceof LoadAPIKeyError) {
			return c.html(
				<Layout>
					<p>Provided GOOGLE_API_KEY is invalid!</p>
					<p>
						Please set GOOGLE_API_KEY in your environment variables, using
						command "npx wrangler secret put GOOGLE_API_KEY"
					</p>
					<p>
						Learn more here{" "}
						<a href="https://github.com/G4brym/workers-research">
							github.com/G4brym/workers-research
						</a>
						.
					</p>
				</Layout>,
			);
		}

		throw e;
	}

	return c.html(
		<Layout>
			<NewResearchQuestions questions={questions} />
		</Layout>,
	);
});

app.post("/create", async (c) => {
	const id = crypto.randomUUID();
	const form = await c.req.formData();

	const questions = form.getAll("question") as string[];
	const answers = form.getAll("answer") as string[];

	const processedQuestions = questions.map((question, i) => ({
		question,
		answer: answers[i],
	}));

	const obj: ResearchType = {
		id,
		query: form.get("query") as string,
		depth: form.get("depth") as string,
		breadth: form.get("breadth") as string,
		questions: processedQuestions,
		status: 1,
	};

	// const inst = new ResearchWorkflowTest(c.env, c.executionCtx)
	// await inst.run({
	// 	payload: obj,
	// }, {
	// 	do: async (name, func) => {
	// 		console.log(`Running ${name}`)
	// 		return await func()
	// 	}
	// });

	await c.env.RESEARCH_WORKFLOW.create({
		id,
		params: obj,
	});

	const qb = new D1QB(c.env.DB);
	await qb
		.insert({
			tableName: "researches",
			data: {
				...obj,
				questions: JSON.stringify(obj.questions),
			},
		})
		.execute();

	return c.redirect("/");
});

app.get("/details/:id", async (c) => {
	const id = c.req.param("id");

	const qb = new D1QB(c.env.DB);
	const resp = await qb
		.fetchOne<ResearchTypeDB>({
			tableName: "researches",
			where: {
				conditions: ["id = ?"],
				params: [id],
			},
		})
		.execute();

	if (!resp.results) {
		throw new HTTPException(404, { message: "research not found" });
	}

	const content = (resp.results.result ?? "Report is still running...")
		.replaceAll("```markdown", "")
		.replaceAll("```", "");

	const research = {
		...resp.results,
		questions: JSON.parse(resp.results.questions as unknown as string),
		report_html: await marked.parse(content),
	};

	return c.html(
		<Layout>
			<ResearchDetails research={research} />
		</Layout>,
	);
});

app.post("/re-run", async (c) => {
	const form = await c.req.formData();

	const qb = new D1QB(c.env.DB);
	const resp = await qb
		.fetchOne<ResearchTypeDB>({
			tableName: "researches",
			where: {
				conditions: ["id = ?"],
				params: [form.get("id") as string],
			},
		})
		.execute();

	if (!resp) {
		throw new HTTPException(404, { message: "research not found" });
	}

	const obj: ResearchType = {
		id: crypto.randomUUID(),
		query: resp.results.query,
		depth: resp.results.depth,
		breadth: resp.results.breadth,
		questions: JSON.parse(resp.results.questions as unknown as string),
		status: 1,
	};

	await c.env.RESEARCH_WORKFLOW.create({
		id: obj.id,
		params: obj,
	});

	await qb
		.insert({
			tableName: "researches",
			data: {
				...obj,
				questions: JSON.stringify(obj.questions),
			},
		})
		.execute();

	return c.redirect("/");
});

app.post("/delete", async (c) => {
	const form = await c.req.formData();

	const qb = new D1QB(c.env.DB);
	const resp = await qb
		.fetchOne<ResearchTypeDB>({
			tableName: "researches",
			where: {
				conditions: ["id = ?"],
				params: [form.get("id") as string],
			},
		})
		.execute();

	if (!resp) {
		throw new HTTPException(404, { message: "research not found" });
	}

	await qb
		.delete({
			tableName: "researches",
			where: {
				conditions: ["id = ?"],
				params: [form.get("id") as string],
			},
		})
		.execute();

	return c.redirect("/");
});

export default app;
