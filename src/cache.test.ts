import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	CACHE_TTL,
	type CachedSearchResults,
	type CachedUrlContent,
	batchGetCachedUrls,
	getCachedSearchResults,
	getCachedUrlContent,
	getSearchCacheKey,
	getUrlCacheKey,
	setCachedSearchResults,
	setCachedUrlContent,
} from "./cache";

// Mock KVNamespace
function createMockKV() {
	const store = new Map<string, string>();
	return {
		get: vi.fn(async (key: string, type?: string) => {
			const value = store.get(key);
			if (!value) return null;
			return type === "json" ? JSON.parse(value) : value;
		}),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		_store: store,
	} as unknown as KVNamespace & { _store: Map<string, string> };
}

describe("cache key generation", () => {
	test("getUrlCacheKey should prefix with 'url:'", () => {
		const key = getUrlCacheKey("https://example.com/page");
		expect(key).toBe("url:https://example.com/page");
	});

	test("getSearchCacheKey should prefix with 'search:' and lowercase", () => {
		const key = getSearchCacheKey("Test Query");
		expect(key).toBe("search:test query");
	});

	test("getSearchCacheKey should trim whitespace", () => {
		const key = getSearchCacheKey("  spaced query  ");
		expect(key).toBe("search:spaced query");
	});
});

describe("CACHE_TTL constants", () => {
	test("should have correct TTL values", () => {
		expect(CACHE_TTL.URL_CONTENT).toBe(60 * 60 * 24); // 24 hours
		expect(CACHE_TTL.SEARCH_RESULTS).toBe(60 * 60 * 6); // 6 hours
		expect(CACHE_TTL.PARSED_HTML).toBe(60 * 60 * 24 * 7); // 7 days
	});
});

describe("getCachedUrlContent", () => {
	test("should return null when cache is undefined", async () => {
		const result = await getCachedUrlContent(undefined, "https://example.com");
		expect(result).toBeNull();
	});

	test("should return null when URL is not cached", async () => {
		const mockKV = createMockKV();
		const result = await getCachedUrlContent(mockKV, "https://example.com");
		expect(result).toBeNull();
	});

	test("should return cached content when available", async () => {
		const mockKV = createMockKV();
		const cachedContent: CachedUrlContent = {
			content: "# Test Content",
			title: "Test Page",
			crawledAt: "2024-01-01T00:00:00Z",
		};
		mockKV._store.set("url:https://example.com", JSON.stringify(cachedContent));

		const result = await getCachedUrlContent(mockKV, "https://example.com");
		expect(result).toEqual(cachedContent);
	});

	test("should return null on error", async () => {
		const mockKV = createMockKV();
		mockKV.get = vi.fn().mockRejectedValue(new Error("KV error"));

		const result = await getCachedUrlContent(mockKV, "https://example.com");
		expect(result).toBeNull();
	});
});

describe("setCachedUrlContent", () => {
	test("should do nothing when cache is undefined", async () => {
		// Should not throw
		await setCachedUrlContent(undefined, "https://example.com", {
			content: "test",
			crawledAt: "2024-01-01T00:00:00Z",
		});
	});

	test("should store content in cache", async () => {
		const mockKV = createMockKV();
		const content: CachedUrlContent = {
			content: "# Test",
			title: "Test",
			crawledAt: "2024-01-01T00:00:00Z",
		};

		await setCachedUrlContent(mockKV, "https://example.com", content);

		expect(mockKV.put).toHaveBeenCalledWith(
			"url:https://example.com",
			JSON.stringify(content),
			{ expirationTtl: CACHE_TTL.URL_CONTENT },
		);
	});

	test("should silently fail on error", async () => {
		const mockKV = createMockKV();
		mockKV.put = vi.fn().mockRejectedValue(new Error("KV error"));

		// Should not throw
		await setCachedUrlContent(mockKV, "https://example.com", {
			content: "test",
			crawledAt: "2024-01-01T00:00:00Z",
		});
	});
});

describe("getCachedSearchResults", () => {
	test("should return null when cache is undefined", async () => {
		const result = await getCachedSearchResults(undefined, "test query");
		expect(result).toBeNull();
	});

	test("should return null when query is not cached", async () => {
		const mockKV = createMockKV();
		const result = await getCachedSearchResults(mockKV, "test query");
		expect(result).toBeNull();
	});

	test("should return cached results when available", async () => {
		const mockKV = createMockKV();
		const cachedResults: CachedSearchResults = {
			urls: ["https://example.com/1", "https://example.com/2"],
			searchedAt: "2024-01-01T00:00:00Z",
		};
		mockKV._store.set("search:test query", JSON.stringify(cachedResults));

		const result = await getCachedSearchResults(mockKV, "test query");
		expect(result).toEqual(cachedResults);
	});
});

describe("setCachedSearchResults", () => {
	test("should store search results in cache", async () => {
		const mockKV = createMockKV();
		const results: CachedSearchResults = {
			urls: ["https://example.com"],
			searchedAt: "2024-01-01T00:00:00Z",
		};

		await setCachedSearchResults(mockKV, "Test Query", results);

		expect(mockKV.put).toHaveBeenCalledWith(
			"search:test query",
			JSON.stringify(results),
			{ expirationTtl: CACHE_TTL.SEARCH_RESULTS },
		);
	});
});

describe("batchGetCachedUrls", () => {
	test("should return map with nulls when cache is undefined", async () => {
		const urls = ["https://example.com/1", "https://example.com/2"];
		const result = await batchGetCachedUrls(undefined, urls);

		expect(result.size).toBe(2);
		expect(result.get("https://example.com/1")).toBeNull();
		expect(result.get("https://example.com/2")).toBeNull();
	});

	test("should return cached content for each URL", async () => {
		const mockKV = createMockKV();
		const content1: CachedUrlContent = {
			content: "Content 1",
			crawledAt: "2024-01-01T00:00:00Z",
		};
		const content2: CachedUrlContent = {
			content: "Content 2",
			crawledAt: "2024-01-01T00:00:00Z",
		};

		mockKV._store.set("url:https://example.com/1", JSON.stringify(content1));
		mockKV._store.set("url:https://example.com/2", JSON.stringify(content2));

		const urls = [
			"https://example.com/1",
			"https://example.com/2",
			"https://example.com/3",
		];
		const result = await batchGetCachedUrls(mockKV, urls);

		expect(result.size).toBe(3);
		expect(result.get("https://example.com/1")).toEqual(content1);
		expect(result.get("https://example.com/2")).toEqual(content2);
		expect(result.get("https://example.com/3")).toBeNull();
	});

	test("should handle empty URL array", async () => {
		const mockKV = createMockKV();
		const result = await batchGetCachedUrls(mockKV, []);
		expect(result.size).toBe(0);
	});
});
