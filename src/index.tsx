import { LoadAPIKeyError, generateObject, generateText } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { D1QB } from "workers-qb";
import { z } from "zod";
import type { Env, Variables } from "./bindings";
import { renderMarkdownReportContent } from "./markdown";
import { migrations } from "./migrations";
import { FOLLOWUP_QUESTIONS_PROMPT, SUMMARIZE_PROMPT } from "./prompts";
import {
	CreateResearch,
	ErrorPage,
	Layout,
	NewResearchQuestions,
	ResearchDetails,
	ResearchList,
	ResearchStatusHistoryDisplay,
	TopBar,
} from "./templates/layout";
import type { ResearchType, ResearchTypeDB } from "./types";
import { formatDuration, getModel } from "./utils";
import puppeteer from "@cloudflare/puppeteer";

export { ResearchWorkflow } from "./workflows";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

let MigrationsApplied = false;
app.use(async (c, next) => {
	if (!MigrationsApplied) {
		const qb = new D1QB(c.env.DB);
		await qb.migrations({ migrations, tableName: "d1_migrations" }).apply();
		MigrationsApplied = true;
	}

	await next();
});

app.onError((err, c) => {
	console.error(`${err}`);
	let statusCode = 500;
	if (err instanceof HTTPException) {
		statusCode = err.status;
	}
	return c.html(
		<ErrorPage>
			<h2>{err.name}</h2>
			<p>{err.message}</p>
		</ErrorPage>,
		// @ts-ignore
		statusCode,
	);
});

app.get("/", async (c) => {
	const qb = new D1QB(c.env.DB);
	const { page = "1", partial } = c.req.query();
	const pageSize = 5; // Items per page
	const offset = (Number.parseInt(page) - 1) * pageSize;

	// Build the query with filters
	const queryBuilder = qb
		.select<ResearchTypeDB>("researches")
		.orderBy("created_at desc nulls last");

	// Fetch paginated results
	const researches = await queryBuilder.limit(pageSize).offset(offset).all();

	// Fetch total count for pagination
	const totalCount = (await qb.select<ResearchTypeDB>("researches").count())
		.results.total;

	const totalCompleted = (
		await qb.select("researches").where("status = 2").count()
	).results.total;
	const totalProcessing = (
		await qb.select("researches").where("status = 1").count()
	).results.total;
	const avgDuration = (
		await qb
			.select<{ avg: number }>("researches")
			.fields("avg(duration) as avg")
			.where("duration is not null")
			.one()
	).results.avg;

	const researchListProps = {
		researches: {
			results: researches.results,
			totalCount: totalCount,
		},
		page: Number.parseInt(page),
		totalCompleted: totalCompleted,
		totalProcessing: totalProcessing,
		avgDuration: avgDuration ? formatDuration(avgDuration) : "--",
	};

	if (partial === "true") {
		return c.html(<ResearchList {...researchListProps} />);
	}

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
			<ResearchList {...researchListProps} />
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
				<ErrorPage>
					<p>Provided GOOGLE_API_KEY is invalid!</p>
					<p>
						Please set GOOGLE_API_KEY in your environment variables, using
						command "npx wrangler secret put GOOGLE_API_KEY"
					</p>
				</ErrorPage>,
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

	const { text: title } = await generateText({
		model: getModel(c.env),
		system: SUMMARIZE_PROMPT(),
		prompt: form.get("query") as string,
	});

	const initialLearnings = form.get("initial-learnings") as string | undefined;

	const researchData: ResearchType = {
		id,
		title,
		query: form.get("query") as string,
		depth: form.get("depth") as string,
		breadth: form.get("breadth") as string,
		questions: processedQuestions,
		status: 1, // Starting status
		initialLearnings: initialLearnings || "", // Ensure it's a string
	};

	await c.env.RESEARCH_WORKFLOW.create({
		id,
		params: {
			...researchData,
			start_ms: Date.now(),
		},
	});

	const dbData = {
		...researchData,
		questions: JSON.stringify(researchData.questions),
	};

	const qb = new D1QB(c.env.DB);
	await qb
		.insert({
			tableName: "researches",
			data: dbData,
		})
		.execute();

	return c.redirect(`/details/${id}`);
});

