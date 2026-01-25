// ============================================
// Cache Key Generation
// ============================================

/**
 * Generate a cache key for URL content
 */
export function getUrlCacheKey(url: string): string {
	return `url:${url}`;
}

/**
 * Generate a cache key for search results
 */
export function getSearchCacheKey(query: string): string {
	return `search:${query.toLowerCase().trim()}`;
}

// ============================================
// Cache TTL Constants (in seconds)
// ============================================

export const CACHE_TTL = {
	URL_CONTENT: 60 * 60 * 24, // 24 hours for crawled URL content
	SEARCH_RESULTS: 60 * 60 * 6, // 6 hours for search results
	PARSED_HTML: 60 * 60 * 24 * 7, // 7 days for parsed HTML -> markdown
} as const;

// ============================================
// Cached Content Types
// ============================================

export interface CachedUrlContent {
	content: string;
	title?: string;
	crawledAt: string;
}

export interface CachedSearchResults {
	urls: string[];
	searchedAt: string;
}

// ============================================
// Cache Operations
// ============================================

/**
 * Get cached URL content
 */
export async function getCachedUrlContent(
	cache: KVNamespace | undefined,
	url: string,
): Promise<CachedUrlContent | null> {
	if (!cache) return null;

	try {
		const key = getUrlCacheKey(url);
		const cached = await cache.get(key, "json");
		return cached as CachedUrlContent | null;
	} catch {
		return null;
	}
}

/**
 * Set cached URL content
 */
export async function setCachedUrlContent(
	cache: KVNamespace | undefined,
	url: string,
	content: CachedUrlContent,
): Promise<void> {
	if (!cache) return;

	try {
		const key = getUrlCacheKey(url);
		await cache.put(key, JSON.stringify(content), {
			expirationTtl: CACHE_TTL.URL_CONTENT,
		});
	} catch {
		// Silently fail - caching is optional
	}
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
	cache: KVNamespace | undefined,
	query: string,
): Promise<CachedSearchResults | null> {
	if (!cache) return null;

	try {
		const key = getSearchCacheKey(query);
		const cached = await cache.get(key, "json");
		return cached as CachedSearchResults | null;
	} catch {
		return null;
	}
}

/**
 * Set cached search results
 */
export async function setCachedSearchResults(
	cache: KVNamespace | undefined,
	query: string,
	results: CachedSearchResults,
): Promise<void> {
	if (!cache) return;

	try {
		const key = getSearchCacheKey(query);
		await cache.put(key, JSON.stringify(results), {
			expirationTtl: CACHE_TTL.SEARCH_RESULTS,
		});
	} catch {
		// Silently fail - caching is optional
	}
}

/**
 * Batch get cached URL contents
 * Returns a map of URL -> cached content (or null if not cached)
 */
export async function batchGetCachedUrls(
	cache: KVNamespace | undefined,
	urls: string[],
): Promise<Map<string, CachedUrlContent | null>> {
	const results = new Map<string, CachedUrlContent | null>();

	if (!cache) {
		for (const url of urls) {
			results.set(url, null);
		}
		return results;
	}

	// Fetch all cached content in parallel
	const promises = urls.map(async (url) => {
		const content = await getCachedUrlContent(cache, url);
		return { url, content };
	});

	const resolved = await Promise.all(promises);
	for (const { url, content } of resolved) {
		results.set(url, content);
	}

	return results;
}
