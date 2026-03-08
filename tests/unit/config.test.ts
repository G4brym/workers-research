import { describe, expect, test } from "vitest";
import {
	config,
	createResearchSchema,
	escapeHtml,
	generateCsrfToken,
	getCsrfCookieName,
	getCsrfFormField,
	getCsrfHeaderName,
	idParamSchema,
	paginationSchema,
	questionsSchema,
	sanitizeString,
	validateEnvSecrets,
} from "../../src/config";

describe("config constants", () => {
	test("should have pagination defaults", () => {
		expect(config.pagination.defaultPageSize).toBe(5);
		expect(config.pagination.maxPageSize).toBe(50);
	});

	test("should have research parameter limits", () => {
		expect(config.research.defaultDepth).toBe(3);
		expect(config.research.defaultBreadth).toBe(3);
		expect(config.research.maxDepth).toBe(10);
		expect(config.research.maxBreadth).toBe(10);
		expect(config.research.minDepth).toBe(1);
		expect(config.research.minBreadth).toBe(1);
	});

	test("should have status codes", () => {
		expect(config.status.processing).toBe(1);
		expect(config.status.completed).toBe(2);
		expect(config.status.failed).toBe(3);
	});
});

describe("createResearchSchema", () => {
	test("should validate valid input", () => {
		const input = {
			query: "Test research query",
			depth: 3,
			breadth: 3,
			questions: ["Q1", "Q2"],
			answers: ["A1", "A2"],
			browse_internet: true,
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	test("should reject empty query", () => {
		const input = {
			query: "",
			depth: 3,
			breadth: 3,
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	test("should trim query whitespace", () => {
		const input = {
			query: "  test query  ",
			depth: 3,
			breadth: 3,
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.query).toBe("test query");
		}
	});

	test("should reject depth below minimum", () => {
		const input = {
			query: "test",
			depth: 0,
			breadth: 3,
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	test("should reject depth above maximum", () => {
		const input = {
			query: "test",
			depth: 11,
			breadth: 3,
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	test("should reject breadth below minimum", () => {
		const input = {
			query: "test",
			depth: 3,
			breadth: 0,
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	test("should reject breadth above maximum", () => {
		const input = {
			query: "test",
			depth: 3,
			breadth: 11,
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	test("should coerce string numbers to integers", () => {
		const input = {
			query: "test",
			depth: "5",
			breadth: "4",
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.depth).toBe(5);
			expect(result.data.breadth).toBe(4);
		}
	});

	test("should use defaults when depth/breadth not provided", () => {
		const input = {
			query: "test",
			questions: [],
			answers: [],
		};
		const result = createResearchSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.depth).toBe(config.research.defaultDepth);
			expect(result.data.breadth).toBe(config.research.defaultBreadth);
		}
	});
});

describe("paginationSchema", () => {
	test("should validate valid page number", () => {
		const result = paginationSchema.safeParse({ page: 5 });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(5);
		}
	});

	test("should coerce string to number", () => {
		const result = paginationSchema.safeParse({ page: "3" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(3);
		}
	});

	test("should default to page 1", () => {
		const result = paginationSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(1);
		}
	});

	test("should reject page below 1", () => {
		const result = paginationSchema.safeParse({ page: 0 });
		expect(result.success).toBe(false);
	});

	test("should transform partial string to boolean", () => {
		const result = paginationSchema.safeParse({ partial: "true" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.partial).toBe(true);
		}
	});

	test("should transform non-true partial to false", () => {
		const result = paginationSchema.safeParse({ partial: "false" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.partial).toBe(false);
		}
	});
});

describe("idParamSchema", () => {
	test("should validate valid UUID", () => {
		const result = idParamSchema.safeParse({
			id: "550e8400-e29b-41d4-a716-446655440000",
		});
		expect(result.success).toBe(true);
	});

	test("should reject invalid UUID", () => {
		const result = idParamSchema.safeParse({ id: "not-a-uuid" });
		expect(result.success).toBe(false);
	});

	test("should reject empty string", () => {
		const result = idParamSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});
});

describe("questionsSchema", () => {
	test("should validate valid query", () => {
		const result = questionsSchema.safeParse({ query: "Test query" });
		expect(result.success).toBe(true);
	});

	test("should reject empty query", () => {
		const result = questionsSchema.safeParse({ query: "" });
		expect(result.success).toBe(false);
	});

	test("should trim query", () => {
		const result = questionsSchema.safeParse({ query: "  test  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.query).toBe("test");
		}
	});
});

describe("validateEnvSecrets", () => {
	test("should return valid when GOOGLE_API_KEY is present", () => {
		const result = validateEnvSecrets({ GOOGLE_API_KEY: "test-key" });
		expect(result.valid).toBe(true);
		expect(result.missing).toEqual([]);
	});

	test("should return invalid when GOOGLE_API_KEY is missing", () => {
		const result = validateEnvSecrets({});
		expect(result.valid).toBe(false);
		expect(result.missing).toContain("GOOGLE_API_KEY");
	});

	test("should return invalid when GOOGLE_API_KEY is empty", () => {
		const result = validateEnvSecrets({ GOOGLE_API_KEY: "" });
		expect(result.valid).toBe(false);
		expect(result.missing).toContain("GOOGLE_API_KEY");
	});
});

describe("CSRF utilities", () => {
	test("generateCsrfToken should return 64 character hex string", async () => {
		const token = await generateCsrfToken();
		expect(token).toMatch(/^[0-9a-f]{64}$/);
	});

	test("generateCsrfToken should generate unique tokens", async () => {
		const token1 = await generateCsrfToken();
		const token2 = await generateCsrfToken();
		expect(token1).not.toBe(token2);
	});

	test("getCsrfCookieName should return correct name", () => {
		expect(getCsrfCookieName()).toBe("__csrf");
	});

	test("getCsrfHeaderName should return correct name", () => {
		expect(getCsrfHeaderName()).toBe("x-csrf-token");
	});

	test("getCsrfFormField should return correct name", () => {
		expect(getCsrfFormField()).toBe("_csrf");
	});
});

describe("sanitizeString", () => {
	test("should remove null bytes", () => {
		const result = sanitizeString("test\x00string");
		expect(result).toBe("teststring");
	});

	test("should remove control characters", () => {
		const result = sanitizeString("test\x01\x02\x03string");
		expect(result).toBe("teststring");
	});

	test("should preserve newlines and tabs", () => {
		const result = sanitizeString("line1\nline2\tindented");
		expect(result).toBe("line1\nline2\tindented");
	});

	test("should trim whitespace", () => {
		const result = sanitizeString("  test  ");
		expect(result).toBe("test");
	});

	test("should handle empty string", () => {
		const result = sanitizeString("");
		expect(result).toBe("");
	});
});

describe("escapeHtml", () => {
	test("should escape ampersand", () => {
		expect(escapeHtml("test & test")).toBe("test &amp; test");
	});

	test("should escape less than", () => {
		expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
	});

	test("should escape greater than", () => {
		expect(escapeHtml("a > b")).toBe("a &gt; b");
	});

	test("should escape double quotes", () => {
		expect(escapeHtml('test "quoted"')).toBe("test &quot;quoted&quot;");
	});

	test("should escape single quotes", () => {
		expect(escapeHtml("test 'quoted'")).toBe("test &#039;quoted&#039;");
	});

	test("should escape all special characters together", () => {
		expect(escapeHtml('<a href="test">a & b</a>')).toBe(
			"&lt;a href=&quot;test&quot;&gt;a &amp; b&lt;/a&gt;",
		);
	});

	test("should handle empty string", () => {
		expect(escapeHtml("")).toBe("");
	});

	test("should not modify safe strings", () => {
		expect(escapeHtml("safe string")).toBe("safe string");
	});
});
