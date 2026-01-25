import puppeteer, { type Browser } from "@cloudflare/puppeteer";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { Env } from "./bindings";
import {
	type CachedUrlContent,
	getCachedSearchResults,
	getCachedUrlContent,
	setCachedSearchResults,
	setCachedUrlContent,
} from "./cache";
import { sleep } from "./utils";

export type SearchResult = {
	title: string;
	description: string;
	url: string;
	markdown: string;
	links: Array<string>;
};

async function performSearch(
	browser: Browser,
	query: string,
	limit: number,
): Promise<Array<string>> {
	const page = await browser.newPage();
	try {
		const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
		await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
		await page.waitForSelector('[data-testid="result-title-a"]', {
			timeout: 10000,
		}); // Wait for result title links
		const urls = await page.evaluate(() => {
			const links = Array.from(
				document.querySelectorAll(
					'li[data-layout="organic"] [data-testid="result-title-a"]',
				),
			);

			return (
				links
					// @ts-expect-error
					.map((link) => link.href)
					.filter((url) => url?.startsWith("http"))
			); // Ensure valid URLs
		});
		return urls.slice(0, limit); // Take top x organic results;
	} catch (error) {
		throw new Error(`Search failed: ${(error as Error).message}`);
	} finally {
		await page.close();
	}
}

async function extractContent(
	browser: Browser,
	url: string,
	logCrawlUrl?: (url: string) => Promise<void>,
): Promise<SearchResult> {
	const page = await browser.newPage();
	try {
		if (logCrawlUrl) {
			await logCrawlUrl(url);
		}
		const _response = await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});

		// Attempt to close popups
		await page.evaluate(() => {
			const closeButtons = Array.from(
				document.querySelectorAll("button, a"),
			).filter(
				(el) =>
					el.textContent.toLowerCase().includes("close") ||
					el.textContent.includes("×"),
			);
			closeButtons.forEach((btn) => {
				(btn as HTMLElement).click();
			});
		});
		await sleep(1000); // Allow popups to close

		// Extract title, description, and main content
		const { title, description, content } = await page.evaluate(() => {
			// Get page title
			const pageTitle = document.title || "No title available";

			// Get meta description
			const metaDescription = document.querySelector(
				'meta[name="description"]',
			);
			const descriptionText = metaDescription
				? metaDescription.getAttribute("content")
				: "No description available";

			// Extract main content (simplified readability approach)
			const body = document.body.cloneNode(true);
			body
				// @ts-expect-error
				.querySelectorAll("script, style, nav, header, footer")
				.forEach((el) => {
					el.remove();
				});

			// @ts-expect-error
			const mainContent = body.outerHTML;

			return {
				title: pageTitle,
				description: descriptionText,
				content: mainContent || "No content extracted",
			};
		});
		const links = await page.evaluate(() => {
			const anchors = Array.from(document.querySelectorAll("a"));
			return anchors.map((a) => a.href).filter((a) => a !== "");
		});

		return {
			title: title,
			description: description,
			url: url,
			markdown: NodeHtmlMarkdown.translate(content),
			links: links,
		};
	} catch (error) {
		throw new Error(
			`Content extraction failed for ${url}: ${(error as Error).message}`,
		);
	} finally {
		await page.close();
	}
}

// This class reuses browsers for long-running processes
export class ResearchBrowser {
	#env: Env;
	#browser: Browser;

	constructor(env: Env) {
		this.#env = env;
	}

	async #getNewBrowser(): Promise<Browser> {
		return puppeteer.launch(this.#env.BROWSER);
	}

	async getActiveBrowser(): Promise<Browser> {
		if (!this.#browser || !this.#browser.isConnected()) {
			this.#browser = await this.#getNewBrowser();
		}

		return this.#browser;
	}
}

export async function getBrowser(env: Env): Promise<ResearchBrowser> {
	return new ResearchBrowser(env);
}

export interface WebSearchOptions {
	logCrawlUrl?: (url: string) => Promise<void>;
	cache?: KVNamespace;
}

export async function webSearch(
	browser: Browser,
	query: string,
	limit: number,
	options?: WebSearchOptions,
): Promise<SearchResult[]> {
	const { logCrawlUrl, cache } = options ?? {};

	// Check cache for search results first
	const cachedSearch = await getCachedSearchResults(cache, query);
	let searchUrls: string[];

	if (cachedSearch) {
		searchUrls = cachedSearch.urls.slice(0, limit);
	} else {
		searchUrls = await performSearch(browser, query, limit);
		// Cache search results
		await setCachedSearchResults(cache, query, {
			urls: searchUrls,
			searchedAt: new Date().toISOString(),
		});
	}

	const promises: Array<Promise<SearchResult>> = [];
	for (const url of searchUrls) {
		promises.push(extractWithCache(browser, url, logCrawlUrl, cache));
	}

	return await Promise.all(promises);
}

/**
 * Extract content from URL with caching support
 */
async function extractWithCache(
	browser: Browser,
	url: string,
	logCrawlUrl?: (url: string) => Promise<void>,
	cache?: KVNamespace,
): Promise<SearchResult> {
	// Check cache first
	const cached = await getCachedUrlContent(cache, url);
	if (cached) {
		return {
			title: cached.title || "Cached content",
			description: "Loaded from cache",
			url: url,
			markdown: cached.content,
			links: [], // Links not cached - less important for research
		};
	}

	// Fetch fresh content
	const result = await extractContent(browser, url, logCrawlUrl);

	// Cache the result
	const cacheEntry: CachedUrlContent = {
		content: result.markdown,
		title: result.title,
		crawledAt: new Date().toISOString(),
	};
	await setCachedUrlContent(cache, url, cacheEntry);

	return result;
}
