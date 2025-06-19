import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import { generateObject, generateText } from "ai";
import { D1QB } from "workers-qb";
import { z } from "zod";
import type { Env } from "./bindings";
import { RESEARCH_PROMPT } from "./prompts";
import type { ResearchType } from "./types";
import { getFallbackModel, getModel, getModelThinking } from "./utils";
import {
	type ResearchBrowser,
	type SearchResult,
	getBrowser,
	webSearch,
} from "./webSearch";

async function deepResearch({
	step,
	env,
	browser,
	query,
	breadth,
	depth,
	learnings: initialLearningsParam, // Renamed to avoid conflict
	visitedUrls,
	qb,
	researchId,
}: {
	step: WorkflowStep;
	env: Env;
	browser: ResearchBrowser;
	query: string;
	breadth: number;
	depth: number;
	learnings: string[]; // Keep this as string[]
	visitedUrls: string[];
	qb: D1QB;
	researchId: string;
}) {
	const serpQueries = await step.do("generate_serp_queries", () =>
		generateSerpQueries({
			env,
			query,
			learnings: initialLearningsParam,
			numQueries: breadth,
		}),
	);

	let allLearnings = [...initialLearningsParam]; // Use the passed learnings
	let allUrls = [...visitedUrls];

	for (const serpQuery of serpQueries) {
		await addResearchStatusHistoryEntry(
			qb,
			researchId,
			`Executing web search for query: ${serpQuery.query}`,
		);
		const result = await step.do("perform_web_search", async () => {
			try {
				return await webSearch(
					await browser.getActiveBrowser(),
					serpQuery.query,
					5,
					async (urlToLog: string) =>
						await addResearchStatusHistoryEntry(
							qb,
							researchId,
							`Crawling URL: ${urlToLog}`,
						),
				);
			} catch (e: any) {
				console.error(e);
				await addResearchStatusHistoryEntry(
					qb,
					researchId,
					`Error during web search for query ${serpQuery.query}: ${e.message}`,
				);
				return null;
			}
		});

		if (!result) {
			// web search provably failed, no learnings to get
			continue;
		}

		const newUrls = result.map((item) => item.url).filter(Boolean);
		const newBreadth = Math.ceil(breadth / 2);
		const newDepth = depth - 1;

		const { learnings: newLearnings, followUpQuestions } = await step.do(
			"extract_learnings_from_search",
			async () => {
				return await processSerpResult({
					env,
					query: serpQuery.query,
					result: result.map((item) => item.markdown),
					numFollowUpQuestions: newBreadth,
				});
			},
		);

		allLearnings = [...allLearnings, ...newLearnings];
		allUrls = [...allUrls, ...newUrls];

		if (newDepth > 0) {
			const nextQuery = `
          Previous research goal: ${serpQuery.researchGoal}
          Follow-up research directions: ${followUpQuestions.map((q) => `\n${q}`).join("")}
        `.trim();
			const recursiveResult = await deepResearch({
				step,
				env,
				browser,
				query: nextQuery,
				breadth: newBreadth,
				depth: newDepth,
				learnings: allLearnings,
				visitedUrls: allUrls,
				qb,
				researchId,
			});
			allLearnings = [...allLearnings, ...recursiveResult.learnings];
			allUrls = [...allUrls, ...recursiveResult.visitedUrls];
		}
	}

	return { learnings: allLearnings, visitedUrls: allUrls };
}

async function deepResearchAutoRAG({
	step,
	env,
	autorag,
	query,
	breadth,
	depth,
	learnings: initialLearningsParam, // Renamed to avoid conflict
	visitedUrls,
	qb,
	researchId,
}: {
	step: WorkflowStep;
	env: Env;
	autorag: AutoRAG;
	query: string;
	breadth: number;
	depth: number;
	learnings: string[]; // Keep this as string[]
	visitedUrls: string[];
	qb: D1QB;
	researchId: string;
}) {
	const serpQueries = await step.do("generate_serp_queries", () =>
		generateSerpQueries({
			env,
			query,
			learnings: initialLearningsParam,
			numQueries: breadth,
		}),
	);

	let allLearnings = [...initialLearningsParam]; // Use the passed learnings
	let allUrls = [...visitedUrls];

	for (const serpQuery of serpQueries) {
		await addResearchStatusHistoryEntry(
			qb,
			researchId,
			`Executing AutoRAG search for query: ${serpQuery.query}`,
		);
		const result = await step.do("perform_autorag_search", async () => {
			try {
				return await autorag.search({
					query: serpQuery.query,
					max_num_results: 5,
				});
			} catch (e: any) {
				console.error(e);
				await addResearchStatusHistoryEntry(
					qb,
					researchId,
					`Error during AutoRAG search for query ${serpQuery.query}: ${e.message}`,
				);
				return null;
			}
		});

		if (result.data.length === 0) {
			// web search provably failed, no learnings to get
			continue;
		}

		const newUrls = result.data
			.map((item) => `AutoRAG: ${item.filename}`)
			.filter(Boolean);
		const newBreadth = Math.ceil(breadth / 2);
		const newDepth = depth - 1;

		const { learnings: newLearnings, followUpQuestions } = await step.do(
			"extract_learnings_from_search",
			async () => {
				return await processSerpResult({
					env,
					query: serpQuery.query,
					result: result.data.map((item) =>
						item.content.map((c) => c.text).join("\n\n-----\n\n"),
					),
					numFollowUpQuestions: newBreadth,
				});
			},
		);

		allLearnings = [...allLearnings, ...newLearnings];
		allUrls = [...allUrls, ...newUrls];

		if (newDepth > 0) {
			const nextQuery = `
          Previous research goal: ${serpQuery.researchGoal}
          Follow-up research directions: ${followUpQuestions.map((q) => `\n${q}`).join("")}
        `.trim();
			const recursiveResult = await deepResearchAutoRAG({
				step,
				env,
				autorag,
				query: nextQuery,
				breadth: newBreadth,
				depth: newDepth,
				learnings: allLearnings,
				visitedUrls: allUrls,
				qb,
				researchId,
			});
			allLearnings = [...allLearnings, ...recursiveResult.learnings];
			allUrls = [...allUrls, ...recursiveResult.visitedUrls];
		}
	}

	return { learnings: allLearnings, visitedUrls: allUrls };
}

