import { generateObject } from "ai";
import { Hono } from "hono";
import { html } from "hono/html";
import { HTTPException } from "hono/http-exception";
import { marked } from "marked";
import { D1QB } from "workers-qb";
import { z } from "zod";
import type { Env } from "./bindings";
import {
	CreateResearch,
	Layout,
	NewResearchQuestions,
	ResearchDetails,
	ResearchList,
} from "./layout/templates";
import { FOLLOWUP_QUESTIONS_PROMPT } from "./prompts";
import type { ResearchType, ResearchTypeDB } from "./types";
import { getModel } from "./utils";

export { ResearchWorkflow } from "./workflows";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const qb = new D1QB(c.env.DB);
	const researches = await qb
		.select<ResearchTypeDB>("researches")
		.orderBy("created_at desc")
		.all();

	return c.html(
		<Layout>
			<ResearchList researches={researches} />
		</Layout>,
	);
});

app.get("/create", async (c) => {
	return c.html(
		<Layout>
			<CreateResearch />
		</Layout>,
	);
});

app.post("/create", async (c) => {
	const form = await c.req.formData();

	const research = {
		query: form.get("query") as string,
		depth: form.get("depth") as string,
		breadth: form.get("breadth") as string,
	};

	const { object } = await generateObject({
		model: getModel(c.env),
		messages: [
			{ role: "system", content: FOLLOWUP_QUESTIONS_PROMPT() },
			{
				role: "user",
				content: research.query,
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

	const questions = object.questions.slice(0, 5);

	return c.html(
		<Layout>
			<NewResearchQuestions research={research} questions={questions} />
		</Layout>,
	);
});

app.post("/create/finish", async (c) => {
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
				conditions: "id = ?",
				params: id,
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
				conditions: "id = ?",
				params: form.get("id") as string,
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
				conditions: "id = ?",
				params: form.get("id") as string,
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
				conditions: "id = ?",
				params: form.get("id") as string,
			},
		})
		.execute();

	return c.redirect("/");
});

export default app;
