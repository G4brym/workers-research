import { app } from "./index";
import { D1QB } from "workers-qb";
import { generatePdf } from "html-to-pdf";
import { renderMarkdownReportContent } from "./markdown";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import type { Env } from "./bindings";
import type { ResearchTypeDB } from "./types";
import type { Hono } from "hono"; // For app type

// Mock dependencies
const mockExecute = vi.fn();
const mockApplyMigrations = vi.fn().mockResolvedValue(undefined);

// Define a shared mock instance structure
const mockD1QBInstance = {
	migrations: vi.fn(() => ({
		apply: mockApplyMigrations,
	})),
	fetchOne: vi.fn(() => ({
		execute: mockExecute,
	})),
	// Add other methods if your application code uses them on the D1QB instance
};

vi.mock("workers-qb", () => {
	// The D1QB constructor mock now returns the shared mockD1QBInstance
	const MockedD1QB = vi.fn(() => mockD1QBInstance);
	return { D1QB: MockedD1QB };
});

vi.mock("html-to-pdf", () => ({
	generatePdf: vi.fn(),
}));
vi.mock("./markdown");

describe("PDF Download Endpoint", () => {
	let app: Hono<Env, any, "/">; // Hono app type
	let client: Awaited<ReturnType<typeof testClient<Env>>>;
	const mockResearchId = "test-research-id";
	const mockMarkdownContent = "## Test Report\nThis is a test report.";
	const mockHtmlContent = "<h2>Test Report</h2><p>This is a test report.</p>";
	const mockPdfBuffer = new TextEncoder().encode("fake pdf content").buffer;

	const mockResearchData: ResearchTypeDB = {
		id: mockResearchId,
		title: "Test Research",
		query: "Test query",
		depth: "shallow",
		breadth: "narrow",
		questions: JSON.stringify([{ question: "Q1", answer: "A1" }]),
		status: 2, // Completed
		result: mockMarkdownContent,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		duration: 120,
		initialLearnings: "Initial learnings",
		started_at: new Date().toISOString(),
		user_id: "test-user",
	};

	beforeEach(async () => {
		vi.resetModules(); // Reset modules before each test
		vi.resetAllMocks(); // Also reset mocks

		// Clear call history for the global mock functions and methods on the shared instance
		mockExecute.mockClear();
		mockApplyMigrations.mockClear();
		mockD1QBInstance.migrations.mockClear();
		mockD1QBInstance.fetchOne.mockClear();
		if (D1QB) { // D1QB might be undefined here if module execution order is tricky with vi.mock
            vi.mocked(D1QB).mockClear(); // Clear calls to the constructor itself
        }


		// Dynamically import the app module to get a fresh instance
		const indexModule = await import("./index");
		app = indexModule.app;

		const mockDB = {}; // Your mock DB environment for Hono context
		client = testClient<Env>(app, { DB: mockDB as any });

		// Reset and re-configure mocks for external services for each test
		vi.mocked(generatePdf).mockClear().mockResolvedValue(mockPdfBuffer);
		vi.mocked(renderMarkdownReportContent).mockClear().mockReturnValue(mockHtmlContent);
	});

	it("should return a PDF file with correct headers and content", async () => {
		mockExecute.mockResolvedValueOnce({
			results: mockResearchData,
			success: true,
			meta: {},
		});

		const response = await client.details[":id"].download.pdf.$get({
			param: { id: mockResearchId },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		expect(response.headers.get("Content-Disposition")).toBe(
			'attachment; filename="report.pdf"',
		);

		const responseBody = await response.arrayBuffer();
		expect(responseBody).toEqual(mockPdfBuffer);

		// Verify mocks were called
		expect(mockExecute).toHaveBeenCalledTimes(1);
		// Check that the D1QB constructor was called
		expect(D1QB).toHaveBeenCalled();
		// Check that migrations().apply() was called (via the shared instance)
		expect(mockD1QBInstance.migrations).toHaveBeenCalled();
		expect(mockApplyMigrations).toHaveBeenCalled(); // Verifies the .apply() part
		expect(renderMarkdownReportContent).toHaveBeenCalledWith(mockMarkdownContent);
		expect(generatePdf).toHaveBeenCalledWith(mockHtmlContent);
	});

	it("should return 404 if research not found", async () => {
		// Configure mockExecute for this specific test case
		mockExecute.mockResolvedValueOnce({
			results: null, // Simulate not found
			success: true,
			meta: {},
		});

		const response = await client.details[":id"].download.pdf.$get({
			param: { id: "non-existent-id" },
		});

		expect(response.status).toBe(404);
		// Check constructor and migration calls
		expect(D1QB).toHaveBeenCalled();
		expect(mockD1QBInstance.migrations).toHaveBeenCalled();
		expect(mockApplyMigrations).toHaveBeenCalled();
		// Ensure PDF generation was not called for 404
		expect(renderMarkdownReportContent).not.toHaveBeenCalled();
		expect(generatePdf).not.toHaveBeenCalled();
	});

	it("should return a Markdown file with correct headers and content", async () => {
		const markdownContentForTest = "# Test Markdown Report\nThis is a test markdown report.";
		const mockResearchMarkdownData: ResearchTypeDB = {
			...mockResearchData, // Reuse some common fields
			id: "test-id-markdown",
			result: markdownContentForTest,
		};

		mockExecute.mockResolvedValueOnce({
			results: mockResearchMarkdownData,
			success: true,
			meta: {},
		});

		const response = await client.details[":id"].download.markdown.$get({
			param: { id: "test-id-markdown" },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
		expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="report.md"');

		const responseBody = await response.text();
		expect(responseBody).toBe(markdownContentForTest);

		// Verify D1QB calls
		expect(mockExecute).toHaveBeenCalledTimes(1);
		expect(D1QB).toHaveBeenCalled();
		expect(mockD1QBInstance.migrations).toHaveBeenCalled(); // Middleware migration check
		expect(mockApplyMigrations).toHaveBeenCalled();

		// Ensure PDF specific mocks were NOT called for markdown download
		expect(renderMarkdownReportContent).not.toHaveBeenCalled();
		expect(generatePdf).not.toHaveBeenCalled();
	});
});
