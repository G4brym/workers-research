// src/__mocks__/cloudflare_workers.ts
import { vi } from "vitest";

// Mock the necessary exports from 'cloudflare:workers'
// For the current tests, we likely don't need complex implementations.
// We mainly need to ensure that the module resolves and provides the structure
// that workflows.ts expects when it imports.

export class WorkflowEntrypoint {
	// Mock implementation or leave empty if not directly used in a way that affects tests
}

// Add other exports if workflows.ts or its dependencies use them
// For example, if 'step' objects or other types/functions are used:
export const step = {
	do: vi.fn(async (name, fn) => {
		if (fn) {
			return fn();
		}
		return Promise.resolve();
	}),
	// Add other step properties/methods if necessary
};

// Mock any other specific named exports from 'cloudflare:workers' that your code might be using.
// If unsure, start with an empty mock or just WorkflowEntrypoint and add as Vitest errors point them out.
// For example, if types like WorkflowEvent or WorkflowStep are structurally checked:
export type WorkflowEvent<T = any> = { payload: T; [key: string]: any };
export type WorkflowStep = typeof step & { [key: string]: any };

// You can also re-export from 'vitest' if you need to use its utilities
// For example, if you need `vi` inside this mock:
// import { vi } from 'vitest';
// export const vi = vi;
// However, `vi` should be globally available in test files.
// This mock file is for mocking the module structure, not for test logic itself.

console.log("Using mock for cloudflare:workers"); // For debugging if the mock is picked up