app.get("/details/:id", async (c) => {
	const id = c.req.param("id");
	const { partial } = c.req.query();

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

	let statusHistory: any[] = [];
	if (resp.results && resp.results.status === 1) {
		const historyQb = new D1QB(c.env.DB);
		const historyResult = await historyQb
			.select<{ status_text: string; timestamp: string }>(
				"research_status_history",
			)
			.where("research_id = ?", id)
			.orderBy("timestamp desc")
			.limit(5)
			.all();
		statusHistory = historyResult.results || [];
	}

	const researchProps = {
		...resp.results,
		questions: JSON.parse(resp.results.questions as unknown as string),
		report_html: renderMarkdownReportContent(content),
		statusHistory: statusHistory,
		isPartial: partial === "true",
	};

	if (partial === "true") {
		return c.html(<ResearchDetails research={researchProps} />);
	}

	return c.html(
		<Layout>
			<TopBar>
				<div className="flex gap-2">
					<a
						href="/"
						className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
					>
						← Back
					</a>
					<button
						// @ts-ignore
						onClick={`rerun("${id}")`}
						className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
					>
						Re-run
					</button>
					<button
						// @ts-ignore
						onClick={`deleteItem("${id}")`}
						className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
					>
						Delete
					</button>
					<div className="relative inline-block text-left">
						<div>
							<button type="button" className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" id="options-menu" aria-haspopup="true" aria-expanded="true" onClick="this.nextElementSibling.classList.toggle('hidden')">
								Download Report
								<svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
								</svg>
							</button>
						</div>
						<div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden z-10" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
							<div className="py-1" role="none">
								<a href={`/details/${id}/download/pdf`} download="report.pdf" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">Download as PDF</a>
								<a href={`/details/${id}/download/markdown`} download="report.md" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">Download as Markdown</a>
							</div>
						</div>
					</div>
				</div>
			</TopBar>
			<ResearchDetails research={researchProps} />
		</Layout>,
	);
});

app.get("/details/:id/download/pdf", async (c) => {
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
		throw new HTTPException(404, { message: "Research not found" });
	}

	const content = resp.results.result ?? "";
	const htmlContent = renderMarkdownReportContent(content);

    const browser = await puppeteer.launch(c.env.BROWSER);
    const page = await browser.newPage();

    // // Step 2: Send HTML and CSS to our browser
    await page.setContent(htmlContent);

    // // Step 3: Generate and return PDF
    const pdf = await page.pdf({ printBackground: true });

    // Close browser since we no longer need it
    await browser.close();

	c.header("Content-Type", "application/pdf");
	c.header("Content-Disposition", 'attachment; filename="report.pdf"');
	return c.body(pdf);
});

app.get("/details/:id/download/markdown", async (c) => {
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
		throw new HTTPException(404, { message: "Research not found" });
	}

	const content = resp.results.result ?? "";

	const headers = new Headers();
	headers.set("Content-Type", "text/markdown; charset=utf-8");
	headers.set("Content-Disposition", 'attachment; filename="report.md"');

	return new Response(content, { headers });
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

	const originalResearch = resp.results;

	const newResearchData: ResearchType = {
		id: crypto.randomUUID(),
		title: originalResearch.title, // Carry over title
		query: originalResearch.query,
		depth: originalResearch.depth,
		breadth: originalResearch.breadth,
		questions: JSON.parse(originalResearch.questions as unknown as string),
		status: 1, // Starting status
		initialLearnings: originalResearch.initialLearnings || "", // Carry over initial learnings
	};

	await c.env.RESEARCH_WORKFLOW.create({
		id: newResearchData.id,
		params: {
			...newResearchData,
			start_ms: Date.now(), // Add start_ms for the new workflow
		},
	});

	const dbData = {
		...newResearchData,
		questions: JSON.stringify(newResearchData.questions),
	};

	await qb
		.insert({
			tableName: "researches",
			data: dbData,
		})
		.execute();

	return c.redirect(`/details/${newResearchData.id}`);
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
