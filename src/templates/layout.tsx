import { html } from "hono/html";
import type { FC } from "hono/jsx";
import type { ResearchTypeDB } from "../types";
import { formatDuration } from "../utils";

export const TopBar: FC = (props) => {
	return (
		<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
			<div className="max-w-6xl mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					<a
						href="/"
						className="flex items-center text-xl font-semibold text-gray-900 dark:text-white"
					>
						<img src="/favicon.svg" width="35" height="35" class="mr-1" />{" "}
						workers-research
					</a>
					<div className="flex items-center gap-3">
						{/* Dark mode toggle */}
						<button
							type="button"
							id="dark-mode-toggle"
							onClick="toggleDarkMode()"
							className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
							aria-label="Toggle dark mode"
							title="Toggle dark mode (Ctrl+D)"
						>
							{/* Sun icon (shown in dark mode) */}
							<svg
								class="w-5 h-5 hidden dark:block"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
									clip-rule="evenodd"
								></path>
							</svg>
							{/* Moon icon (shown in light mode) */}
							<svg
								class="w-5 h-5 block dark:hidden"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
							</svg>
						</button>
						{props.children}
					</div>
				</div>
			</div>
		</header>
	);
};

export const ResearchStatusHistoryDisplay: FC<{
	statusHistory: { status_text: string; timestamp: string }[];
	isLiveView?: boolean;
}> = (props) => {
	const { statusHistory, isLiveView = false } = props; // Default isLiveView to false
	const _title = isLiveView ? "Live Status Updates" : "Research History Log";

	if (!statusHistory || statusHistory.length === 0) {
		return (
			<p
				class={`text-gray-500 dark:text-gray-400 ${isLiveView ? "text-sm" : "text-xs"}`}
			>
				No status updates yet.
			</p>
		);
	}

	// For non-live view, use a more compact rendering.
	// The existing live view (isLiveView = true path) should retain its original styling structure
	// but it's being moved into this conditional rendering.
	if (isLiveView) {
		return (
			<ul class="space-y-3">
				{statusHistory.map((entry, index) => (
					<li
						key={index}
						class="flex items-start p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
					>
						<svg
							class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.25-7.25a1.25 1.25 0 112.5 0 1.25 1.25 0 01-2.5 0z"
								clip-rule="evenodd"
							></path>
						</svg>
						<span class="text-sm text-gray-700 dark:text-gray-300">
							{entry.status_text}
							<span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">
								{new Date(entry.timestamp).toLocaleString()}
							</span>
						</span>
					</li>
				))}
			</ul>
		);
	}

	// Compact view for historical logs (isLiveView = false)
	return (
		<div
			class={`border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 ${isLiveView ? "p-4 mt-4" : "p-3"}`}
		>
			{/* Title is only needed if it's not part of a collapsible section summary */}
			{/* <h3 class="text-md font-semibold mb-2">{title}</h3> */}
			<ul class={`space-y-1 ${isLiveView ? "space-y-2" : ""}`}>
				{statusHistory.map((entry, index) => (
					<li
						key={index}
						class={`text-gray-700 dark:text-gray-300 ${isLiveView ? "text-sm" : "text-xs"}`}
					>
						{/* Timestamp only for live view, or consider a more compact format for non-live */}
						{/* {isLiveView && <span class="font-medium">{new Date(entry.timestamp).toLocaleString()}</span>} */}
						{/* {isLiveView ? ": " : ""} */}
						{entry.status_text}
					</li>
				))}
			</ul>
		</div>
	);
};

