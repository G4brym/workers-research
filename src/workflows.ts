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
import { getModel, getModelThinking } from "./utils";
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
	learnings,
	visitedUrls,
}: {
	step: WorkflowStep;
	env: Env;
	browser: ResearchBrowser;
	query: string;
	breadth: number;
	depth: number;
	learnings: string[];
	visitedUrls: string[];
}) {
	const serpQueries = await step.do("get serp queries", () =>
		generateSerpQueries({ env, query, learnings, numQueries: breadth }),
	);

	let allLearnings = [...learnings];
	let allUrls = [...visitedUrls];

	for (const serpQuery of serpQueries) {
		const result = await step.do("get new learnings", async () => {
			return await webSearch(
				await browser.getActiveBrowser(),
				serpQuery.query,
				5,
			);
		});

		const newUrls = result.map((item) => item.url).filter(Boolean);
		const newBreadth = Math.ceil(breadth / 2);
		const newDepth = depth - 1;

		const { learnings: newLearnings, followUpQuestions } = await step.do(
			"get new learnings",
			async () => {
				return await processSerpResult({
					env,
					query: serpQuery.query,
					result,
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
			});
			allLearnings = [...allLearnings, ...recursiveResult.learnings];
			allUrls = [...allUrls, ...recursiveResult.visitedUrls];
		}
	}

	return { learnings: allLearnings, visitedUrls: allUrls };
}

async function processSerpResult({
	env,
	query,
	result,
	numLearnings = 5,
	numFollowUpQuestions = 5,
}: {
	env: Env;
	query: string;
	result: SearchResult[];
	numLearnings?: number;
	numFollowUpQuestions?: number;
}) {
	const contents = result.map((item) => item.markdown).filter(Boolean);

	const res = await generateObject({
		model: getModel(env),
		abortSignal: AbortSignal.timeout(60000),
		system: RESEARCH_PROMPT(),
		prompt: `Given the SERP contents for query <query>${query}</query>, extract up to ${numLearnings} concise and unique learnings. Include entities such as people, places, companies, etc., and also provide up to ${numFollowUpQuestions} follow-up questions to extend the research.\n\n<contents>${contents
			.map((content) => `<content>\n${content}\n</content>`)
			.join("\n")}</contents>`,
		schema: z.object({
			learnings: z
				.array(z.string())
				.describe(`List of learnings (max ${numLearnings})`),
			followUpQuestions: z
				.array(z.string())
				.describe(`List of follow-up questions (max ${numFollowUpQuestions})`),
		}),
	});
	return res.object;
}

async function generateSerpQueries({
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
	const res = await generateObject({
		model: getModel(env),
		system: RESEARCH_PROMPT(),
		prompt: `Generate up to ${numQueries} unique SERP queries for the following prompt: <prompt>${query}</prompt>${
			learnings
				? `\nIncorporate these previous learnings:\n${learnings.join("\n")}`
				: ""
		}`,
		schema: z.object({
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
		}),
	});
	return res.object.queries.slice(0, numQueries);
}

async function writeFinalReport({
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

	const { text } = await generateText({
		model: getModelThinking(env),
		system: RESEARCH_PROMPT(),
		prompt: `Using the prompt <prompt>${prompt}</prompt>, write a detailed final report (3+ pages) that includes all the following learnings:\n\n<learnings>\n${learningsString}\n</learnings>`,
	});

	const parsedSources = [];
	for (const url of visitedUrls) {
		if (!parsedSources.includes(url)) {
			parsedSources.push(url);
		}
	}

	const urlsSection = `\n\n\n\n## Sources\n\n${parsedSources.map((url) => `- ${url}`).join("\n")}`;
	return text + urlsSection;
}

export class ResearchWorkflow extends WorkflowEntrypoint<Env, ResearchType> {
	async run(event: WorkflowEvent<ResearchType>, step: WorkflowStep) {
		try {
			console.log("Starting workflow");

			const { query, questions, breadth, depth, id } = event.payload;
			const fullQuery = `Initial Query: ${query}\nFollowup Q&A:\n${questions
				.map((q) => `Q: ${q.question}\nA: ${q.answer}`)
				.join("\n")}`;

			const browser = await getBrowser(this.env);

			console.log("Starting research...");
			const researchResult = await deepResearch({
				step,
				env: this.env,
				browser,
				query: fullQuery,
				breadth: Number.parseInt(breadth),
				depth: Number.parseInt(depth),
				learnings: [],
				visitedUrls: [],
			});

			console.log("Generating report");
			const report = await step.do("generate report", () =>
				writeFinalReport({
					env: this.env,
					prompt: fullQuery,
					learnings: researchResult.learnings,
					visitedUrls: researchResult.visitedUrls,
				}),
			);

			const qb = new D1QB(this.env.DB);
			await qb
				.update({
					tableName: "researches",
					data: { status: 2, result: report },
					where: { conditions: "id = ?", params: [id] },
				})
				.execute();

			console.log("Workflow finished!");
			return {
				learnings: researchResult.learnings,
				visitedUrls: researchResult.visitedUrls,
				report,
			};
		} catch (error: any) {
			const qb = new D1QB(this.env.DB);
			await qb
				.update({
					tableName: "researches",
					data: {
						status: 3,
						result: `Error: ${error.message}\n\n${error.stack ?? ""}`,
					},
					where: { conditions: "id = ?", params: [event.payload.id] },
				})
				.execute();

			throw error;
		}
	}
}
