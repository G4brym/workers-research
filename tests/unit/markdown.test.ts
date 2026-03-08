import { describe, expect, test } from "vitest";
import { renderMarkdownReportContent } from "../../src/markdown";

describe("renderMarkdownReportContent", () => {
	describe("basic rendering", () => {
		test("should render headings with IDs for anchor links", () => {
			const markdown = "## Test Heading\n\nSome content.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain('id="test-heading"');
			expect(result).toContain("<h2");
		});

		test("should render paragraphs", () => {
			const markdown = "This is a paragraph.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("<p");
			expect(result).toContain("This is a paragraph.");
		});

		test("should render lists", () => {
			const markdown = "- Item 1\n- Item 2\n- Item 3";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("<ul");
			expect(result).toContain("<li");
			expect(result).toContain("Item 1");
		});

		test("should render ordered lists", () => {
			const markdown = "1. First\n2. Second\n3. Third";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("<ol");
		});

		test("should render links with target _blank", () => {
			const markdown = "[Link Text](https://example.com)";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain('href="https://example.com"');
			expect(result).toContain('target="_blank"');
			expect(result).toContain('rel="noopener noreferrer"');
		});
	});

	describe("Table of Contents", () => {
		test("should generate TOC when there are 3+ headings", () => {
			const markdown = `
## First Section
Content 1

## Second Section
Content 2

## Third Section
Content 3
			`;
			const result = renderMarkdownReportContent(markdown, {
				includeToc: true,
			});

			expect(result).toContain("Table of Contents");
			expect(result).toContain('href="#first-section"');
			expect(result).toContain('href="#second-section"');
			expect(result).toContain('href="#third-section"');
		});

		test("should not generate TOC when there are fewer than 3 headings", () => {
			const markdown = `
## First Section
Content 1

## Second Section
Content 2
			`;
			const result = renderMarkdownReportContent(markdown, {
				includeToc: true,
			});

			expect(result).not.toContain("Table of Contents");
		});

		test("should include h3 headings in TOC with indentation", () => {
			const markdown = `
## Main Section
Content

### Subsection
More content

## Another Section
Even more

### Another Subsection
Final content
			`;
			const result = renderMarkdownReportContent(markdown, {
				includeToc: true,
			});

			expect(result).toContain("Table of Contents");
			expect(result).toContain('href="#subsection"');
			expect(result).toContain("ml-4"); // Indentation for h3
		});

		test("should not generate TOC when includeToc is false", () => {
			const markdown = `
## First Section
Content 1

## Second Section
Content 2

## Third Section
Content 3
			`;
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).not.toContain("Table of Contents");
		});
	});

	describe("confidence indicators", () => {
		test("should render [HIGH] with green styling", () => {
			const markdown = "[HIGH] This is a high confidence finding.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("bg-green-100");
			expect(result).toContain("text-green-800");
			expect(result).toContain(">HIGH</span>");
		});

		test("should render [MEDIUM] with yellow styling", () => {
			const markdown = "[MEDIUM] This is a medium confidence finding.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("bg-yellow-100");
			expect(result).toContain("text-yellow-800");
			expect(result).toContain(">MEDIUM</span>");
		});

		test("should render [LOW] with red styling", () => {
			const markdown = "[LOW] This is a low confidence finding.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("bg-red-100");
			expect(result).toContain("text-red-800");
			expect(result).toContain(">LOW</span>");
		});

		test("should render confidence indicators in list items", () => {
			const markdown =
				"- [HIGH] Finding one\n- [MEDIUM] Finding two\n- [LOW] Finding three";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("bg-green-100");
			expect(result).toContain("bg-yellow-100");
			expect(result).toContain("bg-red-100");
		});

		test("should render multiple confidence indicators in same paragraph", () => {
			const markdown = "[HIGH] First point. [LOW] Second point.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain(">HIGH</span>");
			expect(result).toContain(">LOW</span>");
		});
	});

	describe("dark mode classes", () => {
		test("should include dark mode classes for paragraphs", () => {
			const markdown = "This is a paragraph.";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("dark:text-gray-300");
		});

		test("should include dark mode classes for headings", () => {
			const markdown = "## Test Heading";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("dark:text-white");
		});

		test("should include dark mode classes for code blocks", () => {
			const markdown = "`inline code`";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("dark:bg-gray-700");
		});

		test("should include dark mode classes for blockquotes", () => {
			const markdown = "> This is a quote";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain("dark:bg-blue-900");
		});
	});

	describe("XSS prevention", () => {
		test("should sanitize script tags", () => {
			const markdown = "<script>alert('xss')</script>";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).not.toContain("<script>");
			expect(result).not.toContain("alert");
		});

		test("should sanitize onclick attributes", () => {
			const markdown = '<a href="#" onclick="alert(\'xss\')">Click</a>';
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).not.toContain("onclick");
		});

		test("should sanitize javascript: URLs", () => {
			const markdown = "[Click](javascript:alert('xss'))";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).not.toContain("javascript:");
		});
	});

	describe("slug generation", () => {
		test("should convert heading to lowercase slug", () => {
			const markdown = "## Test Heading Here";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain('id="test-heading-here"');
		});

		test("should handle special characters in heading", () => {
			const markdown = "## What's New in 2024?";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain('id="whats-new-in-2024"');
		});

		test("should handle multiple spaces in heading", () => {
			const markdown = "## Too   Many   Spaces";
			const result = renderMarkdownReportContent(markdown, {
				includeToc: false,
			});

			expect(result).toContain('id="too-many-spaces"');
		});
	});
});
