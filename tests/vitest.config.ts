import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: {
					configPath: "./wrangler.toml",
				},
				miniflare: {
					compatibilityFlags: ["nodejs_compat"],
					compatibilityDate: "2025-01-28",
				},
			},
		},
	},
});
