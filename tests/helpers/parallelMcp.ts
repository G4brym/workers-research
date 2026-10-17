import { vi } from "vitest";

export const parallelPage = {
	url: "https://example.com/research?topic=workers&lang=en",
	title: "Workers research",
	excerpts: ["Workers run at the edge.", "Workflows coordinate research."],
};

export function mockParallelMcp(
	result: unknown = { results: [parallelPage] },
	options: { text?: boolean; sse?: boolean; isError?: boolean } = {},
) {
	const requests: Array<{
		url: string;
		method: string;
		headers: Headers;
		rpc?: { method: string; params?: Record<string, any>; id?: number };
	}> = [];
	const caller = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const method = init?.method ?? "GET";
		const rpc = init?.body ? JSON.parse(String(init.body)) : undefined;
		requests.push({
			url: String(input),
			method,
			headers: new Headers(init?.headers),
			rpc,
		});
		if (method === "GET") return new Response(null, { status: 405 });
		if (rpc?.method === "notifications/initialized") {
			return new Response(null, { status: 202 });
		}
		let response: unknown;
		switch (rpc?.method) {
			case "initialize":
				response = {
					protocolVersion: rpc.params.protocolVersion,
					capabilities: { tools: {} },
					serverInfo: { name: "parallel-fixture", version: "1.0.0" },
				};
				break;
			case "tools/list":
				response = {
					tools: [
						{
							name: "web_search",
							inputSchema: { type: "object", properties: {} },
						},
					],
				};
				break;
			case "tools/call":
				response = {
					content: [{ type: "text", text: JSON.stringify(result) }],
					...(options.text ? {} : { structuredContent: result }),
					isError: options.isError ?? false,
				};
				break;
			default:
				throw new Error(`Unexpected MCP request: ${rpc?.method}`);
		}
		const body = JSON.stringify({
			jsonrpc: "2.0",
			id: rpc.id,
			result: response,
		});
		return options.sse
			? new Response(`event: message\ndata: ${body}\n\n`, {
					headers: { "Content-Type": "text/event-stream" },
				})
			: Response.json(JSON.parse(body));
	});
	vi.stubGlobal("fetch", caller);
	return { caller, requests };
}
