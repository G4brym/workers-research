import { html } from "hono/html";
import type { FC } from "hono/jsx";
import type { ResearchTypeDB } from "../types";
import { formatDuration } from "../utils";

export const TopBar: FC = (props) => {
	return (
		<header className="bg-white border-b border-gray-200 sticky top-0 z-10">
			<div className="max-w-6xl mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					<a
						href="/"
						className="flex items-center text-xl font-semibold text-gray-900"
					>
						<img src="/favicon.svg" width="35" height="35" class="mr-1" />{" "}
						workers-research
					</a>
					{props.children}
				</div>
			</div>
		</header>
	);
};

export const Layout: FC = (props) => {
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{props.title || "workers-research"}</title>
				<link rel="stylesheet" href="/styles.css" />
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
				<script src="https://unpkg.com/htmx.org@2.0.0"></script>
				<script src="/core.js"></script>
			</head>
			<body class="bg-gray-50 min-h-screen">{props.children}</body>
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
				<div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
					<svg
						className="w-12 h-12 text-gray-400"
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
				<h3 className="text-xl font-semibold text-gray-900 mb-2">
					No research reports yet
				</h3>
				<p className="text-gray-600 text-center max-w-md mb-8">
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
						<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-blue-600"
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
						<h4 className="font-medium text-gray-900 mb-1">
							AI-Powered Questions
						</h4>
						<p className="text-sm text-gray-600">
							Get personalized follow-up questions to refine your research scope
						</p>
					</div>
					<div className="text-center">
						<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-green-600"
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
						<h4 className="font-medium text-gray-900 mb-1">Deep Analysis</h4>
						<p className="text-sm text-gray-600">
							Comprehensive reports with data-driven insights and
							recommendations
						</p>
					</div>
					<div className="text-center">
						<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-purple-600"
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
						<h4 className="font-medium text-gray-900 mb-1">Fast Results</h4>
						<p className="text-sm text-gray-600">
							Get detailed research reports in minutes, not hours or days
						</p>
					</div>
				</div>
				<div className="mt-8 text-center">
					<p className="text-xs text-gray-500">
						Your research history and reports will appear here once you start
						creating them
					</p>
				</div>
			</div>
		);
	}

	const currentPath = props.page && props.page > 1 ? `/?page=${props.page}` : "/";
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
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Research Reports
				</h2>
				<p className="text-gray-600">
					Manage and review your deep research projects
				</p>
			</div>

			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
					<div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
						<div className="col-span-5">Report Title</div>
						<div className="col-span-2">Status</div>
						<div className="col-span-2">Created</div>
						<div className="col-span-2">Duration</div>
						<div className="col-span-1">Actions</div>
					</div>
				</div>

				<div className="divide-y divide-gray-200">
					{props.researches.results.map((obj) => (
						<div className="px-6 py-4 hover:bg-gray-50 transition-colors">
							<div className="grid grid-cols-12 gap-4 items-center">
								<div className="col-span-5">
									<h3 className="font-medium text-gray-900 mb-1">
										{obj.title ?? ""}
									</h3>
									<p className="text-sm text-gray-600 line-clamp-1">
										{obj.query}
									</p>
								</div>
								<div className="col-span-2">
									<ResearchStatus status={obj.status} />
								</div>
								<div className="col-span-2">
									<div className="text-sm text-gray-900">
										{obj.created_at ? obj.created_at.split(" ")[0] : ""}
									</div>
									<div className="text-xs text-gray-500">
										{obj.created_at ? obj.created_at.split(" ")[1] : ""}
									</div>
								</div>
								<div className="col-span-2">
									<div className="text-sm text-gray-900">
										{obj.duration ? formatDuration(obj.duration) : "--"}
									</div>
									<div className="text-xs text-gray-500">Research time</div>
								</div>
								<div className="col-span-1">
									<a
										href={`/details/${obj.id}`}
										className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
				<div className="text-sm text-gray-700">
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
						className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={currentPage === 1}
						href={`/?page=${currentPage - 1}`}
					>
						Previous
					</a>
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(
						(pageNum) => (
							<a
								className={`px-3 py-2 text-sm font-medium ${pageNum === currentPage ? "text-white bg-blue-600 border-blue-600" : "text-gray-700 bg-white border-gray-300"} border rounded-md hover:bg-gray-50`}
								href={`/?page=${pageNum}`}
							>
								{pageNum}
							</a>
						),
					)}
					<a
						className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={currentPage === totalPages}
						href={`/?page=${currentPage + 1}`}
					>
						Next
					</a>
				</nav>
			</div>

			<div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white p-4 rounded-lg border border-gray-200">
					<div className="text-2xl font-bold text-gray-900">
						{props.researches.totalCount}
					</div>
					<div className="text-sm text-gray-600">Total Reports</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-gray-200">
					<div className="text-2xl font-bold text-green-600">
						{props.totalCompleted}
					</div>
					<div className="text-sm text-gray-600">Completed</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-gray-200">
					<div className="text-2xl font-bold text-yellow-600">
						{props.totalProcessing}
					</div>
					<div className="text-sm text-gray-600">Processing</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-gray-200">
					<div className="text-2xl font-bold text-gray-900">
						{props.avgDuration}
					</div>
					<div className="text-sm text-gray-600">Avg. Duration</div>
				</div>
			</div>
		</main>
	);
};

