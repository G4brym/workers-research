import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from "cloudflare:workers";
import { generateObject, generateText } from "ai";
import { D1QB } from "workers-qb";
import { z } from "zod";
import type { Env } from "./bindings";
import { config } from "./config";
import {
	logger,
	logLearningsExtracted,
	logRateLimitRetry,
	logReportGeneration,
	logResearchComplete,
	logResearchError,
	logResearchStart,
	logSearchComplete,
	logSearchError,
	logSearchStart,
} from "./logger";
import {
	FINAL_REPORT_PROMPT,
	LEARNING_EXTRACTION_PROMPT,
	RESEARCH_PROMPT,
} from "./prompts";
import { storeReportWithR2Fallback } from "./storage";
import type { ResearchType } from "./types";
import { getFallbackModel, getModel, getModelThinking } from "./utils";
import { getBrowser, type ResearchBrowser, webSearch } from "./webSearch";

// ============================================
// Types for unified research
// ============================================

interface SearchStrategy {
	name: "web" | "autorag";
	search: (query: string) => Promise<SearchStrategyResult | null>;
	formatUrls: (result: SearchStrategyResult) => string[];
	formatContent: (result: SearchStrategyResult) => string[];
}

interface SearchStrategyResult {
	data: unknown[];
}

interface DeepResearchParams {
	step: WorkflowStep;
	env: Env;
	strategy: SearchStrategy;
	query: string;
	breadth: number;
	depth: number;
	learnings: string[];
	visitedUrls: string[];
	qb: D1QB;
	researchId: string;
}

interface DeepResearchResult {
	learnings: string[];
	visitedUrls: string[];
}

// ============================================
// Unified Deep Research Function
// ============================================

async function deepResearch(
	params: DeepResearchParams,
): Promise<DeepResearchResult> {
	const {
		step,
		env,
		strategy,
		query,
		breadth,
		depth,
		learnings: initialLearnings,
		visitedUrls,
		qb,
		researchId,
	} = params;

	const timer = logger.startTimer();

	const serpQueries = await step.do(
		`generate_serp_queries_${strategy.name}`,
		() =>
			generateSerpQueries({
				env,
				query,
				learnings: initialLearnings,
				numQueries: breadth,
			}),
	);

	let allLearnings = [...initialLearnings];
	let allUrls = [...visitedUrls];

	for (const serpQuery of serpQueries) {
		await addResearchStatusHistoryEntry(
			qb,
			researchId,
			`Executing ${strategy.name} search for query: ${serpQuery.query}`,
		);

		logSearchStart(researchId, serpQuery.query, strategy.name);
		const searchTimer = logger.startTimer();

		const result = await step.do(
			`perform_${strategy.name}_search`,
			async () => {
				try {
					return await strategy.search(serpQuery.query);
				} catch (e) {
					const error = e instanceof Error ? e : new Error(String(e));
					logSearchError(researchId, strategy.name, serpQuery.query, error);
					await addResearchStatusHistoryEntry(
						qb,
						researchId,
						`Error during ${strategy.name} search for query ${serpQuery.query}: ${error.message}`,
					);
					return null;
				}
			},
		);

		if (!result || result.data.length === 0) {
			continue;
		}

		const newUrls = strategy.formatUrls(result);
		logSearchComplete(researchId, strategy.name, newUrls.length, searchTimer());

		const newBreadth = Math.ceil(breadth / 2);
		const newDepth = depth - 1;

		const { learnings: newLearnings, followUpQuestions } = await step.do(
			`extract_learnings_${strategy.name}`,
			async () => {
				return await processSerpResult({
					env,
					query: serpQuery.query,
					result: strategy.formatContent(result),
					numFollowUpQuestions: newBreadth,
					sourceUrls: newUrls,
				});
			},
		);

		logLearningsExtracted(researchId, newLearnings.length);
		allLearnings = [...allLearnings, ...newLearnings];
		allUrls = [...allUrls, ...newUrls];

		if (newDepth > 0) {
			const nextQuery = `
				Previous research goal: ${serpQuery.researchGoal}
				Follow-up research directions: ${followUpQuestions.map((q) => `\n${q}`).join("")}
			`.trim();

			const recursiveResult = await deepResearch({
				...params,
				query: nextQuery,
				breadth: newBreadth,
				depth: newDepth,
				learnings: allLearnings,
				visitedUrls: allUrls,
			});

			// Replace rather than concatenate: the recursive call already
			// starts with allLearnings/allUrls as its base, so its result
			// is a superset. Concatenating would duplicate everything.
			allLearnings = recursiveResult.learnings;
			allUrls = recursiveResult.visitedUrls;
		}
	}

	logger.debug(`Deep research iteration completed`, {
		researchId,
		durationMs: timer(),
		learningsCount: allLearnings.length,
	});

	return { learnings: allLearnings, visitedUrls: allUrls };
}

