import path from "node:path"; // Import the path module
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		alias: [
			{
				find: /^cloudflare:(.+)$/, // Keep regex to catch all cloudflare:* imports
				// Point to the specific mock for 'cloudflare:workers'
				// For other 'cloudflare:*' if any, they'd need their own mocks or a generic one
				replacement: path.resolve(
					__dirname,
					"src/__mocks__/cloudflare_workers.ts",
				),
			},
			// If you had other aliases, they would go here
		],
		// globals: true, // Ensure Vitest global APIs are available if needed
		// environment: 'node', // Default
	},
});
