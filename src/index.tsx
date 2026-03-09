import puppeteer from "@cloudflare/puppeteer";
import { generateObject, generateText, LoadAPIKeyError } from "ai";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { D1QB } from "workers-qb";
import { z } from "zod";
import type { Env, Variables } from "./bindings";
import {
	generateCsrfToken,
	getCsrfCookieName,
	getCsrfFormField,
	validateEnvSecrets,
} from "./config";
import { renderMarkdownReportContent, renderPdfDocument } from "./markdown";
import { migrations } from "./migrations";
import { FOLLOWUP_QUESTIONS_PROMPT, SUMMARIZE_PROMPT } from "./prompts";
import { getReportWithR2Resolution } from "./storage";
import {
	CloneResearch,
	CreateResearch,
	ErrorPage,
	Layout,
	NewResearchQuestions,
	ResearchDetails,
	ResearchList,
	TopBar,
} from "./templates/layout";
import type { ResearchType, ResearchTypeDB } from "./types";
import { formatDuration, getModel, normalizeDomain } from "./utils";

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

// Secret validation middleware - check required API keys
app.use(async (c, next) => {
	const { valid, missing } = validateEnvSecrets(c.env);
	if (!valid) {
		// Only block API-dependent routes, allow static/health routes
		const path = c.req.path;
		if (
			path.includes("/create") ||
			path.includes("/re-run") ||
			path.includes("/details")
		) {
			return c.html(
				<ErrorPage>
					<h2>Configuration Error</h2>
					<p>Missing required environment secrets: {missing.join(", ")}</p>
					<p>
						Please set these using: npx wrangler secret put{" "}
						{missing.join(" && npx wrangler secret put ")}
					</p>
				</ErrorPage>,
				500,
			);
		}
	}
	await next();
});

// CSRF protection middleware for state-changing requests
app.use(async (c, next) => {
	const method = c.req.method;

	// Generate CSRF token for all requests (needed for forms)
	let csrfToken = getCookie(c, getCsrfCookieName());
	if (!csrfToken) {
		csrfToken = await generateCsrfToken();
		setCookie(c, getCsrfCookieName(), csrfToken, {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			path: "/",
			maxAge: 60 * 60 * 24, // 24 hours
		});
	}
	c.set("csrfToken", csrfToken);

	// Validate CSRF token for POST/PUT/DELETE requests
	if (["POST", "PUT", "DELETE"].includes(method)) {
		const cookieToken = getCookie(c, getCsrfCookieName());
		let formToken: string | null = null;

		try {
			const contentType = c.req.header("content-type") || "";
			if (
				contentType.includes("application/x-www-form-urlencoded") ||
				contentType.includes("multipart/form-data")
			) {
				const formData = await c.req.raw.clone().formData();
				formToken = formData.get(getCsrfFormField()) as string | null;
			}
		} catch {
			// Form parsing failed, formToken stays null
		}

		// Check header as fallback for AJAX requests
		const headerToken = c.req.header("x-csrf-token");
		const providedToken = formToken || headerToken;

		if (!cookieToken || !providedToken || cookieToken !== providedToken) {
			throw new HTTPException(403, { message: "Invalid CSRF token" });
		}
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
		// @ts-expect-error
		statusCode,
	);
});