// ============================================
// Search Strategy Factories
// ============================================

function createWebSearchStrategy(
	browser: ResearchBrowser,
	qb: D1QB,
	researchId: string,
	cache?: KVNamespace,
	excludedDomains?: string[],
): SearchStrategy {
	return {
		name: "web",
		search: async (query: string) => {
			const results = await webSearch(
				await browser.getActiveBrowser(),
				query,
				config.webSearch.resultsLimit,
				{
					logCrawlUrl: async (url: string) => {
						await addResearchStatusHistoryEntry(
							qb,
							researchId,
							`Crawling URL: ${url}`,
						);
					},
					cache,
				},
			);

			// Filter out excluded domains
			if (excludedDomains && excludedDomains.length > 0) {
				const filtered = results.filter((result) => {
					try {
						const domain = new URL(result.url).hostname.toLowerCase();
						return !excludedDomains.some(
							(excluded) =>
								domain === excluded || domain.endsWith(`.${excluded}`),
						);
					} catch {
						return true; // Keep if URL is malformed
					}
				});
				return { data: filtered };
			}

			return { data: results };
		},
		formatUrls: (result) => {
			const data = result.data as Array<{ url: string }>;
			return data.map((item) => item.url).filter(Boolean);
		},
		formatContent: (result) => {
			const data = result.data as Array<{ markdown: string }>;
			return data.map((item) => item.markdown);
		},
	};
}

function createAutoRAGSearchStrategy(autorag: AutoRAG): SearchStrategy {
	return {
		name: "autorag",
		search: async (query: string) => {
			const result = await autorag.search({
				query,
				max_num_results: config.webSearch.resultsLimit,
			});
			return { data: result.data };
		},
		formatUrls: (result) => {
			const data = result.data as Array<{ filename: string }>;
			return data.map((item) => `AutoRAG: ${item.filename}`).filter(Boolean);
		},
		formatContent: (result) => {
			const data = result.data as Array<{ content: Array<{ text: string }> }>;
			return data.map((item) =>
				item.content.map((c) => c.text).join("\n\n-----\n\n"),
			);
		},
	};
}

// ============================================
// AI Processing Functions
// ============================================

export async function processSerpResult({
	env,
	query,
	result,
	numLearnings = config.research.maxQuestions,
	numFollowUpQuestions = config.research.maxQuestions,
	sourceUrls = [],
}: {
	env: Env;
	query: string;
	result: string[];
	numLearnings?: number;
	numFollowUpQuestions?: number;
	sourceUrls?: string[];
}): Promise<{ learnings: string[]; followUpQuestions: string[] }> {
	const contents = result.filter(Boolean);

	const model = getModel(env);
	const schema = z.object({
		learnings: z
			.array(
				z.object({
					text: z.string().describe("The learning content"),
					confidence: z
						.enum(["HIGH", "MEDIUM", "LOW"])
						.describe("Confidence level based on source quality"),
					sourceIndex: z
						.number()
						.optional()
						.describe("Index of the source content (0-based)"),
				}),
			)
			.describe(`List of learnings with confidence (max ${numLearnings})`),
		followUpQuestions: z
			.array(z.string())
			.describe(`List of follow-up questions (max ${numFollowUpQuestions})`),
	});
	const system = LEARNING_EXTRACTION_PROMPT();
	const prompt = `Given the SERP contents for query <query>${query}</query>, extract up to ${numLearnings} concise and unique learnings with confidence levels. Include entities such as people, places, companies, etc., and also provide up to ${numFollowUpQuestions} follow-up questions to extend the research.

Source URLs for reference: ${sourceUrls.map((url, i) => `[${i}] ${url}`).join(", ")}

<contents>${contents
		.map((content, i) => `<content index="${i}">\n${content}\n</content>`)
		.join("\n")}</contents>`;

	try {
		const res = await generateObject({
			model,
			abortSignal: AbortSignal.timeout(60000),
			system,
			prompt,
			schema,
		});

		// Format learnings with confidence indicators for backward compatibility
		const formattedLearnings = res.object.learnings.map((l) => {
			const sourceInfo =
				l.sourceIndex !== undefined && sourceUrls[l.sourceIndex]
					? ` [Source: ${sourceUrls[l.sourceIndex]}]`
					: "";
			return `[${l.confidence}] ${l.text}${sourceInfo}`;
		});

		return {
			learnings: formattedLearnings,
			followUpQuestions: res.object.followUpQuestions,
		};
	} catch (error) {
		if (isRateLimitError(error)) {
			logRateLimitRetry("processSerpResult", query);
			const fallbackModel = getFallbackModel(env);
			const res = await generateObject({
				model: fallbackModel,
				abortSignal: AbortSignal.timeout(60000),
				system,
				prompt,
				schema,
			});

			const formattedLearnings = res.object.learnings.map((l) => {
				const sourceInfo =
					l.sourceIndex !== undefined && sourceUrls[l.sourceIndex]
						? ` [Source: ${sourceUrls[l.sourceIndex]}]`
						: "";
				return `[${l.confidence}] ${l.text}${sourceInfo}`;
			});

			return {
				learnings: formattedLearnings,
				followUpQuestions: res.object.followUpQuestions,
			};
		}
		throw error;
	}
}