export const Layout: FC = (props) => {
	return (
		<html lang="en" class="">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{props.title || "workers-research"}</title>
				<link rel="stylesheet" href="/styles.css" />
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
				<script src="https://unpkg.com/htmx.org@2.0.0"></script>
				<script src="/core.js"></script>
				{/* Initialize dark mode before body renders to prevent flash */}
				{html`<script>
					(function() {
						if (localStorage.getItem('darkMode') === 'true' ||
							(!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
							document.documentElement.classList.add('dark');
						}
					})();
				</script>`}
			</head>
			<body class="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col transition-colors">
				<div class="flex-grow">{props.children}</div>
				<footer class="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
					<div class="max-w-6xl mx-auto px-4 flex items-center justify-center gap-4">
						<a
							href="https://github.com/G4brym/workers-research"
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-gray-900 dark:hover:text-white hover:underline"
						>
							workers-research
						</a>
						<a
							href="https://github.com/G4brym/workers-research"
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-gray-900 dark:hover:text-white"
							aria-label="GitHub Repository"
						>
							<span class="sr-only">View on GitHub</span>
							<svg
								class="w-4 h-4 inline-block"
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M10 0C4.477 0 0 4.477 0 10c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.201 2.397.098 2.65.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.942.359.309.678.92.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0020 10c0-5.523-4.477-10-10-10z"
									clip-rule="evenodd"
								></path>
							</svg>
						</a>
						<span class="text-xs">
							Press{" "}
							<kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
								?
							</kbd>{" "}
							for shortcuts
						</span>
					</div>
				</footer>
			</body>
		</html>
	);
};

const ResearchStatus: FC = (props) => {
	if (props.status === 1) {
		return (
			<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
				<svg
					className="animate-spin w-3 h-3 mr-1"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Processing
			</span>
		);
	}

	if (props.status === 2) {
		return (
			<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
				<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					></path>
				</svg>
				Completed
			</span>
		);
	}

	return (
		<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
			<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				></path>
			</svg>
			Failed
		</span>
	);
};

interface ResearchListProps {
	researches: { results: ResearchTypeDB[]; totalCount: number };
	page: number;
	totalCompleted: number;
	totalProcessing: number;
	avgDuration: string;
}

