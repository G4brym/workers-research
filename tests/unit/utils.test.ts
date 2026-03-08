import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { formatDuration, timeAgo } from "../../src/utils";

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
