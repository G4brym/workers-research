import { z } from "zod";

// ============================================
// Application Configuration
// ============================================

export const config = {
	// Pagination
	pagination: {
		defaultPageSize: 5,
		maxPageSize: 50,
	},

	// Research parameters
	research: {
		defaultDepth: 3,
		defaultBreadth: 3,
		maxDepth: 10,
		maxBreadth: 10,
		minDepth: 1,
		minBreadth: 1,
		maxQuestions: 5,
		maxQueryLength: 5000,
		maxInitialLearningsLength: 50000,
	},

	// Web search
	webSearch: {
		resultsLimit: 5,
		pageTimeoutMs: 20000,
		maxConcurrentRequests: 5,
	},

	// Polling intervals (ms)
	polling: {
		researchList: 10000,
		researchDetails: 5000,
	},

	// Status codes
	status: {
		processing: 1,
		completed: 2,
		failed: 3,
	} as const,
};

// ============================================
// Input Validation Schemas
// ============================================

export const createResearchSchema = z.object({
	query: z
		.string()
		.min(1, "Query is required")
		.max(config.research.maxQueryLength, "Query is too long")
		.transform((val) => val.trim()),
	depth: z.coerce
		.number()
		.int()
		.min(config.research.minDepth)
		.max(config.research.maxDepth)
		.default(config.research.defaultDepth),
	breadth: z.coerce
		.number()
		.int()
		.min(config.research.minBreadth)
		.max(config.research.maxBreadth)
		.default(config.research.defaultBreadth),
	questions: z.array(z.string().max(1000)).max(config.research.maxQuestions),
	answers: z.array(z.string().max(5000)).max(config.research.maxQuestions),
	initialLearnings: z
		.string()
		.max(config.research.maxInitialLearningsLength)
		.optional()
		.transform((val) => val?.trim() || ""),
	browse_internet: z.boolean().default(true),
	autorag_id: z.string().nullable().optional(),
});

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	partial: z
		.string()
		.optional()
		.transform((val) => val === "true"),
});

export const idParamSchema = z.object({
	id: z.string().uuid("Invalid research ID"),
});

export const questionsSchema = z.object({
	query: z
		.string()
		.min(1, "Query is required")
		.max(config.research.maxQueryLength)
		.transform((val) => val.trim()),
});

// ============================================
// Type exports from schemas
// ============================================

export type CreateResearchInput = z.infer<typeof createResearchSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type QuestionsInput = z.infer<typeof questionsSchema>;

// ============================================
// Environment validation
// ============================================

export function validateEnvSecrets(env: {
	GOOGLE_API_KEY?: string;
	AI_GATEWAY_ACCOUNT_ID?: string;
	AI_GATEWAY_NAME?: string;
	AI_GATEWAY_API_KEY?: string;
}): { valid: boolean; missing: string[] } {
	const required = ["GOOGLE_API_KEY"];
	const missing: string[] = [];

	for (const key of required) {
		if (!env[key as keyof typeof env]) {
			missing.push(key);
		}
	}

	return {
		valid: missing.length === 0,
		missing,
	};
}

// ============================================
// CSRF Token utilities
// ============================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "__csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_FORM_FIELD = "_csrf";

export async function generateCsrfToken(): Promise<string> {
	const buffer = new Uint8Array(CSRF_TOKEN_LENGTH);
	crypto.getRandomValues(buffer);
	return Array.from(buffer)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export function getCsrfCookieName(): string {
	return CSRF_COOKIE_NAME;
}

export function getCsrfHeaderName(): string {
	return CSRF_HEADER_NAME;
}

export function getCsrfFormField(): string {
	return CSRF_FORM_FIELD;
}

// ============================================
// Input sanitization helpers
// ============================================

export function sanitizeString(input: string): string {
	// Remove control characters using character code filtering
	let result = "";
	for (const char of input) {
		const code = char.charCodeAt(0);
		// Skip control characters: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
		if (
			(code >= 0x00 && code <= 0x08) ||
			code === 0x0b ||
			code === 0x0c ||
			(code >= 0x0e && code <= 0x1f) ||
			code === 0x7f
		) {
			continue;
		}
		result += char;
	}
	return result.trim();
}

export function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
}
