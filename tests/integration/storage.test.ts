import { env } from "cloudflare:test";
import { describe, expect, test } from "vitest";
import {
	deleteReportFromR2,
	getReportFromR2,
	getReportR2Key,
	getReportWithR2Resolution,
	LARGE_REPORT_THRESHOLD,
	shouldStoreInR2,
	storeReportInR2,
	storeReportWithR2Fallback,
} from "../../src/storage";

describe("LARGE_REPORT_THRESHOLD", () => {
	test("should be 512KB", () => {
		expect(LARGE_REPORT_THRESHOLD).toBe(512 * 1024);
	});
});

describe("shouldStoreInR2", () => {
	test("should return false for small content", () => {
		const smallContent = "a".repeat(100);
		expect(shouldStoreInR2(smallContent)).toBe(false);
	});

	test("should return false for content at threshold", () => {
		const atThreshold = "a".repeat(LARGE_REPORT_THRESHOLD);
		expect(shouldStoreInR2(atThreshold)).toBe(false);
	});

	test("should return true for content above threshold", () => {
		const largeContent = "a".repeat(LARGE_REPORT_THRESHOLD + 1);
		expect(shouldStoreInR2(largeContent)).toBe(true);
	});

	test("should handle empty string", () => {
		expect(shouldStoreInR2("")).toBe(false);
	});
});

describe("getReportR2Key", () => {
	test("should generate correct key format", () => {
		const key = getReportR2Key("abc-123");
		expect(key).toBe("reports/abc-123.md");
	});

	test("should handle UUID-style IDs", () => {
		const key = getReportR2Key("550e8400-e29b-41d4-a716-446655440000");
		expect(key).toBe("reports/550e8400-e29b-41d4-a716-446655440000.md");
	});
});

describe("storeReportInR2", () => {
	test("should return false when bucket is undefined", async () => {
		const result = await storeReportInR2(undefined, "id", "content");
		expect(result).toBe(false);
	});

	test("should store content in bucket and return true", async () => {
		const result = await storeReportInR2(
			env.REPORTS_BUCKET,
			"store-test-id",
			"# Report",
		);
		expect(result).toBe(true);

		// Verify the content was actually stored
		const retrieved = await getReportFromR2(
			env.REPORTS_BUCKET,
			"store-test-id",
		);
		expect(retrieved).toBe("# Report");
	});
});

describe("getReportFromR2", () => {
	test("should return null when bucket is undefined", async () => {
		const result = await getReportFromR2(undefined, "test-id");
		expect(result).toBeNull();
	});

	test("should return null when object not found", async () => {
		const result = await getReportFromR2(
			env.REPORTS_BUCKET,
			"nonexistent-id",
		);
		expect(result).toBeNull();
	});

	test("should return content when found", async () => {
		// Store first
		await storeReportInR2(
			env.REPORTS_BUCKET,
			"get-test-id",
			"# Report Content",
		);

		const result = await getReportFromR2(
			env.REPORTS_BUCKET,
			"get-test-id",
		);
		expect(result).toBe("# Report Content");
	});
});

describe("deleteReportFromR2", () => {
	test("should return false when bucket is undefined", async () => {
		const result = await deleteReportFromR2(undefined, "test-id");
		expect(result).toBe(false);
	});

	test("should delete from bucket and return true", async () => {
		// Store first
		await storeReportInR2(
			env.REPORTS_BUCKET,
			"delete-test-id",
			"# To Delete",
		);

		const result = await deleteReportFromR2(
			env.REPORTS_BUCKET,
			"delete-test-id",
		);
		expect(result).toBe(true);

		// Verify it was deleted
		const retrieved = await getReportFromR2(
			env.REPORTS_BUCKET,
			"delete-test-id",
		);
		expect(retrieved).toBeNull();
	});
});

describe("storeReportWithR2Fallback", () => {
	test("should store in D1 when bucket is undefined", async () => {
		const content = "Small report";
		const result = await storeReportWithR2Fallback(undefined, "id", content);

		expect(result).toEqual({
			dbContent: content,
			storedInR2: false,
		});
	});

	test("should store in D1 when content is small", async () => {
		const content = "Small report";
		const result = await storeReportWithR2Fallback(
			env.REPORTS_BUCKET,
			"small-id",
			content,
		);

		expect(result).toEqual({
			dbContent: content,
			storedInR2: false,
		});
	});

	test("should store in R2 when content is large", async () => {
		const content = "a".repeat(LARGE_REPORT_THRESHOLD + 1);
		const result = await storeReportWithR2Fallback(
			env.REPORTS_BUCKET,
			"large-test-id",
			content,
		);

		expect(result).toEqual({
			dbContent: "[R2:reports/large-test-id.md]",
			storedInR2: true,
		});

		// Verify the content was actually stored in R2
		const retrieved = await getReportFromR2(
			env.REPORTS_BUCKET,
			"large-test-id",
		);
		expect(retrieved).toBe(content);
	});
});

describe("getReportWithR2Resolution", () => {
	test("should return null when dbContent is null", async () => {
		const result = await getReportWithR2Resolution(undefined, "id", null);
		expect(result).toBeNull();
	});

	test("should return null when dbContent is undefined", async () => {
		const result = await getReportWithR2Resolution(
			undefined,
			"id",
			undefined,
		);
		expect(result).toBeNull();
	});

	test("should return content directly when not an R2 reference", async () => {
		const content = "# Regular Report";
		const result = await getReportWithR2Resolution(undefined, "id", content);
		expect(result).toBe(content);
	});

	test("should resolve R2 reference when bucket is available", async () => {
		// Store content in R2 first
		await storeReportInR2(
			env.REPORTS_BUCKET,
			"resolve-test-id",
			"# R2 Report",
		);

		const result = await getReportWithR2Resolution(
			env.REPORTS_BUCKET,
			"resolve-test-id",
			"[R2:reports/resolve-test-id.md]",
		);
		expect(result).toBe("# R2 Report");
	});

	test("should return reference string when bucket is undefined", async () => {
		const reference = "[R2:reports/test-id.md]";
		const result = await getReportWithR2Resolution(
			undefined,
			"test-id",
			reference,
		);
		expect(result).toBe(reference);
	});

	test("should return reference string when R2 retrieval fails", async () => {
		// Don't store anything, so get returns null
		const reference = "[R2:reports/missing-id.md]";
		const result = await getReportWithR2Resolution(
			env.REPORTS_BUCKET,
			"missing-id",
			reference,
		);
		expect(result).toBe(reference);
	});
});
