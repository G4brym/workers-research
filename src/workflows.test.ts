import { generateObject, generateText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Env } from "./bindings";
import { getFallbackModel, getModel, getModelThinking } from "./utils"; // Adjust path as needed
import {
	deduplicateLearnings,
	generateSerpQueries,
	processSerpResult,
	writeFinalReport,
} from "./workflows"; // Adjust path

// Mock the 'ai' module
vi.mock("ai", () => ({
	generateObject: vi.fn(),
	generateText: vi.fn(),
	// If other exports from 'ai' are needed by the module under test (not directly by tests)
	// they might need to be mocked here as well, e.g. streamText: vi.fn()
	// For now, assuming only generateObject and generateText are relevant for workflows.ts
}));

// Mock the './utils' module
vi.mock("./utils", () => ({
	getModel: vi.fn(),
	getFallbackModel: vi.fn(),
	getModelThinking: vi.fn(),
	// If there are other non-function exports (like constants) from './utils' that are used
	// by workflows.ts, they might need to be explicitly provided here too.
	// Example: SOME_CONSTANT: 'actual_value_if_needed'
	// For now, assuming only these functions are relevant.
}));

const mockEnv = {} as Env; // Mock environment object

describe("processSerpResult with fallback", () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.resetAllMocks();

		// Default mock implementations
		(getModel as vi.Mock).mockReturnValue({ id: "gemini-1.5-flash-test" });
		(getFallbackModel as vi.Mock).mockReturnValue({
			id: "gemini-2.0-flash-test",
		}); // Updated
		(getModelThinking as vi.Mock).mockReturnValue({
			id: "gemini-1.5-flash-test-thinking",
		});

		// Mock RESEARCH_PROMPT as it's called internally
		// Since it's a simple function returning a string, we can just mock it if needed,
		// but usually it's fine unless it has side effects or complex logic.
		// For now, we'll assume its actual implementation is fine for these tests.
	});

	test("should use fallback model on AI_RetryError and succeed", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const mockFallbackModel = { id: "gemini-2.0-flash-test" }; // Updated
		// New schema with confidence levels
		const mockApiResponse = {
			learnings: [
				{ text: "test learning", confidence: "HIGH", sourceIndex: 0 },
			],
			followUpQuestions: ["test q"],
		};
		// Expected result after formatting
		const expectedResult = {
			learnings: ["[HIGH] test learning [Source: test.com]"],
			followUpQuestions: ["test q"],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

		(generateObject as vi.Mock)
			.mockImplementationOnce(async (options) => {
				// console.log('generateObject mock call 1, model:', options.model.id);
				if (options.model.id === mockPrimaryModel.id) {
					const error = new Error("You exceeded your current quota.");
					error.name = "AI_RetryError";
					throw error;
				}
				throw new Error(
					`Unexpected call to primary model mock. Expected ${mockPrimaryModel.id}, got ${options.model.id}`,
				);
			})
			.mockImplementationOnce(async (options) => {
				// console.log('generateObject mock call 2, model:', options.model.id);
				if (options.model.id === mockFallbackModel.id) {
					return { object: mockApiResponse };
				}
				throw new Error(
					`Unexpected call to fallback model mock. Expected ${mockFallbackModel.id}, got ${options.model.id}`,
				);
			});

		const result = await processSerpResult({
			env: mockEnv,
			query: "test query",
			result: ["content"],
			sourceUrls: ["test.com"],
		});

		expect(getModel).toHaveBeenCalledTimes(1);
		expect(getFallbackModel).toHaveBeenCalledTimes(1);
		expect(generateObject).toHaveBeenCalledTimes(2);

		const calls = (generateObject as vi.Mock).mock.calls;
		expect(calls[0][0].model).toEqual(mockPrimaryModel);
		expect(calls[1][0].model).toEqual(mockFallbackModel);

		expect(result).toEqual(expectedResult);
	});

	test("should re-throw error if fallback model also fails with AI_RetryError", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const mockFallbackModel = { id: "gemini-2.0-flash-test" }; // Updated
		const retryError = new Error("You exceeded your current quota again.");
		retryError.name = "AI_RetryError";

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

		(generateObject as vi.Mock)
			.mockImplementationOnce(async (options) => {
				if (options.model.id === mockPrimaryModel.id) {
					const error = new Error("You exceeded your current quota.");
					error.name = "AI_RetryError";
					throw error;
				}
				throw new Error("Unexpected primary model call");
			})
			.mockImplementationOnce(async (options) => {
				if (options.model.id === mockFallbackModel.id) {
					throw retryError;
				}
				throw new Error("Unexpected fallback model call");
			});

		await expect(
			processSerpResult({
				env: mockEnv,
				query: "test query",
				result: ["content"],
				sourceUrls: ["test.com"],
			}),
		).rejects.toThrow(retryError);

		expect(getModel).toHaveBeenCalledTimes(1);
		expect(getFallbackModel).toHaveBeenCalledTimes(1);
		expect(generateObject).toHaveBeenCalledTimes(2);
	});

	test("should not use fallback model for non-rate-limit errors", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const genericError = new Error("Something else went wrong.");

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);

		(generateObject as vi.Mock).mockImplementationOnce(async (options) => {
			if (options.model.id === mockPrimaryModel.id) {
				throw genericError;
			}
			throw new Error("Unexpected model call");
		});

		await expect(
			processSerpResult({
				env: mockEnv,
				query: "test query",
				result: ["content"],
				sourceUrls: ["test.com"],
			}),
		).rejects.toThrow(genericError);

		expect(getModel).toHaveBeenCalledTimes(1);
		expect(getFallbackModel).not.toHaveBeenCalled();
		expect(generateObject).toHaveBeenCalledTimes(1);
	});

	test("should succeed on first try without fallback", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		// New schema with confidence levels
		const mockApiResponse = {
			learnings: [
				{
					text: "successful learning",
					confidence: "MEDIUM",
					sourceIndex: 0,
				},
			],
			followUpQuestions: ["successful q"],
		};
		// Expected result after formatting
		const expectedResult = {
			learnings: ["[MEDIUM] successful learning [Source: test-success.com]"],
			followUpQuestions: ["successful q"],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateObject as vi.Mock).mockImplementationOnce(async (options) => {
			if (options.model.id === mockPrimaryModel.id) {
				return { object: mockApiResponse };
			}
			throw new Error("Unexpected model call");
		});

		const result = await processSerpResult({
			env: mockEnv,
			query: "test query success",
			result: ["success content"],
			sourceUrls: ["test-success.com"],
		});

		expect(getModel).toHaveBeenCalledTimes(1);
		expect(getFallbackModel).not.toHaveBeenCalled();
		expect(generateObject).toHaveBeenCalledTimes(1);
		expect((generateObject as vi.Mock).mock.calls[0][0].model).toEqual(
			mockPrimaryModel,
		);
		expect(result).toEqual(expectedResult);
	});

	// Similar tests could be added for generateSerpQueries and writeFinalReport
	// For generateSerpQueries, the response structure is different (res.object.queries)
	// For writeFinalReport, it uses generateText and res.text
});

