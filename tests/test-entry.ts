// Minimal worker entry point for tests.
// The vitest pool worker requires a valid entry point but tests import
// source modules directly — this keeps the worker bootstrap lightweight.
export default {
	async fetch(): Promise<Response> {
		return new Response("test worker");
	},
};