export const ResearchList: FC<ResearchListProps> = (props) => {
	const pageSize = 5;
	const totalPages = Math.ceil(props.researches.totalCount / pageSize);
	const currentPage = props.page || 1;

	if (props.researches.results.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 px-4">
				<div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
					<svg
						className="w-12 h-12 text-gray-400 dark:text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						></path>
					</svg>
				</div>
				<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					No research reports yet
				</h3>
				<p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
					Start your first deep research project to generate comprehensive
					reports with AI-powered insights and analysis.
				</p>
				<a
					href="/create"
					className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
				>
					<svg
						className="w-4 h-4 mr-2 inline-block"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						></path>
					</svg>
					Create Your First Research
				</a>
				<div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
					<div className="text-center">
						<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-blue-600 dark:text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
						</div>
						<h4 className="font-medium text-gray-900 dark:text-white mb-1">
							AI-Powered Questions
						</h4>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Get personalized follow-up questions to refine your research scope
						</p>
					</div>
					<div className="text-center">
						<div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-green-600 dark:text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								></path>
							</svg>
						</div>
						<h4 className="font-medium text-gray-900 dark:text-white mb-1">
							Deep Analysis
						</h4>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Comprehensive reports with data-driven insights and
							recommendations
						</p>
					</div>
					<div className="text-center">
						<div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-purple-600 dark:text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
						</div>
						<h4 className="font-medium text-gray-900 dark:text-white mb-1">
							Fast Results
						</h4>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Get detailed research reports in minutes, not hours or days
						</p>
					</div>
				</div>
				<div className="mt-8 text-center">
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Your research history and reports will appear here once you start
						creating them
					</p>
				</div>
			</div>
		);
	}

	const currentPath =
		props.page && props.page > 1 ? `/?page=${props.page}` : "/";
	const hxGetUrlWithPartial = currentPath.includes("?")
		? `${currentPath}&partial=true`
		: `${currentPath}?partial=true`;

	return (
		<main
			id="research-list-container"
			className="max-w-6xl mx-auto px-4 py-8"
			hx-get={hxGetUrlWithPartial}
			hx-trigger="every 10s"
			hx-swap="outerHTML"
			hx-target="#research-list-container"
		>
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Research Reports
				</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Manage and review your deep research projects
				</p>
			</div>

			{/* Search and Filter Bar */}
			<div className="mb-6 flex flex-col sm:flex-row gap-4">
				<div className="flex-1">
					<div className="relative">
						<input
							type="search"
							id="search-input"
							placeholder="Search research reports..."
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<svg
							className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							></path>
						</svg>
					</div>
				</div>
				<div className="flex gap-2">
					<select
						id="status-filter"
						className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="">All Status</option>
						<option value="1">Processing</option>
						<option value="2">Completed</option>
						<option value="3">Failed</option>
					</select>
					<select
						id="sort-by"
						className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="created_at_desc">Newest First</option>
						<option value="created_at_asc">Oldest First</option>
						<option value="title_asc">Title A-Z</option>
						<option value="title_desc">Title Z-A</option>
					</select>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
					<div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
						<div className="col-span-5">Report Title</div>
						<div className="col-span-2">Status</div>
						<div className="col-span-2">Created</div>
						<div className="col-span-2">Duration</div>
						<div className="col-span-1">Actions</div>
					</div>
				</div>

				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{props.researches.results.map((obj) => (
						<div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
							<div className="grid grid-cols-12 gap-4 items-center">
								<div className="col-span-5">
									<h3 className="font-medium text-gray-900 dark:text-white mb-1">
										{obj.title ?? ""}
									</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
										{obj.query}
									</p>
								</div>
								<div className="col-span-2">
									<ResearchStatus status={obj.status} />
								</div>
								<div className="col-span-2">
									<div className="text-sm text-gray-900 dark:text-white">
										{obj.created_at ? obj.created_at.split(" ")[0] : ""}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{obj.created_at ? obj.created_at.split(" ")[1] : ""}
									</div>
								</div>
								<div className="col-span-2">
									<div className="text-sm text-gray-900 dark:text-white">
										{obj.duration ? formatDuration(obj.duration) : "--"}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Research time
									</div>
								</div>
								<div className="col-span-1">
									<a
										href={`/details/${obj.id}`}
										className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
									>
										View
									</a>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="mt-6 flex items-center justify-between">
				<div className="text-sm text-gray-700 dark:text-gray-300">
					Showing{" "}
					<span className="font-medium">
						{(currentPage - 1) * pageSize + 1}
					</span>{" "}
					to{" "}
					<span className="font-medium">
						{Math.min(currentPage * pageSize, props.researches.totalCount)}
					</span>{" "}
					of <span className="font-medium">{props.researches.totalCount}</span>{" "}
					results
				</div>
				<nav className="flex items-center gap-2">
					<a
						className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={currentPage === 1}
						href={`/?page=${currentPage - 1}`}
					>
						Previous
					</a>
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(
						(pageNum) => (
							<a
								className={`px-3 py-2 text-sm font-medium ${pageNum === currentPage ? "text-white bg-blue-600 border-blue-600" : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"} border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700`}
								href={`/?page=${pageNum}`}
							>
								{pageNum}
							</a>
						),
					)}
					<a
						className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={currentPage === totalPages}
						href={`/?page=${currentPage + 1}`}
					>
						Next
					</a>
				</nav>
			</div>

			<div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="text-2xl font-bold text-gray-900 dark:text-white">
						{props.researches.totalCount}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Total Reports
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
						{props.totalCompleted}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Completed
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
						{props.totalProcessing}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Processing
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="text-2xl font-bold text-gray-900 dark:text-white">
						{props.avgDuration}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Avg. Duration
					</div>
				</div>
			</div>
		</main>
	);
};

export const ResearchDetails: FC = (props) => {
	const researchData = props.research;
	const mainId = `research-details-main-${researchData.id}`;
	const statusUpdateIndicatorId = `status-update-indicator-${researchData.id}`;

	let htmxPollingProps = {};
	if (researchData.status === 1) {
		htmxPollingProps = {
			"hx-get": `/details/${researchData.id}?partial=true`,
			"hx-trigger": "every 5s",
			"hx-target": `#${mainId}`, // Target self (the main tag)
			"hx-swap": "outerHTML", // Swap the entire main tag
			"hx-indicator": `#${statusUpdateIndicatorId}`,
		};
	}

	return (
		<main
			id={mainId}
			className="max-w-4xl mx-auto px-4 py-8"
			{...htmxPollingProps} // Spread the polling props here
		>
			{/* Static Top Part (title, date, overall status) */}
			<div className="mb-8">
				<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
					{researchData.title}
				</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Generated on {researchData.created_at}
				</p>
				<div className="mt-2">
					<ResearchStatus status={researchData.status} />
				</div>
			</div>

			{/* Research Parameters Section */}
			<div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
					Research Parameters
				</h3>
				<div className="space-y-3">
					<div className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
							Duration:
						</span>
						<span class="text-sm text-gray-800 dark:text-gray-200">
							{researchData.duration
								? formatDuration(researchData.duration)
								: "N/A"}
						</span>
					</div>
					<div className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
							Depth:
						</span>
						<span class="text-sm text-gray-800 dark:text-gray-200">
							{researchData.depth}
						</span>
					</div>
					<div className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
							Breadth:
						</span>
						<span class="text-sm text-gray-800 dark:text-gray-200">
							{researchData.breadth}
						</span>
					</div>
					<div className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
							Browse Internet:
						</span>
						<span class="text-sm text-gray-800 dark:text-gray-200">
							{researchData.browse_internet === 1 ? "Yes" : "No"}
						</span>
					</div>
					{researchData.autorag_id && researchData.autorag_id !== "" && (
						<div className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
							<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
								AutoRAG ID:
							</span>
							<span class="text-sm text-gray-800 dark:text-gray-200">
								{researchData.autorag_id}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Research Context Section - direct child of main */}
			<div className="mb-8">
				<details className="group">
					<summary className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
						<svg
							className="w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform group-open:rotate-90"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							></path>
						</svg>
						<span className="font-medium text-gray-700 dark:text-gray-200">
							Research Context
						</span>
						<span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
							Initial query & follow-up questions
						</span>
					</summary>

					<div className="mt-4 space-y-6 px-4 pb-4">
						<div>
							<h4 className="font-semibold text-gray-900 dark:text-white mb-2">
								Initial Query
							</h4>
							<div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-4 rounded-r-md">
								<p className="text-gray-800 dark:text-gray-200">
									{researchData.query}
								</p>
							</div>
						</div>

						{researchData.initialLearnings &&
							researchData.initialLearnings.trim() !== "" && (
								<div>
									<h4 className="font-semibold text-gray-900 dark:text-white mb-2">
										Initial Learnings
									</h4>
									<div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-r-md">
										{researchData.initialLearnings
											.split("\n")
											.map((line: string, index: number) => (
												<p
													key={index}
													className="text-gray-800 dark:text-gray-200"
												>
													{line}
												</p>
											))}
									</div>
								</div>
							)}

						<div>
							<h4 className="font-semibold text-gray-900 dark:text-white mb-3">
								Follow-up Questions & Answers
							</h4>
							<div className="space-y-4">
								{researchData.questions.map((obj: any) => (
									<div
										key={obj.question} // Assuming question is unique
										className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
									>
										<p className="font-medium text-gray-900 dark:text-white mb-2">
											Q: {obj.question}
										</p>
										<p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
											A: {obj.answer}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</details>
			</div>

			{/* Live Status Updates Section - direct child of main */}
			{researchData.status === 1 && (
				<div className="mb-8">
					<h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
						Live Status Updates
					</h3>
					<ResearchStatusHistoryDisplay
						statusHistory={researchData.statusHistory}
						isLiveView={true}
					/>
					<div
						id={statusUpdateIndicatorId}
						className="htmx-indicator my-2 flex items-center justify-start text-sm text-gray-500 dark:text-gray-400"
					>
						<svg
							className="animate-spin h-4 w-4 text-blue-600 mr-2"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span>Fetching latest status...</span>
					</div>
				</div>
			)}

			{/* Add this new section for research history */}
			{(researchData.status === 2 || researchData.status === 3) &&
				researchData.statusHistory &&
				researchData.statusHistory.length > 0 && (
					<details className="mt-4 mb-8">
						<summary className="cursor-pointer font-semibold text-gray-800 dark:text-white mb-3">
							Research History
						</summary>
						<div className="mt-2">
							<ResearchStatusHistoryDisplay
								statusHistory={researchData.statusHistory}
								isLiveView={false}
							/>
						</div>
					</details>
				)}

			{/* Report Content - direct child of main */}
			{researchData.status !== 1 && (
				<div className="prose prose-lg dark:prose-invert max-w-none">
					<div
						className={`rounded-lg shadow-sm p-8 ${
							researchData.status === 3
								? "bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700"
								: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
						}`}
					>
						{researchData.status === 3 && (
							<div className="not-prose mb-6 p-4 bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500 rounded-r">
								<div className="flex items-start">
									<svg
										className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
											clip-rule="evenodd"
										></path>
									</svg>
									<div>
										<h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
											Research Failed
										</h3>
										<p className="text-sm text-red-800 dark:text-red-300">
											The research process encountered an error and could not
											complete. Details are shown below.
										</p>
									</div>
								</div>
							</div>
						)}
						{html(researchData.report_html)}
					</div>
				</div>
			)}
		</main>
	);
};

interface CreateResearchProps {
	userRags?: { id: string }[];
	csrfToken?: string;
}

export const CreateResearch: FC<CreateResearchProps> = (props) => {
	const { userRags, csrfToken } = props;
	const hasRags = userRags && userRags.length > 0;

	return (
		<main class="max-w-4xl mx-auto px-4 py-8">
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Start New Research
				</h2>
				<p class="text-gray-600 dark:text-gray-400">
					Begin by describing what you'd like to research in detail
				</p>
			</div>

			<div
				id="query-section"
				class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
			>
				<div class="mb-6">
					<div class="mb-3">
						<label
							htmlFor="initial-query"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Research Question
						</label>
						<textarea
							id="initial-query"
							name="query"
							rows={6}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
							placeholder="Describe your research question in detail. Be specific about what you want to learn, any particular focus areas, timeframes, or scope you're interested in..."
							required
						></textarea>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							The more detailed your question, the better our AI can tailor
							follow-up questions to gather relevant information.
						</p>
					</div>
					<div class="mb-6">
						<label
							htmlFor="initial-learnings"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Initial Learnings (Optional)
						</label>
						<textarea
							id="initial-learnings"
							name="initial-learnings"
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
							placeholder="Enter any initial data or learnings you have, one per line..."
						></textarea>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Providing initial learnings can help the AI generate more relevant
							and insightful questions.
						</p>
					</div>

					{/* Browse Internet Checkbox */}
					<div class="mb-6">
						<div class="flex items-center">
							<input
								id="browse_internet_checkbox"
								name="browse_internet"
								type="checkbox"
								checked
								class="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
							/>
							<label
								htmlFor="browse_internet_checkbox"
								class="ml-2 block text-sm text-gray-900 dark:text-gray-100"
							>
								Browse Internet
							</label>
						</div>
					</div>

					{/* Source URLs - for users to provide specific URLs */}
					<div class="mb-6">
						<label
							htmlFor="source-urls"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Source URLs (Optional)
						</label>
						<textarea
							id="source-urls"
							name="source_urls"
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
							placeholder="https://example.com/article1&#10;https://example.com/article2"
						></textarea>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Enter URLs to include in your research, one per line. These will
							be crawled first before searching the web.
						</p>
					</div>

					{/* Excluded Domains */}
					<div class="mb-6">
						<label
							htmlFor="excluded-domains"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Excluded Domains (Optional)
						</label>
						<textarea
							id="excluded-domains"
							name="excluded_domains"
							rows={2}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
							placeholder="example.com&#10;spam-site.com"
						></textarea>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Enter domains to exclude from search results, one per line.
						</p>
					</div>

					{/* AutoRAG Checkbox and Dropdown */}
					<div class="mb-6">
						<div class="flex items-center mb-2">
							<input
								id="use_autorag_checkbox"
								name="use_autorag"
								type="checkbox"
								class="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
								disabled={!hasRags}
								onChange="toggleAutoRagDropdown(this.checked)"
							/>
							<label
								htmlFor="use_autorag_checkbox"
								class="ml-2 block text-sm text-gray-900 dark:text-gray-100"
							>
								Use AutoRAG
							</label>
						</div>
						{!hasRags && (
							<p class="text-sm text-gray-500 dark:text-gray-400">
								You don't have any AutoRAGs.{" "}
								{html`<a href='https://dash.cloudflare.com/?to=/:account/ai/autorag' target='_blank' class='text-blue-600 hover:underline'>Click here</a>`}{" "}
								to create one.
							</p>
						)}
						{hasRags && (
							<div
								id="autorag_id_dropdown_container"
								style="display: none;"
								class="mt-2"
							>
								<label
									htmlFor="autorag_id_select"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Select AutoRAG
								</label>
								<select
									id="autorag_id_select"
									name="autorag_id"
									disabled
									class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="">-- Select an AutoRAG --</option>
									{userRags.map((rag) => (
										<option value={rag.id}>{rag.id}</option>
									))}
								</select>
							</div>
						)}
					</div>

					{/* Research Presets */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Research Intensity
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								data-preset="2-2"
								onClick="applyPreset(2, 2)"
								className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
							>
								Quick
							</button>
							<button
								type="button"
								data-preset="3-3"
								onClick="applyPreset(3, 3)"
								className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ring-2 ring-blue-500"
							>
								Standard
							</button>
							<button
								type="button"
								data-preset="5-5"
								onClick="applyPreset(5, 5)"
								className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
							>
								Thorough
							</button>
						</div>
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Quick: Fast overview | Standard: Balanced research | Thorough:
							Deep analysis
						</p>
					</div>

					<div className="flex">
						<div className="grow mr-2">
							<label
								htmlFor="initial-depth"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Depth
								<span
									className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-full cursor-help"
									title="How many levels deep to research each topic. Higher values explore subtopics more thoroughly but take longer."
								>
									?
								</span>
							</label>
							<input
								id="initial-depth"
								name="depth"
								type="number"
								min="1"
								max="10"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={3}
								required
							></input>
						</div>
						<div className="grow ml-2">
							<label
								htmlFor="initial-breadth"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Breadth
								<span
									className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-full cursor-help"
									title="How many parallel topics to explore at each level. Higher values cover more ground but take longer."
								>
									?
								</span>
							</label>
							<input
								id="initial-breadth"
								name="breadth"
								type="number"
								min="1"
								max="10"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={3}
								required
							></input>
						</div>
					</div>
				</div>

				<div class="flex justify-end">
					<button
						id="generate-questions-btn"
						hx-post="/create/questions"
						hx-target="#followup-section"
						hx-include="#initial-query, #initial-learnings, #csrf-token"
						hx-indicator="#loading-questions"
						class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Generate Questions
					</button>
				</div>

				<div
					id="loading-questions"
					class="htmx-indicator mt-4 flex items-center justify-center"
				>
					<div class="flex items-center space-x-2 text-blue-600">
						<svg
							class="animate-spin h-5 w-5"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span class="text-sm font-medium">
							Generating personalized questions...
						</span>
					</div>
				</div>
			</div>

			<div id="followup-section"></div>

			{/* Hidden CSRF token for HTMX requests */}
			<input
				type="hidden"
				name="_csrf"
				id="csrf-token"
				value={csrfToken || ""}
			/>

			<form id="final-form" action="/create" method="post" class="hidden">
				<input type="hidden" name="_csrf" value={csrfToken || ""} />
				<input type="hidden" name="query" id="original-query-hidden" />
				<input type="hidden" name="depth" id="depth-hidden" />
				<input type="hidden" name="breadth" id="breadth-hidden" />
				<input
					type="hidden"
					name="initial-learnings"
					id="initial-learnings-hidden"
				/>
				{/* Hidden inputs for browse_internet and autorag_id will be handled by the main form submission logic if needed,
				    or their values can be picked directly from the form elements by their names.
				    For HTMX, these form fields will be included if they are inside the hx-include scope.
				    For the final POST, these will be part of the form if not disabled.
				    The `final-form` below seems to be for a specific HTMX swap, ensure these new fields are part of that if necessary,
				    or that the server-side handler for `/create` (POST) correctly reads these new fields.
				 */}
			</form>
		</main>
	);
};

interface CloneResearchProps {
	research: {
		query: string;
		depth: string;
		breadth: string;
		initialLearnings?: string;
		browse_internet?: number;
		autorag_id?: string;
		source_urls?: string;
		excluded_domains?: string;
	};
	userRags?: { id: string }[];
	csrfToken?: string;
}

export const CloneResearch: FC<CloneResearchProps> = (props) => {
	const { research, userRags, csrfToken } = props;
	const hasRags = userRags && userRags.length > 0;
	const useAutoRag = research.autorag_id && research.autorag_id !== "";

	// Parse source URLs and excluded domains from JSON strings
	const sourceUrls = research.source_urls
		? JSON.parse(research.source_urls).join("\n")
		: "";
	const excludedDomains = research.excluded_domains
		? JSON.parse(research.excluded_domains).join("\n")
		: "";

	return (
		<main class="max-w-4xl mx-auto px-4 py-8">
			<div class="mb-8">
				<div className="flex items-center gap-2 mb-2">
					<span className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
						Clone
					</span>
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
						New Research from Template
					</h2>
				</div>
				<p class="text-gray-600 dark:text-gray-400">
					This research is pre-filled with parameters from a previous report.
					Modify as needed.
				</p>
			</div>

			<div
				id="query-section"
				class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
			>
				<div class="mb-6">
					<div class="mb-3">
						<label
							htmlFor="initial-query"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Research Question
						</label>
						<textarea
							id="initial-query"
							name="query"
							rows={6}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
							required
						>
							{research.query}
						</textarea>
					</div>
					<div class="mb-6">
						<label
							htmlFor="initial-learnings"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Initial Learnings (Optional)
						</label>
						<textarea
							id="initial-learnings"
							name="initial-learnings"
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
						>
							{research.initialLearnings || ""}
						</textarea>
					</div>

					{/* Browse Internet Checkbox */}
					<div class="mb-6">
						<div class="flex items-center">
							<input
								id="browse_internet_checkbox"
								name="browse_internet"
								type="checkbox"
								checked={research.browse_internet === 1}
								class="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
							/>
							<label
								htmlFor="browse_internet_checkbox"
								class="ml-2 block text-sm text-gray-900 dark:text-gray-100"
							>
								Browse Internet
							</label>
						</div>
					</div>

					{/* Source URLs */}
					<div class="mb-6">
						<label
							htmlFor="source-urls"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Source URLs (Optional)
						</label>
						<textarea
							id="source-urls"
							name="source_urls"
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
							placeholder="https://example.com/article1&#10;https://example.com/article2"
						>
							{sourceUrls}
						</textarea>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Enter URLs to include in your research, one per line.
						</p>
					</div>

					{/* Excluded Domains */}
					<div class="mb-6">
						<label
							htmlFor="excluded-domains"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Excluded Domains (Optional)
						</label>
						<textarea
							id="excluded-domains"
							name="excluded_domains"
							rows={2}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
							placeholder="example.com&#10;spam-site.com"
						>
							{excludedDomains}
						</textarea>
						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Enter domains to exclude from search results, one per line.
						</p>
					</div>

					{/* AutoRAG Checkbox and Dropdown */}
					<div class="mb-6">
						<div class="flex items-center mb-2">
							<input
								id="use_autorag_checkbox"
								name="use_autorag"
								type="checkbox"
								checked={useAutoRag}
								class="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
								disabled={!hasRags}
								onChange="toggleAutoRagDropdown(this.checked)"
							/>
							<label
								htmlFor="use_autorag_checkbox"
								class="ml-2 block text-sm text-gray-900 dark:text-gray-100"
							>
								Use AutoRAG
							</label>
						</div>
						{hasRags && (
							<div
								id="autorag_id_dropdown_container"
								style={useAutoRag ? "display: block;" : "display: none;"}
								class="mt-2"
							>
								<label
									htmlFor="autorag_id_select"
									class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Select AutoRAG
								</label>
								<select
									id="autorag_id_select"
									name="autorag_id"
									disabled={!useAutoRag}
									class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="">-- Select an AutoRAG --</option>
									{userRags.map((rag) => (
										<option
											value={rag.id}
											selected={rag.id === research.autorag_id}
										>
											{rag.id}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{/* Research Presets */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Research Intensity
						</label>
						<div className="flex gap-2">
							<button
								type="button"
								data-preset="2-2"
								onClick="applyPreset(2, 2)"
								className={`flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${research.depth === "2" && research.breadth === "2" ? "ring-2 ring-blue-500" : ""}`}
							>
								Quick
							</button>
							<button
								type="button"
								data-preset="3-3"
								onClick="applyPreset(3, 3)"
								className={`flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${research.depth === "3" && research.breadth === "3" ? "ring-2 ring-blue-500" : ""}`}
							>
								Standard
							</button>
							<button
								type="button"
								data-preset="5-5"
								onClick="applyPreset(5, 5)"
								className={`flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${research.depth === "5" && research.breadth === "5" ? "ring-2 ring-blue-500" : ""}`}
							>
								Thorough
							</button>
						</div>
					</div>

					<div className="flex">
						<div className="grow mr-2">
							<label
								htmlFor="initial-depth"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Depth
								<span
									className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-full cursor-help"
									title="How many levels deep to research each topic."
								>
									?
								</span>
							</label>
							<input
								id="initial-depth"
								name="depth"
								type="number"
								min="1"
								max="10"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={research.depth}
								required
							></input>
						</div>
						<div className="grow ml-2">
							<label
								htmlFor="initial-breadth"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Breadth
								<span
									className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-full cursor-help"
									title="How many parallel topics to explore at each level."
								>
									?
								</span>
							</label>
							<input
								id="initial-breadth"
								name="breadth"
								type="number"
								min="1"
								max="10"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={research.breadth}
								required
							></input>
						</div>
					</div>
				</div>

				<div class="flex justify-end">
					<button
						id="generate-questions-btn"
						hx-post="/create/questions"
						hx-target="#followup-section"
						hx-include="#initial-query, #initial-learnings, #csrf-token"
						hx-indicator="#loading-questions"
						class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Generate Questions
					</button>
				</div>

				<div
					id="loading-questions"
					class="htmx-indicator mt-4 flex items-center justify-center"
				>
					<div class="flex items-center space-x-2 text-blue-600">
						<svg
							class="animate-spin h-5 w-5"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span class="text-sm font-medium">
							Generating personalized questions...
						</span>
					</div>
				</div>
			</div>

			<div id="followup-section"></div>

			{/* Hidden CSRF token for HTMX requests */}
			<input
				type="hidden"
				name="_csrf"
				id="csrf-token"
				value={csrfToken || ""}
			/>

			<form id="final-form" action="/create" method="post" class="hidden">
				<input type="hidden" name="_csrf" value={csrfToken || ""} />
				<input type="hidden" name="query" id="original-query-hidden" />
				<input type="hidden" name="depth" id="depth-hidden" />
				<input type="hidden" name="breadth" id="breadth-hidden" />
				<input
					type="hidden"
					name="initial-learnings"
					id="initial-learnings-hidden"
				/>
			</form>
		</main>
	);
};

interface NewResearchQuestionsProps {
	questions: string[];
	csrfToken?: string;
}

export const NewResearchQuestions: FC<NewResearchQuestionsProps> = (props) => {
	const { questions, csrfToken } = props;
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			{/* CSRF token for the form submission */}
			<input
				type="hidden"
				name="_csrf"
				id="csrf-token-questions"
				value={csrfToken || ""}
			/>
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
					Follow-up Questions
				</h3>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Based on your research question, please answer these follow-up
					questions to help us provide more targeted insights.
				</p>
			</div>

			<div className="space-y-6">
				{questions.map((obj, i) => (
					<div className="question-item">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							<span className="question-text">{obj}</span>
							<span className="text-red-500 ml-1">*</span>
						</label>
						<input
							type="text"
							name={"followup_" + i}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
						/>
					</div>
				))}
			</div>

			<div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
				<button
					type="button"
					onClick="document.getElementById('followup-section').innerHTML = ''; document.getElementById('initial-query').focus();"
					className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
				>
					← Back to Query
				</button>
				<button
					type="button"
					id="start-research-btn"
					className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
				>
					Start Deep Research
				</button>
			</div>
		</div>
	);
};

export const ErrorPage: FC = (props) => {
	return (
		<Layout title="Error">
			<TopBar />
			<main className="max-w-4xl mx-auto px-4 py-8">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
					<h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
						An Error Occurred
					</h2>
					<div className="text-gray-700 dark:text-gray-300">
						{props.children}
					</div>
					<div className="flex mt-6 mb-4">
						<a
							href="/"
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
						>
							Return to Home
						</a>
					</div>
					<div className="flex">
						<span className="text-gray-600 dark:text-gray-400">
							If this error is not expected, please open an issue on the{" "}
							<a
								class="underline text-blue-600 dark:text-blue-400"
								href="https://github.com/G4brym/workers-research"
							>
								Github Repository here
							</a>
							.
						</span>
					</div>
				</div>
			</main>
		</Layout>
	);
};