// Example structure for generateSerpQueries tests (if needed)
describe("generateSerpQueries with fallback", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		(getModel as vi.Mock).mockReturnValue({ id: "gemini-1.5-flash-test-serp" });
		(getFallbackModel as vi.Mock).mockReturnValue({
			id: "gemini-2.0-flash-test",
		}); // Updated
	});

	test("should use fallback model for generateSerpQueries on AI_RetryError and succeed", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test-serp" };
		const mockFallbackModel = { id: "gemini-2.0-flash-test" }; // Updated
		const mockSuccessResponse = {
			queries: [{ query: "q1", researchGoal: "g1" }],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

		(generateObject as vi.Mock)
			.mockImplementationOnce(async (options) => {
				if (options.model.id === mockPrimaryModel.id) {
					const error = new Error("exceeded your current quota");
					error.name = "AI_RetryError";
					throw error;
				}
				throw new Error("Unexpected primary model call for SERP");
			})
			.mockImplementationOnce(async (options) => {
				if (options.model.id === mockFallbackModel.id) {
					return { object: mockSuccessResponse };
				}
				throw new Error("Unexpected fallback model call for SERP");
			});

		const result = await generateSerpQueries({
			env: mockEnv,
			query: "serp test query",
		});

		expect(getModel).toHaveBeenCalledTimes(1);
		expect(getFallbackModel).toHaveBeenCalledTimes(1);
		expect(generateObject).toHaveBeenCalledTimes(2);
		expect((generateObject as vi.Mock).mock.calls[0][0].model).toEqual(
			mockPrimaryModel,
		);
		expect((generateObject as vi.Mock).mock.calls[1][0].model).toEqual(
			mockFallbackModel,
		);
		expect(result).toEqual(mockSuccessResponse.queries);
	});
});

