import { describe, expect, test, vi } from "vitest";
import {
	LARGE_REPORT_THRESHOLD,
	deleteReportFromR2,
	getReportFromR2,
	getReportR2Key,
	getReportWithR2Resolution,
	shouldStoreInR2,
	storeReportInR2,
	storeReportWithR2Fallback,
} from "./storage";

// Mock R2Bucket
function createMockR2Bucket() {
	const store = new Map<string, { body: string; metadata?: object }>();
	return {
		put: vi.fn(
			async (
				key: string,
				body: string,
				options?: { customMetadata?: object },
			) => {
				store.set(key, { body, metadata: options?.customMetadata });
			},
		),
		get: vi.fn(async (key: string) => {
			const item = store.get(key);
			if (!item) return null;
			return {
				text: async () => item.body,
				body: item.body,
			};
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		_store: store,
	} as unknown as R2Bucket & { _store: Map<string, { body: string }> };
}

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

	test("should store content in bucket", async () => {
		const mockBucket = createMockR2Bucket();
		const result = await storeReportInR2(mockBucket, "test-id", "# Report");

		expect(result).toBe(true);
		expect(mockBucket.put).toHaveBeenCalledWith(
			"reports/test-id.md",
			"# Report",
			expect.objectContaining({
				httpMetadata: { contentType: "text/markdown" },
			}),
		);
	});

	test("should return false on error", async () => {
		const mockBucket = createMockR2Bucket();
		mockBucket.put = vi.fn().mockRejectedValue(new Error("R2 error"));

		const result = await storeReportInR2(mockBucket, "test-id", "content");
		expect(result).toBe(false);
	});
});

describe("getReportFromR2", () => {
	test("should return null when bucket is undefined", async () => {
		const result = await getReportFromR2(undefined, "test-id");
		expect(result).toBeNull();
	});

	test("should return null when object not found", async () => {
		const mockBucket = createMockR2Bucket();
		const result = await getReportFromR2(mockBucket, "nonexistent-id");
		expect(result).toBeNull();
	});

	test("should return content when found", async () => {
		const mockBucket = createMockR2Bucket();
		mockBucket._store.set("reports/test-id.md", { body: "# Report Content" });

		const result = await getReportFromR2(mockBucket, "test-id");
		expect(result).toBe("# Report Content");
	});

	test("should return null on error", async () => {
		const mockBucket = createMockR2Bucket();
		mockBucket.get = vi.fn().mockRejectedValue(new Error("R2 error"));

		const result = await getReportFromR2(mockBucket, "test-id");
		expect(result).toBeNull();
	});
});

describe("deleteReportFromR2", () => {
	test("should return false when bucket is undefined", async () => {
		const result = await deleteReportFromR2(undefined, "test-id");
		expect(result).toBe(false);
	});

	test("should delete from bucket and return true", async () => {
		const mockBucket = createMockR2Bucket();
		const result = await deleteReportFromR2(mockBucket, "test-id");

		expect(result).toBe(true);
		expect(mockBucket.delete).toHaveBeenCalledWith("reports/test-id.md");
	});

	test("should return false on error", async () => {
		const mockBucket = createMockR2Bucket();
		mockBucket.delete = vi.fn().mockRejectedValue(new Error("R2 error"));

		const result = await deleteReportFromR2(mockBucket, "test-id");
		expect(result).toBe(false);
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
		const mockBucket = createMockR2Bucket();
		const content = "Small report";
		const result = await storeReportWithR2Fallback(mockBucket, "id", content);

		expect(result).toEqual({
			dbContent: content,
			storedInR2: false,
		});
		expect(mockBucket.put).not.toHaveBeenCalled();
	});

	test("should store in R2 when content is large", async () => {
		const mockBucket = createMockR2Bucket();
		const content = "a".repeat(LARGE_REPORT_THRESHOLD + 1);
		const result = await storeReportWithR2Fallback(
			mockBucket,
			"test-id",
			content,
		);

		expect(result).toEqual({
			dbContent: "[R2:reports/test-id.md]",
			storedInR2: true,
		});
		expect(mockBucket.put).toHaveBeenCalled();
	});

	test("should fallback to D1 when R2 fails", async () => {
		const mockBucket = createMockR2Bucket();
		mockBucket.put = vi.fn().mockRejectedValue(new Error("R2 error"));

		const content = "a".repeat(LARGE_REPORT_THRESHOLD + 1);
		const result = await storeReportWithR2Fallback(mockBucket, "id", content);

		expect(result).toEqual({
			dbContent: content,
			storedInR2: false,
		});
	});
});

describe("getReportWithR2Resolution", () => {
	test("should return null when dbContent is null", async () => {
		const result = await getReportWithR2Resolution(undefined, "id", null);
		expect(result).toBeNull();
	});

	test("should return null when dbContent is undefined", async () => {
		const result = await getReportWithR2Resolution(undefined, "id", undefined);
		expect(result).toBeNull();
	});

	test("should return content directly when not an R2 reference", async () => {
		const content = "# Regular Report";
		const result = await getReportWithR2Resolution(undefined, "id", content);
		expect(result).toBe(content);
	});

	test("should resolve R2 reference when bucket is available", async () => {
		const mockBucket = createMockR2Bucket();
		mockBucket._store.set("reports/test-id.md", { body: "# R2 Report" });

		const result = await getReportWithR2Resolution(
			mockBucket,
			"test-id",
			"[R2:reports/test-id.md]",
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
		const mockBucket = createMockR2Bucket();
		// Don't store anything, so get returns null

		const reference = "[R2:reports/test-id.md]";
		const result = await getReportWithR2Resolution(
			mockBucket,
			"test-id",
			reference,
		);
		expect(result).toBe(reference);
	});
});
