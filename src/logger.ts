// Structured logging for the research workflow
// Provides consistent log format with timing, context, and error details

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
	researchId?: string;
	query?: string;
	depth?: number;
	breadth?: number;
	step?: string;
	url?: string;
	durationMs?: number;
	[key: string]: unknown;
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: LogContext;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
}

class Logger {
	private minLevel: LogLevel = "info";

	private levelPriority: Record<LogLevel, number> = {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3,
	};

	setMinLevel(level: LogLevel): void {
		this.minLevel = level;
	}

	private shouldLog(level: LogLevel): boolean {
		return this.levelPriority[level] >= this.levelPriority[this.minLevel];
	}

	private formatEntry(entry: LogEntry): string {
		const parts = [
			`[${entry.timestamp}]`,
			`[${entry.level.toUpperCase()}]`,
			entry.message,
		];

		if (entry.context) {
			const contextStr = Object.entries(entry.context)
				.filter(([, v]) => v !== undefined)
				.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
				.join(" ");
			if (contextStr) {
				parts.push(`| ${contextStr}`);
			}
		}

		if (entry.error) {
			parts.push(`| error="${entry.error.message}"`);
		}

		return parts.join(" ");
	}

	private log(
		level: LogLevel,
		message: string,
		context?: LogContext,
		error?: Error,
	): void {
		if (!this.shouldLog(level)) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			context,
			error: error
				? {
						name: error.name,
						message: error.message,
						stack: error.stack,
					}
				: undefined,
		};

		const formatted = this.formatEntry(entry);

		switch (level) {
			case "debug":
			case "info":
				console.log(formatted);
				break;
			case "warn":
				console.warn(formatted);
				break;
			case "error":
				console.error(formatted);
				break;
		}
	}

	debug(message: string, context?: LogContext): void {
		this.log("debug", message, context);
	}

	info(message: string, context?: LogContext): void {
		this.log("info", message, context);
	}

	warn(message: string, context?: LogContext, error?: Error): void {
		this.log("warn", message, context, error);
	}

	error(message: string, context?: LogContext, error?: Error): void {
		this.log("error", message, context, error);
	}

	// Helper for timing operations
	startTimer(): () => number {
		const start = Date.now();
		return () => Date.now() - start;
	}
}

// Singleton instance
export const logger = new Logger();

// Research-specific logging helpers
export function logResearchStart(
	researchId: string,
	query: string,
	depth: number,
	breadth: number,
): void {
	logger.info("Research workflow started", {
		researchId,
		query: query.substring(0, 100),
		depth,
		breadth,
	});
}

export function logResearchComplete(
	researchId: string,
	durationMs: number,
	learningsCount: number,
): void {
	logger.info("Research workflow completed", {
		researchId,
		durationMs,
		step: "complete",
		learningsCount,
	});
}

export function logResearchError(researchId: string, error: Error): void {
	logger.error("Research workflow failed", { researchId }, error);
}

export function logSearchStart(
	researchId: string,
	query: string,
	source: "web" | "autorag",
): void {
	logger.info(`Starting ${source} search`, {
		researchId,
		query: query.substring(0, 100),
		step: `${source}_search`,
	});
}

export function logSearchComplete(
	researchId: string,
	source: "web" | "autorag",
	urlCount: number,
	durationMs: number,
): void {
	logger.info(`${source} search completed`, {
		researchId,
		step: `${source}_search`,
		urlCount,
		durationMs,
	});
}

export function logSearchError(
	researchId: string,
	source: "web" | "autorag",
	query: string,
	error: Error,
): void {
	logger.warn(
		`${source} search failed`,
		{ researchId, query: query.substring(0, 100), step: `${source}_search` },
		error,
	);
}

export function logCrawlUrl(researchId: string, url: string): void {
	logger.debug("Crawling URL", { researchId, url, step: "crawl" });
}

export function logLearningsExtracted(researchId: string, count: number): void {
	logger.info("Learnings extracted", {
		researchId,
		step: "extract_learnings",
		learningsCount: count,
	});
}

export function logReportGeneration(
	researchId: string,
	learningsCount: number,
): void {
	logger.info("Generating final report", {
		researchId,
		step: "generate_report",
		learningsCount,
	});
}

export function logRateLimitRetry(operation: string, query: string): void {
	logger.warn(`Rate limit hit, retrying with fallback model`, {
		step: operation,
		query: query.substring(0, 100),
	});
}