// Example structure for writeFinalReport tests (if needed)
describe("writeFinalReport with fallback", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		(getModelThinking as vi.Mock).mockReturnValue({
			id: "gemini-1.5-flash-test-report",
		});
		(getFallbackModel as vi.Mock).mockReturnValue({
			id: "gemini-2.0-flash-test",
		}); // Updated
	});

	test("should use fallback model for writeFinalReport on AI_RetryError and succeed", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test-report" };
		const mockFallbackModel = { id: "gemini-2.0-flash-test" }; // Updated
		const mockSuccessText = "This is the final report.";
		// Note: writeFinalReport appends a sources section. We need to account for that.
		const expectedReport = `${mockSuccessText}\n\n\n\n## Sources\n\n- url1.com\n- url2.com`;

		(getModelThinking as vi.Mock).mockReturnValue(mockPrimaryModel);
		(getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

		(generateText as vi.Mock)
			.mockImplementationOnce(async (options) => {
				if (options.model.id === mockPrimaryModel.id) {
					const error = new Error("exceeded your current quota");
					error.name = "AI_RetryError";
					throw error;
				}
				throw new Error("Unexpected primary model call for report");
			})
			.mockImplementationOnce(async (options) => {
				if (options.model.id === mockFallbackModel.id) {
					return {
						text: mockSuccessText,
						toolCalls: [],
						toolResults: [],
						finishReason: "stop",
						usage: { promptTokens: 10, completionTokens: 10 },
						warnings: [],
					};
				}
				throw new Error("Unexpected fallback model call for report");
			});

		const result = await writeFinalReport({
			env: mockEnv,
			prompt: "report test prompt",
			learnings: ["learning 1"],
			visitedUrls: ["url1.com", "url2.com", "url1.com"], // Test deduplication
		});

		expect(getModelThinking).toHaveBeenCalledTimes(1);
		expect(getFallbackModel).toHaveBeenCalledTimes(1); // getFallbackModel is called by writeFinalReport
		expect(generateText).toHaveBeenCalledTimes(2);
		expect((generateText as vi.Mock).mock.calls[0][0].model).toEqual(
			mockPrimaryModel,
		);
		expect((generateText as vi.Mock).mock.calls[1][0].model).toEqual(
			mockFallbackModel,
		);
		expect(result).toEqual(expectedReport);
	});
});

// Tests for deduplicateLearnings
describe("deduplicateLearnings", () => {
	test("should remove exact duplicates", () => {
		const learnings = [
			"[HIGH] Learning about AI [Source: ai.com]",
			"[HIGH] Learning about AI [Source: ai.com]",
			"[MEDIUM] Different learning [Source: diff.com]",
		];

		const result = deduplicateLearnings(learnings);

		expect(result).toHaveLength(2);
		expect(result).toContain("[HIGH] Learning about AI [Source: ai.com]");
		expect(result).toContain("[MEDIUM] Different learning [Source: diff.com]");
	});

	test("should remove semantically similar learnings", () => {
		const learnings = [
			"[HIGH] Machine learning is a subset of artificial intelligence [Source: ml.com]",
			"[MEDIUM] Machine learning is a part of artificial intelligence [Source: ai.com]",
			"[LOW] Quantum computing is a different field [Source: qc.com]",
		];

		const result = deduplicateLearnings(learnings);

		// Should keep the first occurrence and the quantum computing one
		expect(result).toHaveLength(2);
		expect(result).toContain(
			"[HIGH] Machine learning is a subset of artificial intelligence [Source: ml.com]",
		);
		expect(result).toContain(
			"[LOW] Quantum computing is a different field [Source: qc.com]",
		);
	});

	test("should handle empty array", () => {
		const result = deduplicateLearnings([]);
		expect(result).toEqual([]);
	});

	test("should handle single item", () => {
		const learnings = ["[HIGH] Single learning [Source: single.com]"];
		const result = deduplicateLearnings(learnings);
		expect(result).toEqual(learnings);
	});

	test("should preserve order of unique learnings", () => {
		const learnings = [
			"[HIGH] First learning [Source: first.com]",
			"[MEDIUM] Second learning [Source: second.com]",
			"[LOW] Third learning [Source: third.com]",
		];

		const result = deduplicateLearnings(learnings);

		expect(result).toEqual(learnings);
	});
});

