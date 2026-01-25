import { marked, type Renderer } from "marked";
import sanitizeHtml from "sanitize-html";

// Helper to generate slug for heading IDs
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

// Store headings for TOC generation
interface TocEntry {
	level: number;
	text: string;
	slug: string;
}

let tocEntries: TocEntry[] = [];

// Token interfaces for marked v15
interface Token {
	type: string;
	raw: string;
	text?: string;
	tokens?: Token[];
}

interface HeadingToken extends Token {
	type: "heading";
	depth: number;
	text: string;
	tokens: Token[];
}

interface ParagraphToken extends Token {
	type: "paragraph";
	text: string;
	tokens: Token[];
}

interface ListToken extends Token {
	type: "list";
	ordered: boolean;
	start?: number;
	loose: boolean;
	items: Token[];
}

interface ListItemToken extends Token {
	type: "list_item";
	loose: boolean;
	text: string;
	tokens: Token[];
	task?: boolean;
	checked?: boolean;
}

interface BlockquoteToken extends Token {
	type: "blockquote";
	text: string;
	tokens: Token[];
}

interface CodeToken extends Token {
	type: "code";
	text: string;
	lang?: string;
}

interface TableToken extends Token {
	type: "table";
	header: string[];
	align: ("left" | "center" | "right" | null)[];
	rows: string[][];
}

