import type { Context } from "hono";
import type { ResearchType } from "./types";

export type Env = {
	RESEARCH_WORKFLOW: Workflow<ResearchType>;
	DB: D1Database;
	GOOGLE_API_KEY: string;
	BROWSER: Fetcher;
};

export type Variables = {
	user?: string;
};

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;
