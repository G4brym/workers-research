import puppeteer, { type Browser } from "@cloudflare/puppeteer";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { Env } from "./bindings";
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
					// @ts-ignore
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
): Promise<SearchResult> {
	const page = await browser.newPage();
	try {
		const response = await page.goto(url, { waitUntil: "domcontentloaded" });

		// Attempt to close popups
		await page.evaluate(() => {
			const closeButtons = Array.from(
				document.querySelectorAll("button, a"),
			).filter(
				(el) =>
					el.textContent.toLowerCase().includes("close") ||
					el.textContent.includes("×"),
			);
			// @ts-ignore
			closeButtons.forEach((btn) => btn.click());
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
				// @ts-ignore
				.querySelectorAll("script, style, nav, header, footer")
				.forEach((el) => el.remove());

			// @ts-ignore
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

export async function webSearch(
	browser: Browser,
	query: string,
	limit: number,
): Promise<SearchResult[]> {
	const searchResults = await performSearch(browser, query, limit);

	const promises: Array<Promise<SearchResult>> = [];
	for (const result of searchResults) {
		promises.push(extractContent(browser, result));
	}

	return await Promise.all(promises);
}
