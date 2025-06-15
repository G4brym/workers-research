import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateObject, generateText } from 'ai';
import { getModel, getFallbackModel, getModelThinking } from './utils'; // Adjust path as needed
import { processSerpResult, generateSerpQueries, writeFinalReport } from './workflows'; // Adjust path
import type { Env } from './bindings';
import { RESEARCH_PROMPT } from './prompts';
import { z } from "zod";

// Mock the 'ai' module
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  // If other exports from 'ai' are needed by the module under test (not directly by tests)
  // they might need to be mocked here as well, e.g. streamText: vi.fn()
  // For now, assuming only generateObject and generateText are relevant for workflows.ts
}));

// Mock the './utils' module
vi.mock('./utils', () => ({
  getModel: vi.fn(),
  getFallbackModel: vi.fn(),
  getModelThinking: vi.fn(),
  // If there are other non-function exports (like constants) from './utils' that are used
  // by workflows.ts, they might need to be explicitly provided here too.
  // Example: SOME_CONSTANT: 'actual_value_if_needed'
  // For now, assuming only these functions are relevant.
}));

const mockEnv = {} as Env; // Mock environment object

describe('processSerpResult with fallback', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Default mock implementations
    (getModel as vi.Mock).mockReturnValue({ id: 'gemini-1.5-flash-test' });
    (getFallbackModel as vi.Mock).mockReturnValue({ id: 'gemini-2.0-flash-test' }); // Updated
    (getModelThinking as vi.Mock).mockReturnValue({ id: 'gemini-1.5-flash-test-thinking' });

    // Mock RESEARCH_PROMPT as it's called internally
    // Since it's a simple function returning a string, we can just mock it if needed,
    // but usually it's fine unless it has side effects or complex logic.
    // For now, we'll assume its actual implementation is fine for these tests.
  });

  test('should use fallback model on AI_RetryError and succeed', async () => {
    const mockPrimaryModel = { id: 'gemini-1.5-flash-test' };
    const mockFallbackModel = { id: 'gemini-2.0-flash-test' }; // Updated
    const mockSuccessResponse = { learnings: ['test learning'], followUpQuestions: ['test q'] };

    (getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
    (getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

    (generateObject as vi.Mock)
      .mockImplementationOnce(async (options) => {
        // console.log('generateObject mock call 1, model:', options.model.id);
        if (options.model.id === mockPrimaryModel.id) {
          const error = new Error("You exceeded your current quota.");
          error.name = 'AI_RetryError';
          throw error;
        }
        throw new Error(`Unexpected call to primary model mock. Expected ${mockPrimaryModel.id}, got ${options.model.id}`);
      })
      .mockImplementationOnce(async (options) => {
        // console.log('generateObject mock call 2, model:', options.model.id);
        if (options.model.id === mockFallbackModel.id) {
          return { object: mockSuccessResponse };
        }
        throw new Error(`Unexpected call to fallback model mock. Expected ${mockFallbackModel.id}, got ${options.model.id}`);
      });

    const result = await processSerpResult({
      env: mockEnv,
      query: 'test query',
      result: [{ url: 'test.com', markdown: 'content', title: 'Test Content' }],
    });

    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getFallbackModel).toHaveBeenCalledTimes(1);
    expect(generateObject).toHaveBeenCalledTimes(2);

    const calls = (generateObject as vi.Mock).mock.calls;
    expect(calls[0][0].model).toEqual(mockPrimaryModel);
    expect(calls[1][0].model).toEqual(mockFallbackModel);

    expect(result).toEqual(mockSuccessResponse);
  });

  test('should re-throw error if fallback model also fails with AI_RetryError', async () => {
    const mockPrimaryModel = { id: 'gemini-1.5-flash-test' };
    const mockFallbackModel = { id: 'gemini-2.0-flash-test' }; // Updated
    const retryError = new Error("You exceeded your current quota again.");
    retryError.name = 'AI_RetryError';

    (getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
    (getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

    (generateObject as vi.Mock)
      .mockImplementationOnce(async (options) => {
        if (options.model.id === mockPrimaryModel.id) {
          const error = new Error("You exceeded your current quota.");
          error.name = 'AI_RetryError';
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
        query: 'test query',
        result: [{ url: 'test.com', markdown: 'content', title: 'Test Content' }],
      }),
    ).rejects.toThrow(retryError);

    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getFallbackModel).toHaveBeenCalledTimes(1);
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  test('should not use fallback model for non-rate-limit errors', async () => {
    const mockPrimaryModel = { id: 'gemini-1.5-flash-test' };
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
        query: 'test query',
        result: [{ url: 'test.com', markdown: 'content', title: 'Test Content' }],
      }),
    ).rejects.toThrow(genericError);

    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getFallbackModel).not.toHaveBeenCalled();
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  test('should succeed on first try without fallback', async () => {
    const mockPrimaryModel = { id: 'gemini-1.5-flash-test' };
    const mockSuccessResponse = { learnings: ['successful learning'], followUpQuestions: ['successful q'] };

    (getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
    (generateObject as vi.Mock).mockImplementationOnce(async (options) => {
      if (options.model.id === mockPrimaryModel.id) {
        return { object: mockSuccessResponse };
      }
      throw new Error("Unexpected model call");
    });

    const result = await processSerpResult({
      env: mockEnv,
      query: 'test query success',
      result: [{ url: 'test-success.com', markdown: 'success content', title: 'Test Success Content' }],
    });

    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getFallbackModel).not.toHaveBeenCalled();
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect((generateObject as vi.Mock).mock.calls[0][0].model).toEqual(mockPrimaryModel);
    expect(result).toEqual(mockSuccessResponse);
  });

  // Similar tests could be added for generateSerpQueries and writeFinalReport
  // For generateSerpQueries, the response structure is different (res.object.queries)
  // For writeFinalReport, it uses generateText and res.text
});

