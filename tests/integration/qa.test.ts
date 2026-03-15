import { env } from "cloudflare:test";
import { generateText } from "ai";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { D1QB } from "workers-qb";
import { app } from "../../src/index";
import { migrations } from "../../src/migrations";
import { getFallbackModel, getModel } from "../../src/utils";

// Mock the 'ai' module
vi.mock("ai", () => ({
	generateObject: vi.fn(),
	generateText: vi.fn(),
}));

// Mock utils — keep real implementations for isRateLimitError, buildSearchFilters, etc.
vi.mock("../../src/utils", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../src/utils")>();
	return {
		...actual,
		getModel: vi.fn(),
		getFallbackModel: vi.fn(),
		getModelThinking: vi.fn(),
		sleep: vi.fn().mockResolvedValue(undefined),
	};
});

// Mock webSearch to avoid node-html-markdown incompatibility with workerd
vi.mock("../../src/webSearch", () => ({
	getBrowser: vi.fn(),
	webSearch: vi.fn(),
}));

const testEnv = {
	...env,
	GOOGLE_API_KEY: "test-api-key",
};

const CSRF_TOKEN = "test-csrf-token-qa-tests";
const CSRF_COOKIE = `__csrf=${CSRF_TOKEN}`;

async function makeAskRequest(
	researchId: string,
	question: string,
): Promise<Response> {
	const formData = new FormData();
	formData.append("question", question);
	return app.request(
		`/details/${researchId}/ask`,
		{
			method: "POST",
			headers: {
				Cookie: CSRF_COOKIE,
				"x-csrf-token": CSRF_TOKEN,
			},
			body: formData,
		},
		testEnv,
	);
}

async function insertResearch(
	id: string,
	status: number,
	result: string | null = null,
): Promise<void> {
	await env.DB.prepare(
		`INSERT INTO researches (id, query, depth, breadth, questions, status, result, user)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(id, "Test topic", "3", "3", "[]", status, result, "test-user")
		.run();
}

describe("POST /details/:id/ask", () => {
	beforeAll(async () => {
		const qb = new D1QB(env.DB);
		await qb.migrations({ migrations, tableName: "d1_migrations" }).apply();
	});

	beforeEach(() => {
		vi.resetAllMocks();
		(getModel as ReturnType<typeof vi.fn>).mockReturnValue({
			id: "test-model",
		});
		(getFallbackModel as ReturnType<typeof vi.fn>).mockReturnValue({
			id: "test-fallback-model",
		});
		(generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
			text: "Test answer",
		});
	});

	test("returns 404 for unknown research id", async () => {
		const resp = await makeAskRequest("nonexistent-qa-research", "What is this?");
		expect(resp.status).toBe(404);
	});

	test("returns 400 for empty question", async () => {
		const resp = await makeAskRequest("any-qa-id", "");
		expect(resp.status).toBe(400);
		const body = await resp.text();
		expect(body).toContain("Question is required");
	});

	test("returns 400 for in-progress research (status=1)", async () => {
		await insertResearch("qa-in-progress-research", 1, "some report content");
		const resp = await makeAskRequest(
			"qa-in-progress-research",
			"What is this?",
		);
		expect(resp.status).toBe(400);
		const body = await resp.text();
		expect(body).toContain("not yet complete");
	});

	test("returns 200 HTML fragment and persists Q&A to D1 for completed research", async () => {
		await insertResearch(
			"qa-completed-research",
			2,
			"This is the full report about AI trends.",
		);
		const resp = await makeAskRequest(
			"qa-completed-research",
			"What does the report say?",
		);

		expect(resp.status).toBe(200);
		const html = await resp.text();
		expect(html).toContain("What does the report say?");
		expect(html).toContain("Test answer");

		const row = await env.DB.prepare(
			"SELECT * FROM research_questions WHERE research_id = ?",
		)
			.bind("qa-completed-research")
			.first<{ question: string; answer: string }>();
		expect(row).not.toBeNull();
		expect(row?.question).toBe("What does the report say?");
		expect(row?.answer).toBe("Test answer");
	});

	test("returns 429 when per-research question limit (50) is reached", async () => {
		const researchId = "qa-limit-research";
		await insertResearch(researchId, 2, "Report content for limit test.");

		// Insert 50 questions directly to reach the cap
		for (let i = 0; i < 50; i++) {
			await env.DB.prepare(
				`INSERT INTO research_questions (id, research_id, question, answer)
         VALUES (?, ?, ?, ?)`,
			)
				.bind(`qa-limit-q-${i}`, researchId, `Question ${i}`, `Answer ${i}`)
				.run();
		}

		const resp = await makeAskRequest(researchId, "One more question?");
		expect(resp.status).toBe(429);
		const body = await resp.text();
		expect(body).toContain("Maximum 50 questions");
	});
});
