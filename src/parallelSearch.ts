import { createMCPClient } from "@ai-sdk/mcp";
import { z } from "zod";
import type { Env } from "./bindings";
import { config } from "./config";
import type { SearchResult } from "./webSearch";

const PARALLEL_MCP_URL = "https://search.parallel.ai/mcp";
const USER_AGENT =
	"workers-research/0.0.1 (+https://github.com/G4brym/workers-research)";

const searchResponseSchema = z.object({
	results: z.array(
		z.object({
			url: z.string(),
			title: z.string().nullable().optional(),
			excerpts: z.array(z.string()),
		}),
	),
});

const toolResponseSchema = z.object({
	isError: z.boolean().optional(),
	content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
	structuredContent: z.unknown().optional(),
});

export function getWebSearchProvider(
	env: Pick<Env, "WEB_SEARCH_PROVIDER">,
): "duckduckgo" | "parallel" {
	const provider = env.WEB_SEARCH_PROVIDER ?? "duckduckgo";
	if (provider !== "duckduckgo" && provider !== "parallel") {
		throw new Error("WEB_SEARCH_PROVIDER must be duckduckgo or parallel");
	}
	return provider;
}

/** Search with the anonymous Parallel MCP endpoint, without ambient credentials. */
export async function parallelSearch(
	query: string,
	limit: number,
	options: { sessionId: string; signal?: AbortSignal },
): Promise<SearchResult[]> {
	const timeout = AbortSignal.timeout(config.webSearch.pageTimeoutMs);
	const signal = options.signal
		? AbortSignal.any([options.signal, timeout])
		: timeout;
	signal.throwIfAborted();
	const client = await createMCPClient({
		clientName: "workers-research",
		version: "0.0.1",
		transport: {
			type: "http",
			url: PARALLEL_MCP_URL,
			headers: { "User-Agent": USER_AGENT },
			fetch: async (input, init) => {
				const response = await fetch(input, {
					...init,
					// Workers supports manual redirects, but not redirect: "error".
					redirect: "manual",
					signal: init?.signal
						? AbortSignal.any([signal, init.signal])
						: signal,
				});
				if (response.status >= 300 && response.status < 400) {
					throw new Error("Parallel MCP redirects are not allowed");
				}
				return response;
			},
		},
		initializationOptions: { signal },
		maxRetries: 0,
	});

	try {
		const definitions = await client.listTools({ options: { signal } });
		const tools = client.toolsFromDefinitions(definitions);
		const search = tools.web_search;
		if (!search) throw new Error("Parallel MCP does not offer web_search");
		const response = toolResponseSchema.parse(
			await search.execute(
				{
					objective: query,
					search_queries: [query],
					session_id: options.sessionId,
				},
				{ toolCallId: "web-search", messages: [], abortSignal: signal },
			),
		);
		if (response.isError) {
			const message = response.content
				.filter((item) => item.type === "text")
				.map((item) => item.text)
				.join("\n");
			throw new Error(`Parallel search failed: ${message}`);
		}
		const text = response.content.find((item) => item.type === "text");
		const data = searchResponseSchema.parse(
			response.structuredContent ??
				JSON.parse(text?.type === "text" ? text.text : "null"),
		);
		const results: SearchResult[] = [];
		for (const item of data.results) {
			try {
				const url = new URL(item.url);
				if (
					!["http:", "https:"].includes(url.protocol) ||
					url.username ||
					url.password
				) {
					continue;
				}
			} catch {
				continue;
			}
			results.push({
				url: item.url,
				title: item.title ?? item.url,
				description: item.excerpts[0] ?? "",
				markdown: item.excerpts.join("\n\n"),
				links: [],
			});
		}
		return results.slice(0, limit);
	} finally {
		await client.close();
	}
}
