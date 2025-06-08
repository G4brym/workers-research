import { type Renderer, marked } from "marked";

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

	// Override heading rendering
	renderer.heading = function (token: HeadingToken): string {
		const text = this.parser.parseInline(token.tokens);
		const level = token.depth;

		switch (level) {
			case 1:
				return `<h1 class="text-3xl font-bold text-gray-900 mb-2">${text}</h1>`;
			case 2:
				return `<h2 class="text-xl font-bold text-gray-900 mb-6">${text}</h2>`;
			case 3:
				return `<h3 class="text-xl font-bold text-gray-900 mt-8 mb-6">${text}</h3>`;
			case 4:
				return `<h4 class="text-lg font-semibold text-gray-900 mt-6 mb-4">${text}</h4>`;
			case 5:
				return `<h5 class="text-base font-semibold text-gray-900 mt-4 mb-3">${text}</h5>`;
			case 6:
				return `<h6 class="text-sm font-semibold text-gray-900 mt-3 mb-2">${text}</h6>`;
			default:
				return `<h${level} class="font-semibold text-gray-900 mb-2">${text}</h${level}>`;
		}
	};

	// Override paragraph rendering
	renderer.paragraph = function (token: ParagraphToken): string {
		const text = this.parser.parseInline(token.tokens);
		return `<p class="mb-6 text-gray-700 leading-relaxed">${text}</p>`;
	};

	// Override strong (bold) text rendering
	renderer.strong = function (token: Token): string {
		const text = this.parser.parseInline(token.tokens || []);
		return `<strong class="font-semibold text-gray-900">${text}</strong>`;
	};

	// Override emphasis (italic) text rendering
	renderer.em = function (token: Token): string {
		const text = this.parser.parseInline(token.tokens || []);
		return `<em class="italic text-gray-800">${text}</em>`;
	};

	// Override list rendering
	renderer.list = function (token: ListToken): string {
		const body = token.items.map((item) => this.listitem(item)).join("");
		const tag = token.ordered ? "ol" : "ul";
		const classes = token.ordered
			? "list-decimal space-y-2 mb-6 text-gray-700 ml-4"
			: "list-disc space-y-2 mb-6 text-gray-700 ml-4";
		const startAttr =
			token.ordered && token.start ? ` start="${token.start}"` : "";
		return `<${tag} class="${classes}"${startAttr}>${body}</${tag}>`;
	};

	// Override list item rendering
	renderer.listitem = function (token: ListItemToken): string {
		const text = this.parser.parse(token.tokens);

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
		return `<blockquote class="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-md mb-6">
      <div class="text-gray-800">${body}</div>
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
		`<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">${token.text}</code>`;

	// Override table rendering
	renderer.table = (token: TableToken): string => {
		const header = token.header
			.map((cell, i) => {
				const align = token.align[i];
				let classes =
					"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
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
						let classes = "px-6 py-4 whitespace-nowrap text-sm text-gray-700";
						if (align === "center") classes += " text-center";
						else if (align === "right") classes += " text-right";
						return `<td class="${classes}">${cell}</td>`;
					})
					.join("");
				return `<tr>${cells}</tr>`;
			})
			.join("");

		return `<div class="overflow-x-auto mb-6">
      <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <thead class="bg-gray-50"><tr>${header}</tr></thead>
        <tbody class="bg-white divide-y divide-gray-200">${body}</tbody>
      </table>
    </div>`;
	};

	// Override horizontal rule rendering
	renderer.hr = (): string => `<hr class="border-gray-200 my-8">`;

	// Override link rendering
	renderer.link = function (
		token: Token & { href: string; title?: string },
	): string {
		const text = this.parser.parseInline(token.tokens || []);
		const titleAttr = token.title ? ` title="${token.title}"` : "";
		return `<a href="${token.href}"${titleAttr} class="text-blue-600 hover:text-blue-800 underline">${text}</a>`;
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

// Alternative function if you want more control over the wrapper
export function renderMarkdownReportContent(markdownContent: string): string {
	const customRenderer = createCustomRenderer();

	marked.setOptions({
		renderer: customRenderer,
		gfm: true,
		breaks: false,
		sanitize: false,
		smartypants: true,
	});

	return marked.parse(markdownContent) as string;
}