// Example structure for generateSerpQueries tests (if needed)
describe('generateSerpQueries with fallback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getModel as vi.Mock).mockReturnValue({ id: 'gemini-1.5-flash-test-serp' });
    (getFallbackModel as vi.Mock).mockReturnValue({ id: 'gemini-2.0-flash-test' }); // Updated
  });

  test('should use fallback model for generateSerpQueries on AI_RetryError and succeed', async () => {
    const mockPrimaryModel = { id: 'gemini-1.5-flash-test-serp' };
    const mockFallbackModel = { id: 'gemini-2.0-flash-test' }; // Updated
    const mockSuccessResponse = { queries: [{ query: 'q1', researchGoal: 'g1' }] };

    (getModel as vi.Mock).mockReturnValue(mockPrimaryModel);
    (getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

    (generateObject as vi.Mock)
      .mockImplementationOnce(async (options) => {
        if (options.model.id === mockPrimaryModel.id) {
          const error = new Error("Quota exceeded for SERP");
          error.name = 'AI_RetryError';
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
      query: 'serp test query',
    });

    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getFallbackModel).toHaveBeenCalledTimes(1);
    expect(generateObject).toHaveBeenCalledTimes(2);
    expect((generateObject as vi.Mock).mock.calls[0][0].model).toEqual(mockPrimaryModel);
    expect((generateObject as vi.Mock).mock.calls[1][0].model).toEqual(mockFallbackModel);
    expect(result).toEqual(mockSuccessResponse.queries);
  });
});

// Example structure for writeFinalReport tests (if needed)
describe('writeFinalReport with fallback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getModelThinking as vi.Mock).mockReturnValue({ id: 'gemini-1.5-flash-test-report' });
    (getFallbackModel as vi.Mock).mockReturnValue({ id: 'gemini-2.0-flash-test' }); // Updated
  });

  test('should use fallback model for writeFinalReport on AI_RetryError and succeed', async () => {
    const mockPrimaryModel = { id: 'gemini-1.5-flash-test-report' };
    const mockFallbackModel = { id: 'gemini-2.0-flash-test' }; // Updated
    const mockSuccessText = "This is the final report.";
    // Note: writeFinalReport appends a sources section. We need to account for that.
    const expectedReport = `${mockSuccessText}\n\n\n\n## Sources\n\n- url1.com\n- url2.com`;


    (getModelThinking as vi.Mock).mockReturnValue(mockPrimaryModel);
    (getFallbackModel as vi.Mock).mockReturnValue(mockFallbackModel);

    (generateText as vi.Mock)
      .mockImplementationOnce(async (options) => {
        if (options.model.id === mockPrimaryModel.id) {
          const error = new Error("Quota exceeded for report");
          error.name = 'AI_RetryError';
          throw error;
        }
        throw new Error("Unexpected primary model call for report");
      })
      .mockImplementationOnce(async (options) => {
        if (options.model.id === mockFallbackModel.id) {
          return { text: mockSuccessText, toolCalls: [], toolResults: [], finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 10 }, warnings: [] };
        }
        throw new Error("Unexpected fallback model call for report");
      });

    const result = await writeFinalReport({
      env: mockEnv,
      prompt: 'report test prompt',
      learnings: ['learning 1'],
      visitedUrls: ['url1.com', 'url2.com', 'url1.com'], // Test deduplication
    });

    expect(getModelThinking).toHaveBeenCalledTimes(1);
    expect(getFallbackModel).toHaveBeenCalledTimes(1); // getFallbackModel is called by writeFinalReport
    expect(generateText).toHaveBeenCalledTimes(2);
    expect((generateText as vi.Mock).mock.calls[0][0].model).toEqual(mockPrimaryModel);
    expect((generateText as vi.Mock).mock.calls[1][0].model).toEqual(mockFallbackModel);
    expect(result).toEqual(expectedReport);
  });
});
