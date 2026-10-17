import { env } from "cloudflare:test";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { generateObject, generateText } from "ai";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { D1QB } from "workers-qb";
import type { Env } from "../../src/bindings";
import { migrations } from "../../src/migrations";
import type { ResearchType } from "../../src/types";
import { getBrowser, webSearch } from "../../src/webSearch";
import { createWebSearchStrategy, ResearchWorkflow } from "../../src/workflows";
import { mockParallelMcp, parallelPage } from "../helpers/parallelMcp";

vi.mock("ai", () => ({ generateObject: vi.fn(), generateText: vi.fn() }));
vi.mock("../../src/webSearch", () => ({
	getBrowser: vi.fn(),
	webSearch: vi.fn(),
}));
vi.mock("../../src/utils", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../src/utils")>()),
	getModel: vi.fn(() => ({ id: "scripted-model" })),
	getModelThinking: vi.fn(() => ({ id: "scripted-model" })),
}));

const getActiveBrowser = vi.fn(async () => ({}));

beforeAll(async () => {
	await new D1QB(env.DB)
		.migrations({ migrations, tableName: "d1_migrations" })
		.apply();
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getBrowser).mockResolvedValue({ getActiveBrowser } as never);
	vi.mocked(generateObject).mockImplementation(async (options) => {
		if (options.prompt?.includes("Generate up to")) {
			return {
				object: {
					queries: [
						{ query: "Workers research", researchGoal: "Learn about Workers" },
					],
				},
			} as never;
		}
		return {
			object: {
				learnings: [
					{
						text: "Workers run at the edge.",
						confidence: "HIGH",
						sourceIndex: 0,
					},
				],
				followUpQuestions: [],
			},
		} as never;
	});
	vi.mocked(generateText).mockResolvedValue({
		text: "# Research report\nWorkers run at the edge.",
	} as never);
	vi.mocked(webSearch).mockResolvedValue([
		{
			url: "https://duckduckgo.example/",
			markdown: "Existing provider content",
			title: "Existing",
			description: "",
			links: [],
		},
	]);
});

afterEach(() => vi.unstubAllGlobals());

async function runResearch(
	provider?: Env["WEB_SEARCH_PROVIDER"],
	overrides: Partial<ResearchType> = {},
) {
	const id = crypto.randomUUID();
	await env.DB.prepare(
		"INSERT INTO researches (id, query, depth, breadth, questions, status, user) VALUES (?, ?, ?, ?, ?, ?, ?)",
	)
		.bind(id, "Workers", "1", "1", "[]", 1, "test-user")
		.run();
	const testEnv = { ...env, WEB_SEARCH_PROVIDER: provider } as Env;
	const payload: ResearchType = {
		id,
		query: "Workers",
		depth: "1",
		breadth: "1",
		status: 1,
		questions: [],
		start_ms: Date.now(),
		browse_internet: true,
		...overrides,
	};
	// Execute the real workflow body with immediate step callbacks and scripted model responses.
	const step = {
		do: async (_name: string, callback: () => Promise<unknown>) => callback(),
	} as unknown as WorkflowStep;
	const result = await ResearchWorkflow.prototype.run.call(
		{ env: testEnv } as ResearchWorkflow,
		{ payload } as WorkflowEvent<ResearchType>,
		step,
	);
	return { result, id };
}

