import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	buildSearchFilters,
	formatDuration,
	normalizeDomain,
	safeJsonParse,
	timeAgo,
} from "../../src/utils";

describe("timeAgo", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("should return seconds for < 60 seconds", () => {
		const date = new Date("2025-06-15T11:59:30Z"); // 30 seconds ago
		expect(timeAgo(date)).toBe("30 seconds ago");
	});

	test("should return singular second", () => {
		const date = new Date("2025-06-15T11:59:59Z"); // 1 second ago
		expect(timeAgo(date)).toBe("1 second ago");
	});

	test("should return minutes for >= 60 seconds", () => {
		const date = new Date("2025-06-15T11:58:30Z"); // 90 seconds ago
		expect(timeAgo(date)).toBe("1 minute ago");
	});

	test("should return minutes for several minutes", () => {
		const date = new Date("2025-06-15T11:45:00Z"); // 15 minutes ago
		expect(timeAgo(date)).toBe("15 minutes ago");
	});

	test("should return hours for >= 60 minutes", () => {
		const date = new Date("2025-06-15T09:30:00Z"); // 2.5 hours ago
		expect(timeAgo(date)).toBe("2 hours ago");
	});

	test("should return singular hour", () => {
		const date = new Date("2025-06-15T10:30:00Z"); // 1.5 hours ago
		expect(timeAgo(date)).toBe("1 hour ago");
	});

	test("should return days for >= 24 hours", () => {
		const date = new Date("2025-06-12T12:00:00Z"); // 3 days ago
		expect(timeAgo(date)).toBe("3 days ago");
	});

	test("should return weeks for >= 7 days", () => {
		const date = new Date("2025-05-25T12:00:00Z"); // 21 days = 3 weeks ago
		expect(timeAgo(date)).toBe("3 weeks ago");
	});

	test("should return months for >= 4.35 weeks", () => {
		const date = new Date("2025-03-15T12:00:00Z"); // ~3 months ago
		expect(timeAgo(date)).toBe("3 months ago");
	});

	test("should return years for >= 12 months", () => {
		const date = new Date("2023-06-15T12:00:00Z"); // 2 years ago
		expect(timeAgo(date)).toBe("2 years ago");
	});

	test("should return 0 seconds for same time", () => {
		const date = new Date("2025-06-15T12:00:00Z");
		expect(timeAgo(date)).toBe("0 seconds ago");
	});
});

describe("normalizeDomain", () => {
	test("should return plain domain as-is", () => {
		expect(normalizeDomain("reddit.com")).toBe("reddit.com");
	});

	test("should lowercase domain", () => {
		expect(normalizeDomain("Reddit.COM")).toBe("reddit.com");
	});

	test("should trim whitespace", () => {
		expect(normalizeDomain("  reddit.com  ")).toBe("reddit.com");
	});

	test("should extract hostname from https URL", () => {
		expect(normalizeDomain("https://reddit.com")).toBe("reddit.com");
	});

	test("should extract hostname from http URL", () => {
		expect(normalizeDomain("http://reddit.com")).toBe("reddit.com");
	});

	test("should strip path from URL", () => {
		expect(normalizeDomain("https://reddit.com/r/programming")).toBe(
			"reddit.com",
		);
	});

	test("should strip query string from URL", () => {
		expect(normalizeDomain("https://reddit.com?ref=home")).toBe("reddit.com");
	});

	test("should strip www. prefix from plain domain", () => {
		expect(normalizeDomain("www.reddit.com")).toBe("reddit.com");
	});

	test("should strip www. prefix from URL", () => {
		expect(normalizeDomain("https://www.reddit.com")).toBe("reddit.com");
	});

	test("should handle combined URL with www and path", () => {
		expect(normalizeDomain("https://www.reddit.com/r/foo")).toBe("reddit.com");
	});

	test("should return empty string for empty input", () => {
		expect(normalizeDomain("")).toBe("");
	});

	test("should return empty string for whitespace-only input", () => {
		expect(normalizeDomain("   ")).toBe("");
	});

	test("should strip path from plain domain input", () => {
		expect(normalizeDomain("reddit.com/r/programming")).toBe("reddit.com");
	});

	test("should handle subdomain without stripping", () => {
		expect(normalizeDomain("old.reddit.com")).toBe("old.reddit.com");
	});

	test("should handle malformed URL gracefully", () => {
		expect(normalizeDomain("https://")).toBe("");
	});
});