app.get("/", async (c) => {
	const qb = new D1QB(c.env.DB);
	const { page = "1", partial, q, status, sort } = c.req.query();
	const pageSize = 5; // Items per page
	const offset = (Number.parseInt(page, 10) - 1) * pageSize;

	// Build where conditions
	const conditions: string[] = [];
	if (q?.trim()) {
		// Search in title and query fields (escape single quotes to prevent SQL injection)
		const searchTerm = q.trim().replace(/'/g, "''");
		conditions.push(
			`(title LIKE '%${searchTerm}%' OR query LIKE '%${searchTerm}%')`,
		);
	}
	if (status && ["1", "2", "3"].includes(status)) {
		conditions.push(`status = ${status}`);
	}

	// Build sort order
	let orderBy = "created_at desc nulls last";
	if (sort) {
		switch (sort) {
			case "created_at_asc":
				orderBy = "created_at asc nulls last";
				break;
			case "title_asc":
				orderBy = "title asc nulls last";
				break;
			case "title_desc":
				orderBy = "title desc nulls last";
				break;
			default:
				orderBy = "created_at desc nulls last";
				break;
		}
	}

	// Build the query with filters
	let queryBuilder = qb.select<ResearchTypeDB>("researches").orderBy(orderBy);

	if (conditions.length > 0) {
		queryBuilder = queryBuilder.where(conditions.join(" AND "));
	}

	// Fetch paginated results
	const researches = await queryBuilder.limit(pageSize).offset(offset).all();

	// Fetch total count for pagination (with filters)
	let countQuery = qb.select<ResearchTypeDB>("researches");
	if (conditions.length > 0) {
		countQuery = countQuery.where(conditions.join(" AND "));
	}
	const totalCount = (await countQuery.count()).results.total;

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
		page: Number.parseInt(page, 10),
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
	// @ts-expect-error - Cloudflare AI types may be outdated
	const userRags = await c.env.AI.autorag().list();
	const csrfToken = c.get("csrfToken");

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
			<CreateResearch userRags={userRags} csrfToken={csrfToken} />
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

	const csrfToken = c.get("csrfToken");
	return c.html(
		<Layout>
			<NewResearchQuestions questions={questions} csrfToken={csrfToken} />
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
	const browseInternetFormValue = form.get("browse_internet");
	const browse_internet = !!(
		browseInternetFormValue === "on" ||
		browseInternetFormValue === "" ||
		browseInternetFormValue === null
	); // default to true if present (even as empty string from checked) or not present at all.
	const autorag_id_form = form.get("autorag_id") as string | null;
	const autorag_id = autorag_id_form === "" ? null : autorag_id_form;

	// Parse source URLs (one per line)
	const sourceUrlsRaw = (form.get("source_urls") as string) || "";
	const source_urls = sourceUrlsRaw
		.split("\n")
		.map((url) => url.trim())
		.filter((url) => url.length > 0 && url.startsWith("http"));

	// Parse excluded domains (one per line), normalizing URLs and www prefixes
	const excludedDomainsRaw = (form.get("excluded_domains") as string) || "";
	const excluded_domains = excludedDomainsRaw
		.split("\n")
		.map((domain) => normalizeDomain(domain))
		.filter((domain) => domain.length > 0);

	const researchData: ResearchType = {
		id,
		title,
		query: form.get("query") as string,
		depth: form.get("depth") as string,
		breadth: form.get("breadth") as string,
		questions: processedQuestions,
		status: 1, // Starting status
		initialLearnings: initialLearnings || "", // Ensure it's a string
		browse_internet,
		autorag_id,
		source_urls: source_urls.length > 0 ? source_urls : undefined,
		excluded_domains:
			excluded_domains.length > 0 ? excluded_domains : undefined,
	};

	const dbData: ResearchTypeDB = {
		...researchData,
		questions: JSON.stringify(researchData.questions),
		browse_internet: browse_internet ? 1 : 0,
		autorag_id: autorag_id,
		source_urls:
			source_urls.length > 0 ? JSON.stringify(source_urls) : undefined,
		excluded_domains:
			excluded_domains.length > 0
				? JSON.stringify(excluded_domains)
				: undefined,
	};

	const qb = new D1QB(c.env.DB);
	await qb
		.insert({
			tableName: "researches",
			data: dbData,
		})
		.execute();

	await c.env.RESEARCH_WORKFLOW.create({
		id,
		params: {
			...researchData,
			start_ms: Date.now(),
		},
	});

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

	// Resolve R2 reference if the report was stored in R2
	const reportContent = await getReportWithR2Resolution(
		c.env.REPORTS_BUCKET,
		id,
		resp.results.result,
	);

	const content = (reportContent ?? "Report is still running...")
		.replaceAll("```markdown", "")
		.replaceAll("```", "");

	let statusHistory: any[] = [];
	if (
		resp.results &&
		(resp.results.status === 1 ||
			resp.results.status === 2 ||
			resp.results.status === 3)
	) {
		const historyQb = new D1QB(c.env.DB);
		const queryBuilder = historyQb
			.select<{ status_text: string; timestamp: string }>(
				"research_status_history",
			)
			.where("research_id = ?", id)
			.orderBy("timestamp desc");

		// Conditionally apply limit only for status 1 (in progress)
		if (resp.results.status === 1) {
			queryBuilder.limit(5);
		}

		const historyResult = await queryBuilder.all();
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
						className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
					>
						← Back
					</a>
					<a
						href={`/clone/${id}`}
						className="px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50"
					>
						Clone
					</a>
					<button
						onClick={`rerun("${id}")`}
						className="px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50"
					>
						Re-run
					</button>
					<button
						onClick={`deleteItem("${id}")`}
						className="px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50"
					>
						Delete
					</button>
					<div className="relative inline-block text-left">
						<div>
							<button
								type="button"
								className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
								id="options-menu"
								aria-haspopup="true"
								aria-expanded="true"
								onClick={`toggleDropdown('${id}')`}
							>
								Download Report
								<svg
									className="-mr-1 ml-2 h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						</div>
						<div
							id={`download-dropdown-${id}`}
							className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 hidden z-10"
							role="menu"
							aria-orientation="vertical"
							aria-labelledby="options-menu"
						>
							<div className="py-1">
								<a
									href={`/details/${id}/download/pdf`}
									download="report.pdf"
									className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
									role="menuitem"
								>
									Download as PDF
								</a>
								<a
									href={`/details/${id}/download/markdown`}
									download="report.md"
									className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
									role="menuitem"
								>
									Download as Markdown
								</a>
								<a
									href={`/details/${id}/download/json`}
									download="report.json"
									className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
									role="menuitem"
								>
									Download as JSON
								</a>
							</div>
						</div>
					</div>
				</div>
			</TopBar>
			<ResearchDetails research={researchProps} />
		</Layout>,
	);
});

// Clone research route - redirects to create page with pre-filled parameters
app.get("/clone/:id", async (c) => {
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

	// @ts-expect-error - Cloudflare AI types may be outdated
	const userRags = await c.env.AI.autorag().list();
	const csrfToken = c.get("csrfToken");

	// Pre-fill the create form with the cloned research data
	return c.html(
		<Layout>
			<TopBar>
				<a
					href="/"
					className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
				>
					← Back to Reports
				</a>
			</TopBar>
			<CloneResearch
				research={resp.results}
				userRags={userRags}
				csrfToken={csrfToken}
			/>
			<script>loadNewResearch()</script>
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

	// Resolve R2 reference if needed
	const reportContent = await getReportWithR2Resolution(
		c.env.REPORTS_BUCKET,
		id,
		resp.results.result,
	);
	const content = reportContent ?? "";

	// Generate beautifully styled PDF document
	const htmlContent = renderPdfDocument(content, {
		title: resp.results.title || "Research Report",
		date: resp.results.created_at,
		query: resp.results.query,
	});

	const browser = await puppeteer.launch(c.env.BROWSER);
	const page = await browser.newPage();

	// Set content with proper wait for load
	await page.setContent(htmlContent, { waitUntil: "networkidle0" });

	// Generate high-quality PDF with improved options
	const pdf = await page.pdf({
		format: "A4",
		printBackground: true,
		margin: {
			top: "20mm",
			right: "20mm",
			bottom: "20mm",
			left: "20mm",
		},
		preferCSSPageSize: true,
	});

	// Close browser since we no longer need it
	await browser.close();

	c.header("Content-Type", "application/pdf");
	c.header("Content-Disposition", 'attachment; filename="report.pdf"');
	return c.body(new Uint8Array(pdf));
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

	// Resolve R2 reference if needed
	const content =
		(await getReportWithR2Resolution(
			c.env.REPORTS_BUCKET,
			id,
			resp.results.result,
		)) ?? "";

	const headers = new Headers();
	headers.set("Content-Type", "text/markdown; charset=utf-8");
	headers.set("Content-Disposition", 'attachment; filename="report.md"');

	return new Response(content, { headers });
});

// JSON export route
app.get("/details/:id/download/json", async (c) => {
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

	const research = resp.results;

	// Resolve R2 reference if needed
	const reportContent = await getReportWithR2Resolution(
		c.env.REPORTS_BUCKET,
		id,
		research.result,
	);

	// Structure the JSON export
	const exportData = {
		id: research.id,
		title: research.title,
		query: research.query,
		depth: research.depth,
		breadth: research.breadth,
		status: research.status,
		created_at: research.created_at,
		duration: research.duration,
		questions: JSON.parse(research.questions as unknown as string),
		initialLearnings: research.initialLearnings,
		report: reportContent,
		metadata: {
			browse_internet: research.browse_internet === 1,
			autorag_id: research.autorag_id || null,
			exported_at: new Date().toISOString(),
		},
	};

	const headers = new Headers();
	headers.set("Content-Type", "application/json; charset=utf-8");
	headers.set("Content-Disposition", 'attachment; filename="report.json"');

	return new Response(JSON.stringify(exportData, null, 2), { headers });
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

	if (!resp.results) {
		throw new HTTPException(404, { message: "research not found" });
	}

	const originalResearch = resp.results;

	// Parse source_urls and excluded_domains from original if they exist
	const sourceUrls = originalResearch.source_urls
		? JSON.parse(originalResearch.source_urls)
		: undefined;
	const excludedDomains = originalResearch.excluded_domains
		? JSON.parse(originalResearch.excluded_domains)
		: undefined;

	const newResearchData: ResearchType = {
		id: crypto.randomUUID(),
		title: originalResearch.title, // Carry over title
		query: originalResearch.query,
		depth: originalResearch.depth,
		breadth: originalResearch.breadth,
		questions: JSON.parse(originalResearch.questions as unknown as string),
		status: 1, // Starting status
		initialLearnings: originalResearch.initialLearnings || "", // Carry over initial learnings
		browse_internet: originalResearch.browse_internet === 1,
		autorag_id: originalResearch.autorag_id,
		source_urls: sourceUrls,
		excluded_domains: excludedDomains,
	};

	await c.env.RESEARCH_WORKFLOW.create({
		id: newResearchData.id,
		params: {
			...newResearchData,
			start_ms: Date.now(), // Add start_ms for the new workflow
		},
	});

	const dbData: ResearchTypeDB = {
		id: newResearchData.id,
		title: newResearchData.title,
		query: newResearchData.query,
		depth: newResearchData.depth,
		breadth: newResearchData.breadth,
		questions: JSON.stringify(newResearchData.questions),
		status: newResearchData.status,
		initialLearnings: newResearchData.initialLearnings,
		browse_internet: newResearchData.browse_internet ? 1 : 0,
		autorag_id: newResearchData.autorag_id,
		source_urls: sourceUrls ? JSON.stringify(sourceUrls) : undefined,
		excluded_domains: excludedDomains
			? JSON.stringify(excludedDomains)
			: undefined,
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

	if (!resp.results) {
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