describe("Parallel in the research workflow (scripted model)", () => {
	test.skipIf(import.meta.env.VITE_PARALLEL_LIVE !== "1")(
		"uses live anonymous MCP through the workflow (opt-in)",
		async () => {
			const realFetch = globalThis.fetch.bind(globalThis);
			const requests: Array<{
				url: string;
				method: string;
				authorization: boolean;
				userAgent: string | null;
			}> = [];
			vi.stubGlobal(
				"fetch",
				async (input: RequestInfo | URL, init?: RequestInit) => {
					const headers = new Headers(init?.headers);
					const rpc = init?.body ? JSON.parse(String(init.body)) : undefined;
					requests.push({
						url: String(input),
						method: rpc?.method ?? init?.method ?? "GET",
						authorization: headers.has("Authorization"),
						userAgent: headers.get("User-Agent"),
					});
					const response = await realFetch(input, init);
					if (rpc?.method === "tools/call" || !response.ok) {
						console.log(
							"Live Parallel response",
							new Date().toISOString(),
							response.status,
							response.headers.get("Retry-After"),
							await response.clone().text(),
						);
					}
					return response;
				},
			);
			const { result } = await runResearch("parallel");
			expect(result.visitedUrls.length).toBeGreaterThan(0);
			const extraction = vi
				.mocked(generateObject)
				.mock.calls.find(([options]) =>
					options.prompt?.includes("<contents>"),
				)?.[0];
			expect(extraction?.prompt).toContain(result.visitedUrls[0]);
			expect(result.report).toContain(result.visitedUrls[0]);
			expect(webSearch).not.toHaveBeenCalled();
			expect(getActiveBrowser).not.toHaveBeenCalled();
			expect(requests.map((request) => request.method)).toContain("tools/call");
			for (const request of requests) {
				expect(request.url).toBe("https://search.parallel.ai/mcp");
				expect(request.authorization).toBe(false);
				expect(request.userAgent).toContain("workers-research/0.0.1");
			}
			console.log(
				"Live workflow evidence",
				JSON.stringify({
					requests,
					visitedUrls: result.visitedUrls,
					excerptCharacters: extraction?.prompt?.length,
				}),
			);
		},
		30000,
	);

	test("dispatches through MCP into learning extraction, report sources and D1", async () => {
		const { requests } = mockParallelMcp();
		const { result, id } = await runResearch("parallel");
		expect(getActiveBrowser).not.toHaveBeenCalled();
		expect(webSearch).not.toHaveBeenCalled();
		const extraction = vi
			.mocked(generateObject)
			.mock.calls.find(([options]) =>
				options.prompt?.includes("<contents>"),
			)?.[0];
		expect(extraction?.prompt).toContain(parallelPage.excerpts[0]);
		expect(extraction?.prompt).toContain(parallelPage.url);
		expect(result.visitedUrls).toEqual([parallelPage.url]);
		expect(result.learnings[0]).toContain(`[Source: ${parallelPage.url}]`);
		expect(result.report).toContain(parallelPage.url);
		const saved = await env.DB.prepare(
			"SELECT result, status FROM researches WHERE id = ?",
		)
			.bind(id)
			.first();
		expect(saved?.status).toBe(2);
		expect(saved?.result).toBe(result.report);
		const args = requests.find((r) => r.rpc?.method === "tools/call")?.rpc
			.params?.arguments;
		expect(args.session_id).toBe(id);
	});

	test.each([
		undefined,
		"duckduckgo",
	] as const)("preserves the %s DuckDuckGo selection", async (provider) => {
		const { caller } = mockParallelMcp();
		const { result } = await runResearch(provider);
		expect(webSearch).toHaveBeenCalledOnce();
		expect(getActiveBrowser).toHaveBeenCalledOnce();
		expect(caller).not.toHaveBeenCalled();
		expect(result.visitedUrls).toEqual(["https://duckduckgo.example/"]);
	});

	test("does not call either provider when internet browsing is disabled", async () => {
		const { caller } = mockParallelMcp();
		const { result } = await runResearch("parallel", {
			browse_internet: false,
		});
		expect(caller).not.toHaveBeenCalled();
		expect(webSearch).not.toHaveBeenCalled();
		expect(getActiveBrowser).not.toHaveBeenCalled();
		expect(result.visitedUrls).toEqual([]);
	});

	test("keeps excluded domains out of learning extraction and sources", async () => {
		mockParallelMcp({
			results: [
				parallelPage,
				{
					...parallelPage,
					url: "https://sub.excluded.test/private",
					excerpts: ["Excluded content"],
				},
			],
		});
		const { result } = await runResearch("parallel", {
			excluded_domains: ["excluded.test"],
		});
		expect(result.visitedUrls).toEqual([parallelPage.url]);
		const extraction = vi
			.mocked(generateObject)
			.mock.calls.find(([options]) =>
				options.prompt?.includes("<contents>"),
			)?.[0];
		expect(extraction?.prompt).not.toContain("Excluded content");
	});

	test("records provider errors without switching to DuckDuckGo", async () => {
		mockParallelMcp({ error: "search unavailable" }, { isError: true });
		const { result, id } = await runResearch("parallel");
		expect(webSearch).not.toHaveBeenCalled();
		expect(result.visitedUrls).toEqual([]);
		const history = await env.DB.prepare(
			"SELECT status_text FROM research_status_history WHERE research_id = ?",
		)
			.bind(id)
			.all();
		expect(JSON.stringify(history.results)).toContain("search unavailable");
	});

	test("passes cancellation through the selected search strategy", async () => {
		const { caller } = mockParallelMcp();
		const controller = new AbortController();
		controller.abort();
		const browser = { getActiveBrowser } as never;
		const strategy = createWebSearchStrategy(
			{ WEB_SEARCH_PROVIDER: "parallel" } as Env,
			browser,
			new D1QB(env.DB),
			crypto.randomUUID(),
		);
		await expect(
			strategy.search("Workers", controller.signal),
		).rejects.toThrow();
		expect(caller).not.toHaveBeenCalled();
		expect(getActiveBrowser).not.toHaveBeenCalled();
	});
});