export async function processSerpResult({
	env,
	query,
	result,
	numLearnings = 5,
	numFollowUpQuestions = 5,
}: {
	env: Env;
	query: string;
	result: string[];
	numLearnings?: number;
	numFollowUpQuestions?: number;
}) {
	const contents = result.filter(Boolean);

	const model = getModel(env);
	const schema = z.object({
		learnings: z
			.array(z.string())
			.describe(`List of learnings (max ${numLearnings})`),
		followUpQuestions: z
			.array(z.string())
			.describe(`List of follow-up questions (max ${numFollowUpQuestions})`),
	});
	const system = RESEARCH_PROMPT();
	const prompt = `Given the SERP contents for query <query>${query}</query>, extract up to ${numLearnings} concise and unique learnings. Include entities such as people, places, companies, etc., and also provide up to ${numFollowUpQuestions} follow-up questions to extend the research.\n\n<contents>${contents
		.map((content) => `<content>\n${content}\n</content>`)
		.join("\n")}</contents>`;

	try {
		const res = await generateObject({
			model,
			abortSignal: AbortSignal.timeout(60000),
			system,
			prompt,
			schema,
		});
		return res.object;
	} catch (error: any) {
		if (
			error.message?.includes("exceeded your current quota") ||
			error.lastError?.includes("exceeded your current quota")
		) {
			console.warn(
				`Rate limit error in processSerpResult for query "${query}". Retrying with fallback model.`,
				error,
			);
			const fallbackModel = getFallbackModel(env);
			const res = await generateObject({
				model: fallbackModel,
				abortSignal: AbortSignal.timeout(60000),
				system,
				prompt,
				schema,
			});
			return res.object;
		}
		throw error;
	}
}

export async function generateSerpQueries({
	env,
	query,
	numQueries = 5,
	learnings,
}: {
	env: Env;
	query: string;
	numQueries?: number;
	learnings?: string[];
}) {
	const model = getModel(env);
	const system = RESEARCH_PROMPT();
	const prompt = `Generate up to ${numQueries} unique SERP queries for the following prompt: <prompt>${query}</prompt>${
		learnings
			? `\nIncorporate these previous learnings:\n${learnings.join("\n")}`
			: ""
	}`;
	const schema = z.object({
		queries: z
			.array(
				z.object({
					query: z.string().describe("The SERP query"),
					researchGoal: z
						.string()
						.describe("The research goal and directions for this query"),
				}),
			)
			.describe(`List of SERP queries (max ${numQueries})`),
	});

	try {
		const res = await generateObject({
			model,
			system,
			prompt,
			schema,
		});
		return res.object.queries.slice(0, numQueries);
	} catch (error: any) {
		if (
			error.message?.includes("exceeded your current quota") ||
			error.lastError?.includes("exceeded your current quota")
		) {
			console.warn(
				`Rate limit error in generateSerpQueries for query "${query}". Retrying with fallback model.`,
				error,
			);
			const fallbackModel = getFallbackModel(env);
			const res = await generateObject({
				model: fallbackModel,
				system,
				prompt,
				schema,
			});
			return res.object.queries.slice(0, numQueries);
		}
		throw error;
	}
}

