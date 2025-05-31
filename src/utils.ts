import {
	type GoogleGenerativeAIProvider,
	type GoogleGenerativeAIProviderSettings,
	createGoogleGenerativeAI,
} from "@ai-sdk/google";
import type { Env } from "./bindings";

function getGoogleProvider(env: Env): GoogleGenerativeAIProvider {
	const args: GoogleGenerativeAIProviderSettings = {
		apiKey: env.GOOGLE_API_KEY,
	};

	if (env.AI_GATEWAY_ACCOUNT_ID && env.AI_GATEWAY_NAME) {
		args.baseURL = `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/google-ai-studio/v1beta`;

		if (env.AI_GATEWAY_API_KEY) {
			args.headers = {
				"cf-aig-authorization": `Bearer ${env.AI_GATEWAY_API_KEY}`,
			};
		}
	}

	return createGoogleGenerativeAI(args);
}

export function getModel(env: Env) {
	const google = getGoogleProvider(env);

	return google("gemini-2.5-flash-preview-05-20");
}
export function getModelThinking(env: Env) {
	const google = getGoogleProvider(env);

	return google("gemini-2.5-flash-preview-05-20");
}

export function timeAgo(date: Date): string {
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	const intervals: [number, string][] = [
		[60, "second"],
		[60, "minute"],
		[24, "hour"],
		[7, "day"],
		[4.35, "week"],
		[12, "month"],
		[Number.POSITIVE_INFINITY, "year"],
	];

	let count = seconds;
	let unit = "second";

	for (const [interval, name] of intervals) {
		if (count < interval) break;
		count /= interval;
		unit = name;
	}

	count = Math.floor(count);
	return `${count} ${unit}${count !== 1 ? "s" : ""} ago`;
}

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
