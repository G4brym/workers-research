import { describe, expect, test } from "vitest";
import { REPORT_QA_PROMPT } from "../../src/prompts";

describe("REPORT_QA_PROMPT", () => {
	test("should return a non-empty string", () => {
		const prompt = REPORT_QA_PROMPT();
		expect(typeof prompt).toBe("string");
		expect(prompt.length).toBeGreaterThan(0);
	});

	test("should instruct to answer only from the report", () => {
		const prompt = REPORT_QA_PROMPT();
		expect(prompt).toContain("ONLY based on information present in the report");
	});

	test("should instruct to acknowledge missing information", () => {
		const prompt = REPORT_QA_PROMPT();
		expect(prompt).toContain(
			"does not contain enough information to answer the question, say so clearly",
		);
	});
});