describe("buildSearchFilters", () => {
	test("should return empty conditions and params when no filters provided", () => {
		const result = buildSearchFilters();
		expect(result.conditions).toEqual([]);
		expect(result.params).toEqual([]);
	});

	test("should return empty conditions for empty query string", () => {
		const result = buildSearchFilters("", undefined);
		expect(result.conditions).toEqual([]);
		expect(result.params).toEqual([]);
	});

	test("should return empty conditions for whitespace-only query", () => {
		const result = buildSearchFilters("   ", undefined);
		expect(result.conditions).toEqual([]);
		expect(result.params).toEqual([]);
	});

	test("should build parameterized LIKE condition for search query", () => {
		const result = buildSearchFilters("test search", undefined);
		expect(result.conditions).toEqual(["(title LIKE ? OR query LIKE ?)"]);
		expect(result.params).toEqual(["%test search%", "%test search%"]);
	});

	test("should trim search query whitespace", () => {
		const result = buildSearchFilters("  hello  ", undefined);
		expect(result.conditions).toEqual(["(title LIKE ? OR query LIKE ?)"]);
		expect(result.params).toEqual(["%hello%", "%hello%"]);
	});

	test("should build parameterized status condition for valid status", () => {
		const result = buildSearchFilters(undefined, "1");
		expect(result.conditions).toEqual(["status = ?"]);
		expect(result.params).toEqual([1]);
	});

	test("should accept all valid status values (1, 2, 3)", () => {
		for (const s of ["1", "2", "3"]) {
			const result = buildSearchFilters(undefined, s);
			expect(result.conditions).toEqual(["status = ?"]);
			expect(result.params).toEqual([Number.parseInt(s, 10)]);
		}
	});

	test("should ignore invalid status values", () => {
		const result = buildSearchFilters(undefined, "4");
		expect(result.conditions).toEqual([]);
		expect(result.params).toEqual([]);
	});

	test("should ignore SQL injection attempts in status parameter", () => {
		const result = buildSearchFilters(undefined, "1 OR 1=1");
		expect(result.conditions).toEqual([]);
		expect(result.params).toEqual([]);
	});

	test("should combine search and status filters", () => {
		const result = buildSearchFilters("test", "2");
		expect(result.conditions).toEqual([
			"(title LIKE ? OR query LIKE ?)",
			"status = ?",
		]);
		expect(result.params).toEqual(["%test%", "%test%", 2]);
	});

	test("should safely parameterize SQL injection attempts in search query", () => {
		const result = buildSearchFilters(
			"'; DROP TABLE researches; --",
			undefined,
		);
		expect(result.conditions).toEqual(["(title LIKE ? OR query LIKE ?)"]);
		// Malicious input is safely passed as a parameter, never interpolated into SQL
		expect(result.params).toEqual([
			"%'; DROP TABLE researches; --%",
			"%'; DROP TABLE researches; --%",
		]);
		// Conditions should never contain the raw search term
		expect(result.conditions[0]).not.toContain("DROP TABLE");
	});

	test("should handle special SQL characters in search query as parameters", () => {
		const result = buildSearchFilters("100% complete", undefined);
		expect(result.params).toEqual(["%100% complete%", "%100% complete%"]);
	});
});

describe("formatDuration", () => {
	test("should return 0.0 seconds for zero", () => {
		expect(formatDuration(0)).toBe("0.0 seconds");
	});

	test("should return 0.0 seconds for negative values", () => {
		expect(formatDuration(-1000)).toBe("0.0 seconds");
	});

	test("should format seconds", () => {
		expect(formatDuration(5000)).toBe("5.0 seconds");
	});

	test("should format fractional seconds", () => {
		expect(formatDuration(1500)).toBe("1.5 seconds");
	});

	test("should format minutes", () => {
		expect(formatDuration(120000)).toBe("2.0 minutes");
	});

	test("should format fractional minutes", () => {
		expect(formatDuration(90000)).toBe("1.5 minutes");
	});

	test("should format hours", () => {
		expect(formatDuration(7200000)).toBe("2.0 hours");
	});

	test("should format fractional hours", () => {
		expect(formatDuration(5400000)).toBe("1.5 hours");
	});

	test("should format days", () => {
		expect(formatDuration(172800000)).toBe("2.0 days");
	});

	test("should format fractional days", () => {
		expect(formatDuration(129600000)).toBe("1.5 days");
	});
});

describe("safeJsonParse", () => {
	test("should parse valid JSON", () => {
		expect(safeJsonParse('{"a": 1}', {})).toEqual({ a: 1 });
	});

	test("should parse valid JSON array", () => {
		expect(safeJsonParse("[1, 2, 3]", [])).toEqual([1, 2, 3]);
	});

	test("should parse valid JSON string", () => {
		expect(safeJsonParse('"hello"', "")).toBe("hello");
	});

	test("should return fallback for invalid JSON", () => {
		expect(safeJsonParse("{invalid", [])).toEqual([]);
	});

	test("should return fallback for empty string", () => {
		expect(safeJsonParse("", "default")).toBe("default");
	});

	test("should return fallback for null", () => {
		expect(safeJsonParse(null, [])).toEqual([]);
	});

	test("should return fallback for undefined", () => {
		expect(safeJsonParse(undefined, [])).toEqual([]);
	});

	test("should return fallback for truncated JSON", () => {
		expect(safeJsonParse('{"key": "val', {})).toEqual({});
	});

	test("should parse questions array format used by the app", () => {
		const json = JSON.stringify([{ question: "Q1", answer: "A1" }]);
		const result = safeJsonParse(json, []);
		expect(result).toEqual([{ question: "Q1", answer: "A1" }]);
	});

	test("should parse string array format used for source_urls", () => {
		const json = JSON.stringify(["https://example.com", "https://test.com"]);
		const result = safeJsonParse(json, undefined);
		expect(result).toEqual(["https://example.com", "https://test.com"]);
	});
});