export const ResearchDetails: FC = (props) => {
	return (
		<main className="max-w-4xl mx-auto px-4 py-8">
			<div className="mb-8">
				<h2 className="text-3xl font-bold text-gray-900 mb-2">
					{props.research.title}
				</h2>
				<p className="text-sm text-gray-500">
					Generated on {props.research.created_at}
				</p>
			</div>

			<div className="mb-8">
				<details className="group">
					<summary className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
						<svg
							className="w-4 h-4 text-gray-600 transition-transform group-open:rotate-90"
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
						<span className="font-medium text-gray-700">Research Context</span>
						<span className="text-sm text-gray-500 ml-auto">
							Initial query & follow-up questions
						</span>
					</summary>

					<div className="mt-4 space-y-6 px-4 pb-4">
						<div>
							<h4 className="font-semibold text-gray-900 mb-2">
								Initial Query
							</h4>
							<div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
								<p className="text-gray-800">{props.research.query}</p>
							</div>
						</div>

						{props.research.initialLearnings && props.research.initialLearnings.trim() !== "" && (
							<div>
								<h4 className="font-semibold text-gray-900 mb-2">
									Initial Learnings
								</h4>
								<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
									{props.research.initialLearnings.split('\n').map((line: string, index: number) => (
										<p key={index} className="text-gray-800">{line}</p>
									))}
								</div>
							</div>
						)}

						<div>
							<h4 className="font-semibold text-gray-900 mb-3">
								Follow-up Questions & Answers
							</h4>
							<div className="space-y-4">
								{props.research.questions.map((obj) => (
									<div className="border border-gray-200 rounded-lg p-4">
										<p className="font-medium text-gray-900 mb-2">
											Q: {obj.question}
										</p>
										<p className="text-gray-700 bg-gray-50 p-3 rounded">
											A: {obj.answer}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</details>
			</div>

			<div className="prose prose-lg max-w-none">
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
					{html(props.research.report_html)}
				</div>
			</div>
		</main>
	);
};

export const CreateResearch: FC = () => {
	return (
		<main class="max-w-4xl mx-auto px-4 py-8">
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-2">
					Start New Research
				</h2>
				<p class="text-gray-600">
					Begin by describing what you'd like to research in detail
				</p>
			</div>

			<div
				id="query-section"
				class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
			>
				<div class="mb-6">
					<div class="mb-3">
						<label
							htmlFor="initial-query"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Research Question
						</label>
						<textarea
							id="initial-query"
							name="query"
							rows={6}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
							placeholder="Describe your research question in detail. Be specific about what you want to learn, any particular focus areas, timeframes, or scope you're interested in..."
							required
						></textarea>
						<p className="mt-2 text-sm text-gray-500">
							The more detailed your question, the better our AI can tailor
							follow-up questions to gather relevant information.
						</p>
					</div>
					<div class="mb-6">
						<label
							htmlFor="initial-learnings"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Initial Learnings (Optional)
						</label>
						<textarea
							id="initial-learnings"
							name="initial-learnings"
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
							placeholder="Enter any initial data or learnings you have, one per line..."
						></textarea>
						<p className="mt-2 text-sm text-gray-500">
							Providing initial learnings can help the AI generate more relevant and insightful questions.
						</p>
					</div>
					<div className="flex">
						<div className="grow mr-2">
							<label
								htmlFor="initial-depth"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Depth
							</label>
							<input
								id="initial-depth"
								name="depth"
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
								value={3}
								required
							></input>
						</div>
						<div className="grow ml-2">
							<label
								htmlFor="initial-breadth"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Breadth
							</label>
							<input
								id="initial-breadth"
								name="breadth"
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
						hx-include="#initial-query, #initial-learnings"
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

			<form id="final-form" action="/create" method="post" class="hidden">
				<input type="hidden" name="query" id="original-query-hidden" />
				<input type="hidden" name="depth" id="depth-hidden" />
				<input type="hidden" name="breadth" id="breadth-hidden" />
				<input type="hidden" name="initial-learnings" id="initial-learnings-hidden" />
			</form>
		</main>
	);
};

export const NewResearchQuestions: FC = (props) => {
	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Follow-up Questions
				</h3>
				<p className="text-sm text-gray-600">
					Based on your research question, please answer these follow-up
					questions to help us provide more targeted insights.
				</p>
			</div>

			<div className="space-y-6">
				{props.questions.map((obj, i) => (
					<div className="question-item">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<span className="question-text">{obj}</span>
							<span className="text-red-500 ml-1">*</span>
						</label>
						<input
							type="text"
							name={"followup_" + i}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
						/>
					</div>
				))}
			</div>

			<div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
				<button
					type="button"
					onClick="document.getElementById('followup-section').innerHTML = ''; document.getElementById('initial-query').focus();"
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
					<h2 className="text-2xl font-bold text-red-600 mb-4">
						An Error Occurred
					</h2>
					{props.children}
					<div className="flex mt-6 mb-4">
						<a
							href="/"
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
						>
							Return to Home
						</a>
					</div>
					<div className="flex">
						<span>
							If this error is not expected, please open an issue on the{" "}
							<a
								class="underline"
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
