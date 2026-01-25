// ============================================
// R2 Storage for Large Reports
// ============================================

// Reports larger than this size (in bytes) will be stored in R2
// 512KB threshold - D1 can handle this, but R2 is better for large content
export const LARGE_REPORT_THRESHOLD = 512 * 1024;

/**
 * Check if a report should be stored in R2
 */
export function shouldStoreInR2(content: string): boolean {
	return new Blob([content]).size > LARGE_REPORT_THRESHOLD;
}

/**
 * Generate R2 key for a research report
 */
export function getReportR2Key(researchId: string): string {
	return `reports/${researchId}.md`;
}

/**
 * Store a large report in R2
 */
export async function storeReportInR2(
	bucket: R2Bucket | undefined,
	researchId: string,
	content: string,
): Promise<boolean> {
	if (!bucket) return false;

	try {
		const key = getReportR2Key(researchId);
		await bucket.put(key, content, {
			httpMetadata: {
				contentType: "text/markdown",
			},
			customMetadata: {
				researchId,
				storedAt: new Date().toISOString(),
			},
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Retrieve a report from R2
 */
export async function getReportFromR2(
	bucket: R2Bucket | undefined,
	researchId: string,
): Promise<string | null> {
	if (!bucket) return null;

	try {
		const key = getReportR2Key(researchId);
		const object = await bucket.get(key);
		if (!object) return null;
		return await object.text();
	} catch {
		return null;
	}
}

/**
 * Delete a report from R2
 */
export async function deleteReportFromR2(
	bucket: R2Bucket | undefined,
	researchId: string,
): Promise<boolean> {
	if (!bucket) return false;

	try {
		const key = getReportR2Key(researchId);
		await bucket.delete(key);
		return true;
	} catch {
		return false;
	}
}

/**
 * Store report with automatic R2 offloading
 * Returns the content to store in D1 - either the full report or a reference
 */
export async function storeReportWithR2Fallback(
	bucket: R2Bucket | undefined,
	researchId: string,
	content: string,
): Promise<{ dbContent: string; storedInR2: boolean }> {
	if (!bucket || !shouldStoreInR2(content)) {
		return { dbContent: content, storedInR2: false };
	}

	const stored = await storeReportInR2(bucket, researchId, content);
	if (stored) {
		// Store a reference in D1 instead of the full content
		return {
			dbContent: `[R2:${getReportR2Key(researchId)}]`,
			storedInR2: true,
		};
	}

	// Fall back to storing in D1 if R2 fails
	return { dbContent: content, storedInR2: false };
}

/**
 * Retrieve report with R2 resolution
 * Handles both direct content and R2 references
 */
export async function getReportWithR2Resolution(
	bucket: R2Bucket | undefined,
	researchId: string,
	dbContent: string | null | undefined,
): Promise<string | null> {
	if (!dbContent) return null;

	// Check if content is an R2 reference
	const r2Match = dbContent.match(/^\[R2:(.+)\]$/);
	if (r2Match && bucket) {
		const r2Content = await getReportFromR2(bucket, researchId);
		if (r2Content) return r2Content;
		// Fall back to the reference if R2 retrieval fails
		return dbContent;
	}

	return dbContent;
}
