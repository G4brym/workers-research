import type { Context } from "hono";
import type { ResearchType } from "./types";

export type Env = {
	RESEARCH_WORKFLOW: Workflow<ResearchType>;
	DB: D1Database;
	GOOGLE_API_KEY: string;
	AI_GATEWAY_NAME?: string;
	AI_GATEWAY_ACCOUNT_ID?: string;
	AI_GATEWAY_API_KEY?: string;
	BROWSER: Fetcher;
	AI: Ai;
	CACHE?: KVNamespace;
	REPORTS_BUCKET?: R2Bucket;
};

export type Variables = {
	user?: string;
	csrfToken?: string;
};

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;