// Custom renderer function for marked v15
function createCustomRenderer(): Renderer {
	const renderer = new marked.Renderer();

	// Override heading rendering with ID for anchor links
	renderer.heading = function (token: HeadingToken): string {
		const text = this.parser.parseInline(token.tokens);
		const level = token.depth;
		const slug = slugify(token.text);

		// Collect headings for TOC (only h2 and h3)
		if (level >= 2 && level <= 3) {
			tocEntries.push({ level, text: token.text, slug });
		}

		const baseClasses: Record<number, string> = {
			1: "text-3xl font-bold text-gray-900 dark:text-white mb-2",
			2: "text-xl font-bold text-gray-900 dark:text-white mb-6",
			3: "text-xl font-bold text-gray-900 dark:text-white mt-8 mb-6",
			4: "text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-4",
			5: "text-base font-semibold text-gray-900 dark:text-white mt-4 mb-3",
			6: "text-sm font-semibold text-gray-900 dark:text-white mt-3 mb-2",
		};

		const classes =
			baseClasses[level] || "font-semibold text-gray-900 dark:text-white mb-2";
		return `<h${level} id="${slug}" class="${classes}">${text}</h${level}>`;
	};

	// Override paragraph rendering with confidence indicator support
	renderer.paragraph = function (token: ParagraphToken): string {
		let text = this.parser.parseInline(token.tokens);

		// Add color-coded confidence indicators
		text = text.replace(
			/\[HIGH\]/g,
			'<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">HIGH</span>',
		);
		text = text.replace(
			/\[MEDIUM\]/g,
			'<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">MEDIUM</span>',
		);
		text = text.replace(
			/\[LOW\]/g,
			'<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">LOW</span>',
		);

		return `<p class="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed">${text}</p>`;
	};

	// Override strong (bold) text rendering
	renderer.strong = function (token: Token): string {
		const text = this.parser.parseInline(token.tokens || []);
		return `<strong class="font-semibold text-gray-900 dark:text-white">${text}</strong>`;
	};

	// Override emphasis (italic) text rendering
	renderer.em = function (token: Token): string {
		const text = this.parser.parseInline(token.tokens || []);
		return `<em class="italic text-gray-800 dark:text-gray-200">${text}</em>`;
	};

	// Override list rendering
	// @ts-expect-error - Custom token type for marked v15
	renderer.list = function (token: ListToken): string {
		const body = token.items
			// @ts-expect-error - Custom token type
			.map((item) => this.listitem(item))
			.join("");
		const tag = token.ordered ? "ol" : "ul";
		const classes = token.ordered
			? "list-decimal space-y-2 mb-6 text-gray-700 dark:text-gray-300 ml-4"
			: "list-disc space-y-2 mb-6 text-gray-700 dark:text-gray-300 ml-4";
		const startAttr =
			token.ordered && token.start ? ` start="${token.start}"` : "";
		return `<${tag} class="${classes}"${startAttr}>${body}</${tag}>`;
	};

	// Override list item rendering with confidence indicator support
	renderer.listitem = function (token: ListItemToken): string {
		let text = this.parser.parse(token.tokens);

		// Add color-coded confidence indicators in list items too
		text = text.replace(
			/\[HIGH\]/g,
			'<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">HIGH</span>',
		);
		text = text.replace(
			/\[MEDIUM\]/g,
			'<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">MEDIUM</span>',
		);
		text = text.replace(
			/\[LOW\]/g,
			'<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">LOW</span>',
		);

		if (token.task) {
			const checkedAttr = token.checked ? "checked" : "";
			return `<li class="leading-relaxed flex items-start">
        <input type="checkbox" ${checkedAttr} disabled class="mr-2 mt-1" />
        <span>${text}</span>
      </li>`;
		}
		return `<li class="leading-relaxed">${text}</li>`;
	};

	// Override blockquote rendering
	renderer.blockquote = function (token: BlockquoteToken): string {
		const body = this.parser.parse(token.tokens);
		return `<blockquote class="border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-md mb-6">
      <div class="text-gray-800 dark:text-gray-200">${body}</div>
    </blockquote>`;
	};

	// Override code block rendering
	renderer.code = (token: CodeToken): string => {
		const code = token.text;
		const langClass = token.lang ? ` language-${token.lang}` : "";
		return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6 overflow-x-auto">
      <code class="text-sm${langClass}">${code}</code>
    </pre>`;
	};

	// Override inline code rendering
	renderer.codespan = (token: Token): string =>
		`<code class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-sm font-mono">${token.text}</code>`;

	// Override table rendering
	// @ts-expect-error - Custom token type for marked v15
	renderer.table = (token: TableToken): string => {
		const header = token.header
			.map((cell, i) => {
				const align = token.align[i];
				let classes =
					"px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider";
				if (align === "center") classes += " text-center";
				else if (align === "right") classes += " text-right";
				return `<th class="${classes}">${cell}</th>`;
			})
			.join("");

		const body = token.rows
			.map((row) => {
				const cells = row
					.map((cell, i) => {
						const align = token.align[i];
						let classes =
							"px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300";
						if (align === "center") classes += " text-center";
						else if (align === "right") classes += " text-right";
						return `<td class="${classes}">${cell}</td>`;
					})
					.join("");
				return `<tr>${cells}</tr>`;
			})
			.join("");

		return `<div class="overflow-x-auto mb-6">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
        <thead class="bg-gray-50 dark:bg-gray-800"><tr>${header}</tr></thead>
        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">${body}</tbody>
      </table>
    </div>`;
	};

	// Override horizontal rule rendering
	renderer.hr = (): string =>
		`<hr class="border-gray-200 dark:border-gray-700 my-8">`;

	// Override link rendering
	renderer.link = function (
		token: Token & { href: string; title?: string },
	): string {
		const text = this.parser.parseInline(token.tokens || []);
		const titleAttr = token.title ? ` title="${token.title}"` : "";
		return `<a href="${token.href}"${titleAttr} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">${text}</a>`;
	};

	// Override image rendering
	renderer.image = (
		token: Token & { href: string; title?: string; text?: string },
	): string => {
		const titleAttr = token.title ? ` title="${token.title}"` : "";
		const altAttr = token.text ? ` alt="${token.text}"` : "";
		return `<img src="${token.href}"${titleAttr}${altAttr} class="max-w-full h-auto rounded-lg shadow-sm mb-6">`;
	};

	return renderer;
}

// Sanitization options for HTML output - allows safe styling while preventing XSS
const sanitizeOptions: sanitizeHtml.IOptions = {
	allowedTags: [
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"p",
		"a",
		"ul",
		"ol",
		"li",
		"blockquote",
		"pre",
		"code",
		"strong",
		"em",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
		"hr",
		"br",
		"div",
		"span",
		"img",
		"input",
		"svg",
		"path",
	],
	allowedAttributes: {
		"*": ["class", "id"],
		a: ["href", "title", "target", "rel"],
		img: ["src", "alt", "title"],
		input: ["type", "checked", "disabled"],
		th: ["align"],
		td: ["align"],
		svg: ["xmlns", "viewBox", "fill", "aria-hidden"],
		path: ["d", "fill-rule", "clip-rule", "fill"],
	},
	allowedSchemes: ["http", "https", "mailto"],
	allowedSchemesByTag: {
		img: ["http", "https", "data"],
	},
	transformTags: {
		a: (tagName, attribs) => ({
			tagName,
			attribs: {
				...attribs,
				target: "_blank",
				rel: "noopener noreferrer",
			},
		}),
	},
};

// Generate Table of Contents HTML
function generateTableOfContents(entries: TocEntry[]): string {
	if (entries.length < 3) {
		// Only show TOC if there are at least 3 headings
		return "";
	}

	const tocItems = entries
		.map((entry) => {
			const indent = entry.level === 3 ? "ml-4" : "";
			return `<li class="${indent}">
				<a href="#${entry.slug}" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">${entry.text}</a>
			</li>`;
		})
		.join("");

	return `<nav class="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Table of Contents</h2>
		<ul class="space-y-2 text-sm">${tocItems}</ul>
	</nav>`;
}

// Alternative function if you want more control over the wrapper
export function renderMarkdownReportContent(
	markdownContent: string,
	options?: { includeToc?: boolean },
): string {
	// Reset TOC entries for each render
	tocEntries = [];

	const customRenderer = createCustomRenderer();

	marked.setOptions({
		renderer: customRenderer,
		gfm: true,
		breaks: false,
	});

	const rawHtml = marked.parse(markdownContent) as string;

	// Generate TOC if requested and there are enough headings
	const includeToc = options?.includeToc !== false; // Default to true
	const tocHtml = includeToc ? generateTableOfContents(tocEntries) : "";

	// Sanitize output to prevent XSS attacks
	const sanitizedContent = sanitizeHtml(rawHtml, sanitizeOptions);

	// Return TOC + content
	return tocHtml + sanitizedContent;
}

/**
 * Generate a beautifully styled PDF document from markdown content
 * @param markdownContent - The markdown content to render
 * @param metadata - Optional metadata (title, date, etc.)
 */
export function renderPdfDocument(
	markdownContent: string,
	metadata?: {
		title?: string;
		date?: string;
		query?: string;
	},
): string {
	const htmlContent = renderMarkdownReportContent(markdownContent, {
		includeToc: true,
	});

	const title = metadata?.title || "Research Report";
	const date = metadata?.date
		? new Date(metadata.date).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: new Date().toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title}</title>
	<style>
		/* PDF-optimized styles */
		@page {
			size: A4;
			margin: 2cm 2.5cm;
		}

		* {
			box-sizing: border-box;
		}

		body {
			font-family: 'Georgia', 'Times New Roman', serif;
			font-size: 11pt;
			line-height: 1.6;
			color: #1a1a1a;
			max-width: 100%;
			margin: 0;
			padding: 0;
			background: white;
		}

		/* Cover page */
		.cover-page {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			min-height: 100vh;
			text-align: center;
			page-break-after: always;
			padding: 2rem;
		}

		.cover-page h1 {
			font-size: 32pt;
			font-weight: 700;
			color: #0f172a;
			margin: 0 0 1rem 0;
			line-height: 1.2;
		}

		.cover-page .subtitle {
			font-size: 14pt;
			color: #64748b;
			margin: 0 0 3rem 0;
			font-style: italic;
		}

		.cover-page .metadata {
			margin-top: 4rem;
			padding-top: 2rem;
			border-top: 2px solid #e2e8f0;
			width: 100%;
			max-width: 500px;
		}

		.cover-page .metadata-item {
			display: flex;
			justify-content: space-between;
			margin: 0.75rem 0;
			font-size: 11pt;
		}

		.cover-page .metadata-label {
			font-weight: 600;
			color: #475569;
		}

		.cover-page .metadata-value {
			color: #64748b;
		}

		/* Main content */
		.content {
			page-break-before: always;
		}

		/* Typography */
		h1, h2, h3, h4, h5, h6 {
			font-family: 'Arial', 'Helvetica', sans-serif;
			font-weight: 700;
			color: #0f172a;
			margin-top: 1.5em;
			margin-bottom: 0.5em;
			line-height: 1.3;
			page-break-after: avoid;
		}

		h1 {
			font-size: 24pt;
			border-bottom: 3px solid #3b82f6;
			padding-bottom: 0.3em;
			margin-top: 0;
		}

		h2 {
			font-size: 18pt;
			border-bottom: 2px solid #e2e8f0;
			padding-bottom: 0.2em;
			page-break-before: auto;
		}

		h3 {
			font-size: 14pt;
			color: #1e293b;
		}

		h4 {
			font-size: 12pt;
			color: #334155;
		}

		p {
			margin: 0.75em 0;
			text-align: justify;
			orphans: 3;
			widows: 3;
		}

		/* Links */
		a {
			color: #2563eb;
			text-decoration: none;
			word-wrap: break-word;
		}

		a:after {
			content: " (" attr(href) ")";
			font-size: 9pt;
			color: #64748b;
			font-style: italic;
		}

		/* Lists */
		ul, ol {
			margin: 0.75em 0;
			padding-left: 2em;
		}

		li {
			margin: 0.4em 0;
			page-break-inside: avoid;
		}

		/* Code blocks */
		pre {
			background-color: #f8fafc;
			border: 1px solid #e2e8f0;
			border-left: 4px solid #3b82f6;
			border-radius: 4px;
			padding: 1em;
			margin: 1em 0;
			overflow-x: auto;
			page-break-inside: avoid;
			font-size: 9pt;
			line-height: 1.5;
		}

		code {
			font-family: 'Courier New', 'Consolas', monospace;
			background-color: #f1f5f9;
			padding: 0.2em 0.4em;
			border-radius: 3px;
			font-size: 9.5pt;
		}

		pre code {
			background-color: transparent;
			padding: 0;
			border-radius: 0;
		}

		/* Blockquotes */
		blockquote {
			margin: 1em 0;
			padding: 0.75em 1em;
			border-left: 4px solid #3b82f6;
			background-color: #f8fafc;
			font-style: italic;
			page-break-inside: avoid;
		}

		/* Tables */
		table {
			width: 100%;
			border-collapse: collapse;
			margin: 1.5em 0;
			page-break-inside: avoid;
			font-size: 10pt;
		}

		th {
			background-color: #f1f5f9;
			font-weight: 700;
			text-align: left;
			padding: 0.75em;
			border: 1px solid #cbd5e1;
		}

		td {
			padding: 0.6em 0.75em;
			border: 1px solid #e2e8f0;
		}

		tr:nth-child(even) {
			background-color: #f8fafc;
		}

		/* Table of Contents */
		nav {
			background-color: #f8fafc;
			border: 1px solid #e2e8f0;
			border-radius: 6px;
			padding: 1.5em;
			margin: 2em 0;
			page-break-inside: avoid;
		}

		nav h2 {
			margin-top: 0;
			font-size: 16pt;
			border-bottom: none;
		}

		nav ul {
			list-style-type: none;
			padding-left: 0;
		}

		nav ul li {
			margin: 0.5em 0;
		}

		nav a {
			color: #1e293b;
			text-decoration: none;
		}

		nav a:after {
			content: "";
		}

		nav a:hover {
			color: #3b82f6;
		}

		/* Horizontal rules */
		hr {
			border: none;
			border-top: 2px solid #e2e8f0;
			margin: 2em 0;
		}

		/* Images */
		img {
			max-width: 100%;
			height: auto;
			display: block;
			margin: 1em auto;
			page-break-inside: avoid;
		}

		/* Strong and emphasis */
		strong {
			font-weight: 700;
			color: #0f172a;
		}

		em {
			font-style: italic;
		}

		/* Page breaks */
		.page-break {
			page-break-after: always;
		}

		/* Sources section special styling */
		h2#sources {
			margin-top: 3em;
			page-break-before: always;
		}
	</style>
</head>
<body>
	<!-- Cover Page -->
	<div class="cover-page">
		<h1>${title}</h1>
		${metadata?.query ? `<p class="subtitle">${metadata.query}</p>` : ""}
		<div class="metadata">
			<div class="metadata-item">
				<span class="metadata-label">Generated:</span>
				<span class="metadata-value">${date}</span>
			</div>
			<div class="metadata-item">
				<span class="metadata-label">Format:</span>
				<span class="metadata-value">AI Research Report</span>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="content">
		${htmlContent}
	</div>
</body>
</html>`;
}