// Learning deduplication - removes semantically similar learnings
export function deduplicateLearnings(learnings: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const learning of learnings) {
		// Normalize the learning for comparison (lowercase, remove extra whitespace)
		const normalized = learning
			.toLowerCase()
			.replace(/\[(?:high|medium|low)\]\s*/gi, "") // Remove confidence tags
			.replace(/\[source:[^\]]*\]/gi, "") // Remove source tags
			.replace(/\s+/g, " ")
			.trim();

		// Simple word-based similarity check
		const words = new Set(normalized.split(" ").filter((w) => w.length > 3));
		let isDuplicate = false;

		for (const seenItem of seen) {
			const seenWords = new Set(
				seenItem.split(" ").filter((w) => w.length > 3),
			);
			const intersection = [...words].filter((w) => seenWords.has(w));
			const similarity =
				(2 * intersection.length) / (words.size + seenWords.size);

			// If more than 70% similar, consider it a duplicate
			if (similarity > 0.7) {
				isDuplicate = true;
				break;
			}
		}

		if (!isDuplicate) {
			seen.add(normalized);
			result.push(learning);
		}
	}

	return result;
}

export async function generateSerpQueries({
	env,
	query,
	numQueries = config.research.maxQuestions,
	learnings,
}: {
	env: Env;
	query: string;
	numQueries?: number;
	learnings?: string[];
}): Promise<Array<{ query: string; researchGoal: string }>> {
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

	type QueryResult = { query: string; researchGoal: string };

	try {
		const res = await generateObject({
			model,
			system,
			prompt,
			schema,
		});
		return res.object.queries.slice(0, numQueries) as QueryResult[];
	} catch (error) {
		if (isRateLimitError(error)) {
			logRateLimitRetry("generateSerpQueries", query);
			const fallbackModel = getFallbackModel(env);
			const res = await generateObject({
				model: fallbackModel,
				system,
				prompt,
				schema,
			});
			return res.object.queries.slice(0, numQueries) as QueryResult[];
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
}): Promise<string> {
	// Deduplicate learnings before generating the report
	const uniqueLearnings = deduplicateLearnings(learnings);
	logger.info("Learnings deduplicated", {
		original: learnings.length,
		deduplicated: uniqueLearnings.length,
	});

	const learningsString = uniqueLearnings
		.map((l) => `<learning>\n${l}\n</learning>`)
		.join("\n");

	const model = getModelThinking(env);
	const system = FINAL_REPORT_PROMPT();
	const generationPrompt = `Research Query: <prompt>${prompt}</prompt>

Write a comprehensive research report based on the following learnings. Pay attention to confidence levels [HIGH/MEDIUM/LOW] when presenting findings.

<learnings>
${learningsString}
</learnings>

Generate the report following the structure outlined in your system prompt.`;

	let text: string;
	try {
		const res = await generateText({
			model,
			system,
			prompt: generationPrompt,
		});
		text = res.text;
	} catch (error) {
		if (isRateLimitError(error)) {
			logRateLimitRetry("writeFinalReport", prompt);
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

	// Deduplicate sources
	const parsedSources = [...new Set(visitedUrls)];

	// Only append sources section if there are actual sources
	if (parsedSources.length > 0) {
		const urlsSection = `\n\n\n\n## Sources\n\n${parsedSources.map((url) => `- ${url}`).join("\n")}`;
		return text + urlsSection;
	}

	return text;
}

// ============================================
// Helper Functions
// ============================================

function isRateLimitError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message || "";
		const lastError = (error as { lastError?: string }).lastError || "";
		return (
			message.includes("exceeded your current quota") ||
			lastError.includes("exceeded your current quota")
		);
	}
	return false;
}

/**
 * Format error messages for user display
 */
function formatErrorForUser(error: Error): string {
	const message = error.message || "";

	// Check if it's a quota error
	if (message.includes("exceeded your current quota")) {
		// Extract retry time if available
		const retryMatch = message.match(/Please retry in ([\d.]+)s/);
		const retryTime = retryMatch ? retryMatch[1] : null;

		// Extract model name if available
		const modelMatch = message.match(/model:\s*(\S+)/);
		const modelName = modelMatch ? modelMatch[1] : "Gemini API";

		return `# API Quota Exceeded

**The research could not be completed due to API quota limits.**

## What happened?
The Google Gemini API quota has been exceeded. This typically happens when:
- You've reached the free tier request limit
- Too many requests were made in a short period
- The daily token limit has been reached

## What you can do:
1. **Wait and retry**: ${retryTime ? `You can retry in about ${Math.ceil(Number.parseFloat(retryTime))} seconds.` : "Wait a few minutes and try again."}
2. **Check your API usage**: Visit [Google AI Studio](https://ai.dev/rate-limit) to monitor your current usage
3. **Upgrade your plan**: Consider upgrading to a paid tier for higher limits at [Google AI Pricing](https://ai.google.dev/pricing)
4. **Reduce research scope**: Try using lower depth/breadth settings to reduce API calls

## Technical Details
- **Model**: ${modelName}
- **Error Type**: Quota Limit Exceeded

For more information about rate limits, visit the [Gemini API documentation](https://ai.google.dev/gemini-api/docs/rate-limits).`;
	}

	// For other errors, return a formatted version
	return `# Research Error

An error occurred during the research process:

\`\`\`
${message}
\`\`\`

${error.stack ? `\n## Stack Trace\n\`\`\`\n${error.stack}\n\`\`\`` : ""}`;
}

async function addResearchStatusHistoryEntry(
	db: D1QB,
	researchId: string,
	statusText: string,
): Promise<void> {
	try {
		await db
			.insert({
				tableName: "research_status_history",
				data: {
					id: crypto.randomUUID(),
					research_id: researchId,
					status_text: statusText,
				},
			})
			.execute();
	} catch (e) {
		const error = e instanceof Error ? e : new Error(String(e));
		logger.error(
			"Failed to insert research status history entry",
			{ researchId },
			error,
		);
	}
}

// ============================================
// Main Workflow Class
// ============================================

export class ResearchWorkflow extends WorkflowEntrypoint<Env, ResearchType> {
	async run(event: WorkflowEvent<ResearchType>, step: WorkflowStep) {
		const qb = new D1QB(this.env.DB);
		qb.setDebugger(true);
		const { query, questions, breadth, depth, id, initialLearnings } =
			event.payload;

		const parsedBreadth = Number.parseInt(breadth, 10);
		const parsedDepth = Number.parseInt(depth, 10);

		logResearchStart(id, query, parsedDepth, parsedBreadth);

		try {
			await addResearchStatusHistoryEntry(qb, id, "Workflow run initiated.");

			const fullQuery = `Initial Query: ${query}\nFollowup Q&A:\n${questions
				.map((q) => `Q: ${q.question}\nA: ${q.answer}`)
				.join("\n")}`;

			const processedLearnings =
				initialLearnings && initialLearnings.trim().length > 0
					? initialLearnings.split("\n")
					: [];

			const browser = await getBrowser(this.env);

			let learnings: string[] = [];
			let visitedUrls: string[] = [];

			// Crawl user-provided source URLs first
			const sourceUrls = event.payload.source_urls ?? [];
			if (sourceUrls.length > 0) {
				logger.info("Crawling user-provided source URLs", {
					researchId: id,
					urlCount: sourceUrls.length,
				});
				await addResearchStatusHistoryEntry(
					qb,
					id,
					`Processing ${sourceUrls.length} user-provided source URL(s)`,
				);

				const activeBrowser = await browser.getActiveBrowser();
				const sourceResults = await step.do("crawl_source_urls", async () => {
					const results: Array<{ url: string; markdown: string }> = [];
					for (const url of sourceUrls) {
						try {
							await addResearchStatusHistoryEntry(
								qb,
								id,
								`Crawling source URL: ${url}`,
							);
							const searchResult = await webSearch(activeBrowser, url, 1, {
								cache: this.env.CACHE,
							});
							if (searchResult.length > 0) {
								results.push({
									url: searchResult[0].url,
									markdown: searchResult[0].markdown,
								});
							}
						} catch (err) {
							logger.warn("Failed to crawl source URL", { url, error: err });
						}
					}
					return results;
				});

				// Process learnings from source URLs
				if (sourceResults.length > 0) {
					const sourceContent = sourceResults.map((r) => r.markdown);
					const sourceUrlsList = sourceResults.map((r) => r.url);

					const sourceLearnings = await step.do(
						"process_source_learnings",
						async () => {
							const result = await processSerpResult({
								env: this.env,
								query: fullQuery,
								result: sourceContent,
								sourceUrls: sourceUrlsList,
							});
							return result.learnings;
						},
					);

					learnings = [...learnings, ...sourceLearnings];
					visitedUrls = [...visitedUrls, ...sourceUrlsList];
				}
			}

			// Web research
			if (event.payload.browse_internet) {
				logger.info("Starting web research", { researchId: id });
				const excludedDomains = event.payload.excluded_domains ?? [];
				const webStrategy = createWebSearchStrategy(
					browser,
					qb,
					id,
					this.env.CACHE,
					excludedDomains,
				);

				const researchResult = await deepResearch({
					step,
					env: this.env,
					strategy: webStrategy,
					query: fullQuery,
					breadth: parsedBreadth,
					depth: parsedDepth,
					learnings: [...processedLearnings, ...learnings],
					visitedUrls,
					qb,
					researchId: id,
				});

				learnings = [...learnings, ...researchResult.learnings];
				visitedUrls = [...visitedUrls, ...researchResult.visitedUrls];
			}

			// AutoRAG research
			if (event.payload.autorag_id) {
				logger.info("Starting AutoRAG research", {
					researchId: id,
					autoragId: event.payload.autorag_id,
				});
				const autoragStrategy = createAutoRAGSearchStrategy(
					this.env.AI.autorag(event.payload.autorag_id),
				);

				const researchResult = await deepResearch({
					step,
					env: this.env,
					strategy: autoragStrategy,
					query: fullQuery,
					breadth: parsedBreadth,
					depth: parsedDepth,
					learnings: processedLearnings,
					visitedUrls: [],
					qb,
					researchId: id,
				});

				learnings = [...learnings, ...researchResult.learnings];
				visitedUrls = [...visitedUrls, ...researchResult.visitedUrls];
			}

			// Generate final report
			logReportGeneration(id, learnings.length);
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

			const duration = Date.now() - event.payload.start_ms;

			// Store large reports in R2, smaller ones in D1
			const { dbContent, storedInR2 } = await storeReportWithR2Fallback(
				this.env.REPORTS_BUCKET,
				id,
				report,
			);

			if (storedInR2) {
				logger.info("Report stored in R2", { researchId: id });
			}

			await qb
				.update({
					tableName: "researches",
					data: {
						status: config.status.completed,
						result: dbContent,
						duration,
					},
					where: { conditions: "id = ?", params: [id] },
				})
				.execute();

			logResearchComplete(id, duration, learnings.length);

			return {
				learnings,
				visitedUrls,
				report,
			};
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logResearchError(id, err);

			// Create user-friendly error message
			const userFriendlyError = formatErrorForUser(err);

			await addResearchStatusHistoryEntry(
				qb,
				id,
				`Workflow failed: ${err.message.substring(0, 200)}${err.message.length > 200 ? "..." : ""}`,
			);

			await qb
				.update({
					tableName: "researches",
					data: {
						status: config.status.failed,
						duration: Date.now() - event.payload.start_ms,
						result: userFriendlyError,
					},
					where: { conditions: "id = ?", params: [id] },
				})
				.execute();

			throw error;
		}
	}
}
