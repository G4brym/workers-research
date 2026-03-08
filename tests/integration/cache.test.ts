import { env } from "cloudflare:test";
import { describe, expect, test } from "vitest";
import {
	batchGetCachedUrls,
	CACHE_TTL,
	type CachedSearchResults,
	type CachedUrlContent,
	getCachedSearchResults,
	getCachedUrlContent,
	getSearchCacheKey,
	getUrlCacheKey,
	setCachedSearchResults,
	setCachedUrlContent,
} from "../../src/cache";

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
		const result = await getCachedUrlContent(
			env.CACHE,
			"https://not-cached.com",
		);
		expect(result).toBeNull();
	});

	test("should return cached content when available", async () => {
		const cachedContent: CachedUrlContent = {
			content: "# Test Content",
			title: "Test Page",
			crawledAt: "2024-01-01T00:00:00Z",
		};

		await setCachedUrlContent(env.CACHE, "https://example.com", cachedContent);
		const result = await getCachedUrlContent(
			env.CACHE,
			"https://example.com",
		);
		expect(result).toEqual(cachedContent);
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

	test("should store and retrieve content in cache", async () => {
		const content: CachedUrlContent = {
			content: "# Test",
			title: "Test",
			crawledAt: "2024-01-01T00:00:00Z",
		};

		await setCachedUrlContent(env.CACHE, "https://store-test.com", content);

		const result = await getCachedUrlContent(
			env.CACHE,
			"https://store-test.com",
		);
		expect(result).toEqual(content);
	});
});

describe("getCachedSearchResults", () => {
	test("should return null when cache is undefined", async () => {
		const result = await getCachedSearchResults(undefined, "test query");
		expect(result).toBeNull();
	});

	test("should return null when query is not cached", async () => {
		const result = await getCachedSearchResults(
			env.CACHE,
			"uncached query",
		);
		expect(result).toBeNull();
	});

	test("should return cached results when available", async () => {
		const cachedResults: CachedSearchResults = {
			urls: ["https://example.com/1", "https://example.com/2"],
			searchedAt: "2024-01-01T00:00:00Z",
		};

		await setCachedSearchResults(env.CACHE, "test query", cachedResults);
		const result = await getCachedSearchResults(env.CACHE, "test query");
		expect(result).toEqual(cachedResults);
	});
});

describe("setCachedSearchResults", () => {
	test("should store and retrieve search results in cache", async () => {
		const results: CachedSearchResults = {
			urls: ["https://example.com"],
			searchedAt: "2024-01-01T00:00:00Z",
		};

		await setCachedSearchResults(env.CACHE, "Store Query", results);

		// Verify retrieval — key should be lowercased
		const retrieved = await getCachedSearchResults(
			env.CACHE,
			"store query",
		);
		expect(retrieved).toEqual(results);
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
		const content1: CachedUrlContent = {
			content: "Content 1",
			crawledAt: "2024-01-01T00:00:00Z",
		};
		const content2: CachedUrlContent = {
			content: "Content 2",
			crawledAt: "2024-01-01T00:00:00Z",
		};

		await setCachedUrlContent(env.CACHE, "https://batch1.com", content1);
		await setCachedUrlContent(env.CACHE, "https://batch2.com", content2);

		const urls = [
			"https://batch1.com",
			"https://batch2.com",
			"https://batch3.com",
		];
		const result = await batchGetCachedUrls(env.CACHE, urls);

		expect(result.size).toBe(3);
		expect(result.get("https://batch1.com")).toEqual(content1);
		expect(result.get("https://batch2.com")).toEqual(content2);
		expect(result.get("https://batch3.com")).toBeNull();
	});

	test("should handle empty URL array", async () => {
		const result = await batchGetCachedUrls(env.CACHE, []);
		expect(result.size).toBe(0);
	});
});