export async function writeFinalReport({
	env,
	prompt,
	learnings,
	visitedUrls,
}: {
	env: Env;
	prompt: string;
	learnings: string[];
	visitedUrls: string[];
}) {
	const learningsString = learnings
		.map((l) => `<learning>\n${l}\n</learning>`)
		.join("\n");

	const model = getModelThinking(env);
	const system = RESEARCH_PROMPT();
	const generationPrompt = `Using the prompt <prompt>${prompt}</prompt>, write a detailed final report (3+ pages) that includes all the following learnings:\n\n<learnings>\n${learningsString}\n</learnings>`;

	let text: string;
	try {
		const res = await generateText({
			model,
			system,
			prompt: generationPrompt,
		});
		text = res.text;
	} catch (error: any) {
		if (
			error.message?.includes("exceeded your current quota") ||
			error.lastError?.includes("exceeded your current quota")
		) {
			console.warn(
				`Rate limit error in writeFinalReport for prompt "${prompt}". Retrying with fallback model.`,
				error,
			);
			const fallbackModel = getFallbackModel(env);
			const res = await generateText({
				model: fallbackModel,
				system,
				prompt: generationPrompt,
			});
			text = res.text;
		} else {
			throw error;
		}
	}

	const parsedSources = [];
	for (const url of visitedUrls) {
		if (!parsedSources.includes(url)) {
			parsedSources.push(url);
		}
	}

	const urlsSection = `\n\n\n\n## Sources\n\n${parsedSources.map((url) => `- ${url}`).join("\n")}`;
	return text + urlsSection;
}

async function addResearchStatusHistoryEntry(
	db: D1QB,
	researchId: string,
	statusText: string,
) {
	try {
		await db
			.insert({
				tableName: "research_status_history",
				data: {
					id: crypto.randomUUID(),
					research_id: researchId,
					status_text: statusText,
					// timestamp is default CURRENT_TIMESTAMP
				},
			})
			.execute();
	} catch (e) {
		console.error("Failed to insert research status history entry:", e);
	}
}

export class ResearchWorkflow extends WorkflowEntrypoint<Env, ResearchType> {
	async run(event: WorkflowEvent<ResearchType>, step: WorkflowStep) {
		const qb = new D1QB(this.env.DB);
		qb.setDebugger(true);
		const { query, questions, breadth, depth, id, initialLearnings } =
			event.payload;

		try {
			await addResearchStatusHistoryEntry(qb, id, "Workflow run initiated.");
			console.log("Starting workflow");

			const fullQuery = `Initial Query: ${query}\nFollowup Q&A:\n${questions
				.map((q) => `Q: ${q.question}\nA: ${q.answer}`)
				.join("\n")}`;

			const processedLearnings =
				initialLearnings && initialLearnings.trim().length > 0
					? initialLearnings.split("\n")
					: [];

			const browser = await getBrowser(this.env);

			let learnings = [];
			let visitedUrls = [];

			if (event.payload.browse_internet) {
				console.log("Starting research on the internet...");
				const researchResult = await deepResearch({
					step,
					env: this.env,
					browser,
					query: fullQuery,
					breadth: Number.parseInt(breadth),
					depth: Number.parseInt(depth),
					learnings: processedLearnings,
					visitedUrls: [],
					qb,
					researchId: id,
				});

				learnings = [...learnings, ...researchResult.learnings];
				visitedUrls = [...visitedUrls, ...researchResult.visitedUrls];
			}

			if (event.payload.autorag_id) {
				console.log(
					`Starting research on the AutoRAG (${event.payload.autorag_id})...`,
				);
				const researchResult = await deepResearchAutoRAG({
					step,
					env: this.env,
					autorag: this.env.AI.autorag(event.payload.autorag_id),
					query: fullQuery,
					breadth: Number.parseInt(breadth),
					depth: Number.parseInt(depth),
					learnings: processedLearnings,
					visitedUrls: [],
					qb,
					researchId: id,
				});

				learnings = [...learnings, ...researchResult.learnings];
				visitedUrls = [...visitedUrls, ...researchResult.visitedUrls];
			}

			console.log("Generating report");
			const report = await step.do("generate_final_report", () =>
				writeFinalReport({
					env: this.env,
					prompt: fullQuery,
					learnings: learnings,
					visitedUrls: visitedUrls,
				}),
			);
			await addResearchStatusHistoryEntry(
				qb,
				id,
				"Finalizing report and completing workflow.",
			);

			await qb
				.update({
					tableName: "researches",
					data: {
						status: 2,
						result: report,
						duration: Date.now() - event.payload.start_ms,
					},
					where: { conditions: "id = ?", params: [id] },
				})
				.execute();

			console.log("Workflow finished!");
			return {
				learnings: learnings,
				visitedUrls: visitedUrls,
				report,
			};
		} catch (error: any) {
			await addResearchStatusHistoryEntry(
				qb,
				id,
				`Workflow failed: ${error.message}`,
			);
			await qb
				.update({
					tableName: "researches",
					data: {
						status: 3,
						duration: Date.now() - event.payload.start_ms,
						result: `Error: ${error.message}\n\n${error.stack ?? ""}`,
					},
					where: { conditions: "id = ?", params: [id] },
				})
				.execute();

			throw error;
		}
	}
}