// Edge case tests for processSerpResult
describe("processSerpResult edge cases", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		(getModel as vi.Mock).mockReturnValue({ id: "gemini-1.5-flash-test" });
		(getFallbackModel as vi.Mock).mockReturnValue({
			id: "gemini-2.0-flash-test",
		});
	});

	test("should handle empty learnings array", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const mockApiResponse = {
			learnings: [],
			followUpQuestions: ["follow up"],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateObject as vi.Mock).mockResolvedValue({ object: mockApiResponse });

		const result = await processSerpResult({
			env: mockEnv,
			query: "test query",
			result: ["content"],
			sourceUrls: ["test.com"],
		});

		expect(result.learnings).toEqual([]);
		expect(result.followUpQuestions).toEqual(["follow up"]);
	});

	test("should handle empty follow-up questions", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const mockApiResponse = {
			learnings: [{ text: "learning", confidence: "HIGH", sourceIndex: 0 }],
			followUpQuestions: [],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateObject as vi.Mock).mockResolvedValue({ object: mockApiResponse });

		const result = await processSerpResult({
			env: mockEnv,
			query: "test query",
			result: ["content"],
			sourceUrls: ["test.com"],
		});

		expect(result.learnings).toHaveLength(1);
		expect(result.followUpQuestions).toEqual([]);
	});

	test("should handle sourceIndex out of bounds gracefully", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const mockApiResponse = {
			learnings: [
				{ text: "learning", confidence: "HIGH", sourceIndex: 99 }, // Out of bounds
			],
			followUpQuestions: [],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateObject as vi.Mock).mockResolvedValue({ object: mockApiResponse });

		const result = await processSerpResult({
			env: mockEnv,
			query: "test query",
			result: ["content"],
			sourceUrls: ["test.com"],
		});

		// Out of bounds sourceIndex should result in no source info
		expect(result.learnings[0]).toBe("[HIGH] learning");
		expect(result.learnings[0]).not.toContain("[Source:");
	});

	test("should handle multiple learnings with different confidence levels", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test" };
		const mockApiResponse = {
			learnings: [
				{ text: "high confidence", confidence: "HIGH", sourceIndex: 0 },
				{ text: "medium confidence", confidence: "MEDIUM", sourceIndex: 1 },
				{ text: "low confidence", confidence: "LOW", sourceIndex: 0 },
			],
			followUpQuestions: [],
		};

		(getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateObject as vi.Mock).mockResolvedValue({ object: mockApiResponse });

		const result = await processSerpResult({
			env: mockEnv,
			query: "test query",
			result: ["content1", "content2"],
			sourceUrls: ["source1.com", "source2.com"],
		});

		expect(result.learnings).toHaveLength(3);
		expect(result.learnings[0]).toContain("[HIGH]");
		expect(result.learnings[1]).toContain("[MEDIUM]");
		expect(result.learnings[2]).toContain("[LOW]");
	});
});

// Tests for writeFinalReport edge cases
describe("writeFinalReport edge cases", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		(getModelThinking as vi.Mock).mockReturnValue({
			id: "gemini-1.5-flash-test-report",
		});
		(getFallbackModel as vi.Mock).mockReturnValue({
			id: "gemini-2.0-flash-test",
		});
	});

	test("should deduplicate URLs in sources section", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test-report" };
		const mockSuccessText = "Report content.";

		(getModelThinking as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateText as vi.Mock).mockResolvedValue({
			text: mockSuccessText,
			toolCalls: [],
			toolResults: [],
			finishReason: "stop",
			usage: { promptTokens: 10, completionTokens: 10 },
			warnings: [],
		});

		const result = await writeFinalReport({
			env: mockEnv,
			prompt: "test prompt",
			learnings: ["learning 1"],
			visitedUrls: ["url1.com", "url2.com", "url1.com", "url3.com", "url2.com"],
		});

		// Should only have unique URLs
		const sourcesSection = result.split("## Sources")[1];
		const urlCount = (sourcesSection.match(/url1\.com/g) || []).length;
		expect(urlCount).toBe(1);
	});

	test("should handle empty learnings", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test-report" };
		const mockSuccessText = "Report with no learnings.";

		(getModelThinking as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateText as vi.Mock).mockResolvedValue({
			text: mockSuccessText,
			toolCalls: [],
			toolResults: [],
			finishReason: "stop",
			usage: { promptTokens: 10, completionTokens: 10 },
			warnings: [],
		});

		const result = await writeFinalReport({
			env: mockEnv,
			prompt: "test prompt",
			learnings: [],
			visitedUrls: ["url1.com"],
		});

		expect(result).toContain("Report with no learnings.");
		expect(result).toContain("## Sources");
	});

	test("should handle empty visitedUrls", async () => {
		const mockPrimaryModel = { id: "gemini-1.5-flash-test-report" };
		const mockSuccessText = "Report content.";

		(getModelThinking as vi.Mock).mockReturnValue(mockPrimaryModel);
		(generateText as vi.Mock).mockResolvedValue({
			text: mockSuccessText,
			toolCalls: [],
			toolResults: [],
			finishReason: "stop",
			usage: { promptTokens: 10, completionTokens: 10 },
			warnings: [],
		});

		const result = await writeFinalReport({
			env: mockEnv,
			prompt: "test prompt",
			learnings: ["learning"],
			visitedUrls: [],
		});

		expect(result).toContain("Report content.");
		// Should NOT have sources section when visitedUrls is empty
		expect(result).not.toContain("## Sources");
	});
});
