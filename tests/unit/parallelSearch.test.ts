import { afterEach, describe, expect, test, vi } from "vitest";
import { config } from "../../src/config";
import { getWebSearchProvider, parallelSearch } from "../../src/parallelSearch";
import { mockParallelMcp, parallelPage } from "../helpers/parallelMcp";

const sessionId = "4ab491d8-6585-4489-ae02-d81340b158e3";
const timeout = config.webSearch.pageTimeoutMs;

afterEach(() => {
	vi.unstubAllGlobals();
	config.webSearch.pageTimeoutMs = timeout;
});

describe("Parallel MCP search", () => {
	test("preserves the default and explicit provider choices", () => {
		expect(getWebSearchProvider({})).toBe("duckduckgo");
		expect(getWebSearchProvider({ WEB_SEARCH_PROVIDER: "duckduckgo" })).toBe(
			"duckduckgo",
		);
		expect(getWebSearchProvider({ WEB_SEARCH_PROVIDER: "parallel" })).toBe(
			"parallel",
		);
		expect(() =>
			getWebSearchProvider({ WEB_SEARCH_PROVIDER: "typo" as "parallel" }),
		).toThrow("WEB_SEARCH_PROVIDER");
	});

	test.each([
		false,
		true,
	])("uses anonymous HTTP discovery and search and consumes excerpts (SSE: %s)", async (sse) => {
		const { requests } = mockParallelMcp(undefined, { sse });
		const query = 'Cloudflare Workers "research" & workflows';
		const results = await parallelSearch(query, 5, { sessionId });
		expect(results).toEqual([
			{
				url: parallelPage.url,
				title: parallelPage.title,
				description: parallelPage.excerpts[0],
				markdown: parallelPage.excerpts.join("\n\n"),
				links: [],
			},
		]);
		expect(requests.map((r) => r.rpc?.method)).toContain("tools/list");
		expect(
			requests.find((r) => r.rpc?.method === "tools/call")?.rpc.params,
		).toEqual({
			name: "web_search",
			arguments: {
				objective: query,
				search_queries: [query],
				session_id: sessionId,
			},
		});
		for (const request of requests) {
			expect(request.url).toBe("https://search.parallel.ai/mcp");
			expect(request.headers.get("User-Agent")).toContain(
				"workers-research/0.0.1",
			);
			expect(request.headers.has("Authorization")).toBe(false);
		}
	});

	test("accepts JSON text responses, rejects unsafe URLs and respects result limits", async () => {
		mockParallelMcp(
			{
				results: [
					{ ...parallelPage, url: "javascript:alert(1)" },
					{ ...parallelPage, url: "https://user:password@example.com" },
					{ ...parallelPage, url: "malformed" },
					parallelPage,
					{ ...parallelPage, url: "https://second.example.com/" },
				],
			},
			{ text: true },
		);
		const results = await parallelSearch("workers research", 1, { sessionId });
		expect(results).toHaveLength(1);
		expect(results[0]?.url).toBe(parallelPage.url);
	});

	test("propagates MCP tool errors and malformed output", async () => {
		mockParallelMcp({ error: "quota exceeded" }, { isError: true });
		await expect(parallelSearch("workers", 5, { sessionId })).rejects.toThrow(
			"quota exceeded",
		);
		mockParallelMcp({ unexpected: [] });
		await expect(parallelSearch("workers", 5, { sessionId })).rejects.toThrow();
	});

	test.each([
		401, 403, 429, 500,
	])("propagates HTTP %s without retries", async (status) => {
		const fetcher = vi.fn(
			async () => new Response("provider error", { status }),
		);
		vi.stubGlobal("fetch", fetcher);
		await expect(parallelSearch("workers", 5, { sessionId })).rejects.toThrow();
		expect(fetcher.mock.calls.length).toBeLessThanOrEqual(2); // Initial GET and initialize POST.
	});

	test("honors cancellation before sending any requests", async () => {
		const { caller } = mockParallelMcp();
		const controller = new AbortController();
		controller.abort();
		await expect(
			parallelSearch("workers", 5, { sessionId, signal: controller.signal }),
		).rejects.toThrow();
		expect(caller).not.toHaveBeenCalled();
	});

	test.each([
		["cancel", "initialize"],
		["timeout", "initialize"],
		["cancel", "tools/list"],
		["timeout", "tools/list"],
		["cancel", "tools/call"],
		["timeout", "tools/call"],
	])("honors %s during %s", async (kind, stage) => {
		const controller = new AbortController();
		config.webSearch.pageTimeoutMs = kind === "timeout" ? 100 : timeout;
		const { caller } = mockParallelMcp();
		const respond = caller.getMockImplementation();
		let reachedStage = false;
		caller.mockImplementation(async (input, init) => {
			const rpc = init?.body ? JSON.parse(String(init.body)) : undefined;
			if (rpc?.method !== stage) return respond(input, init);
			reachedStage = true;
			return new Promise<Response>((_resolve, reject) => {
				const signal = init?.signal;
				signal?.addEventListener("abort", () => reject(signal.reason), {
					once: true,
				});
				if (kind === "cancel") controller.abort();
			});
		});
		await expect(
			parallelSearch("workers", 5, { sessionId, signal: controller.signal }),
		).rejects.toThrow();
		expect(reachedStage).toBe(true);
	});
});
