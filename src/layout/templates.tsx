import { html } from "hono/html";
import type { FC } from "hono/jsx";
import type { ResearchType } from "../types";
import { timeAgo } from "../utils";

const TopBar: FC = (props) => {
	return (
		<header className="bg-base-100 shadow-sm">
			<div className="container mx-auto">
				<div className="navbar p-2">
					<div className="flex-1">
						<a href="/" className="btn btn-ghost text-xl">
							workers-research
						</a>
					</div>
					<div className="flex-none">
						<div className="dropdown dropdown-end">
							<div
								tabIndex={0}
								role="button"
								className="btn btn-ghost btn-circle avatar"
							>
								{props.user !== "unknown" ? (
									<span>{props.user}</span>
								) : (
									<div className="w-10 rounded-full">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="100%"
											height="100%"
											fill="currentColor"
											viewBox="0 0 16 16"
										>
											<path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
											<path
												fill-rule="evenodd"
												d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
											/>
										</svg>
									</div>
								)}
							</div>
							<ul
								tabIndex={0}
								className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
							>
								<li>
									<a href="/auth/logout">Logout</a>
								</li>
							</ul>
						</div>
					</div>
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
				<link href="/styles.css" rel="stylesheet" />
				<title>{props.title || "Researcher"}</title>
			</head>
			<body>
				<TopBar user={props.user} />
				<div className="container mx-auto p-2">{props.children}</div>
			</body>
		</html>
	);
};

export const ResearchList: FC = (props) => {
	return (
		<div className="card bg-base-100">
			<div className="card-body">
				<h2 className="card-title">
					My researches
					<a href="/create" className="btn text-white btn-success mr-0 ml-auto">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
							width="32"
							height="32"
							viewBox="0 0 16 16"
						>
							<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
						</svg>
						New Research
					</a>
				</h2>

				<div className="overflow-x-auto">
					<table className="table">
						<thead>
							<tr>
								<th>Query</th>
								<th>Status</th>
								<th>Date</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{(props.researches.results as ResearchType[]).map((obj) => (
								<tr>
									<td>
										<div className="text-sm">{obj.query}</div>
									</td>
									<td>
										<span
											className={`badge badge-soft badge-sm ${obj.status === 1 ? "badge-warning" : "badge-success"}`}
										>
											{obj.status === 1 ? "Running" : "Complete"}
										</span>
									</td>
									<td>
										<span className="whitespace-nowrap">
											{timeAgo(new Date(obj.created_at))}
										</span>
									</td>
									<th className="gap-3">
										<a href={"/details/" + obj.id} className="btn btn-sm">
											Open
										</a>
									</th>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export const ResearchDetails: FC = (props) => {
	return (
		<div className="card bg-base-100">
			<div className="card-body">
				<h3 className="card-title h-3">
					<span class="opacity-50">Reading Research:</span>
					<div class="mr-0 ml-auto flex gap-1">
						<a href="/" className="btn btn-sm whitespace-nowrap">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="24"
								fill="currentColor"
								viewBox="0 0 16 16"
							>
								<path
									fill-rule="evenodd"
									d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
								/>
							</svg>
							Go back
						</a>
						<button
							className="btn btn-sm btn-warning whitespace-nowrap"
							onClick="document.getElementById('delete_modal').showModal()"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								fill="currentColor"
								viewBox="0 0 16 16"
							>
								<path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0" />
							</svg>
							Delete Research
						</button>
					</div>

					<dialog id="delete_modal" className="modal">
						<div className="modal-box">
							<form method="dialog">
								<button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
									✕
								</button>
							</form>
							<h3 className="font-bold text-lg">Are you sure?</h3>
							<p className="py-4">Deleting the research is not reversible</p>
							<div className="modal-action">
								<form method="post" action="/delete">
									<input type="hidden" name="id" value={props.research.id} />
									<div className="flex gap-1">
										<button className="btn btn-error" type="submit">
											Delete
										</button>
									</div>
								</form>
							</div>
						</div>
					</dialog>
				</h3>
				<h2 className="card-title mb-4">{props.research.query}</h2>

				<div
					tabIndex={0}
					className="collapse collapse-arrow border-base-300 bg-base-100 border"
				>
					<input type="checkbox" />
					<div className="collapse-title font-semibold">
						Research Parameters
					</div>
					<div className="collapse-content text-sm">
						<div className="overflow-x-auto">
							<table className="table">
								<tbody>
									<tr>
										<th className="font-bold">Depth</th>
										<td>{props.research.depth}</td>
									</tr>
									<tr>
										<th className="font-bold">Breadth</th>
										<td>{props.research.breadth}</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<div
					tabIndex={0}
					className="collapse collapse-arrow border-base-300 bg-base-100 border"
				>
					<input type="checkbox" />
					<div className="collapse-title font-semibold">
						Drill-Down Questions
					</div>
					<div className="collapse-content text-sm">
						<ul className="list bg-base-100 rounded-box shadow-md">
							{props.research.questions.map((obj) => (
								<li className="list-row">
									<div>
										<div>{obj.question}</div>
										<div className="text-xs uppercase font-semibold opacity-60">
											{obj.answer}
										</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div
					tabIndex={0}
					className="collapse collapse-open collapse-arrow border-base-300 bg-base-100 border"
				>
					<div className="collapse-title font-semibold">Report</div>
					<div className="collapse-content">
						<div className="report p-1">{html(props.research.report_html)}</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export const CreateResearch: FC = () => {
	return (
		<div className="card bg-base-100">
			<div className="card-body">
				<h2 className="card-title">
					Create New Research
					<div className="mr-0 ml-auto flex gap-1">
						<a href="/" className="btn btn-sm whitespace-nowrap">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="24"
								fill="currentColor"
								viewBox="0 0 16 16"
							>
								<path
									fill-rule="evenodd"
									d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
								/>
							</svg>
							Go back
						</a>
					</div>
				</h2>

				<form
					className="flex flex-col gap-2 w-lg"
					action="/create"
					method="post"
				>
					<fieldset className="fieldset">
						<legend className="fieldset-legend">
							What do you want to research?
						</legend>
						<textarea
							name="query"
							className="textarea h-32 w-full"
							required={true}
							placeholder="Write me a report about..."
						></textarea>
					</fieldset>
					<fieldset className="fieldset">
						<legend className="fieldset-legend">Research Depth?</legend>
						<input
							name="depth"
							type="number"
							className="input w-24"
							placeholder="Type here"
							value="3"
							required={true}
						/>
					</fieldset>
					<fieldset className="fieldset">
						<legend className="fieldset-legend">Research Breadth?</legend>
						<input
							name="breadth"
							type="number"
							className="input w-24"
							placeholder="Type here"
							value="3"
							required={true}
						/>
					</fieldset>

					<div className="mt-5">
						<button className="btn btn-primary">
							Proceed to Drill-Down Questions
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export const NewResearchQuestions: FC = (props) => {
	return (
		<div className="card bg-base-100">
			<div className="card-body">
				<h2 className="card-title h-2 mb-5">
					Research Drill-Down Questions
					<div className="mr-0 ml-auto flex gap-1">
						<a href="/" className="btn btn-sm whitespace-nowrap">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="24"
								fill="currentColor"
								viewBox="0 0 16 16"
							>
								<path
									fill-rule="evenodd"
									d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
								/>
							</svg>
							Go back
						</a>
					</div>
				</h2>

				<div className="mb-5">
					<p className="font-bold">Initial Question:</p>
					<p>{props.research.query}</p>
				</div>

				<div className="mb-5">
					<p className="font-bold">
						In order to get better results, please answer the following
						questions:
					</p>

					<form action="/create/finish" method="post">
						<input name="query" value={props.research.query} type="hidden" />
						<input
							name="breadth"
							value={props.research.breadth}
							type="hidden"
						/>
						<input name="depth" value={props.research.depth} type="hidden" />

						{props.questions.map((obj) => (
							<fieldset className="fieldset">
								<legend className="fieldset-legend">{obj}</legend>
								<input name="question" value={obj} type="hidden" />
								<input
									name="answer"
									className="input w-full"
									required
									placeholder="Type here"
								/>
							</fieldset>
						))}

						<div className="mt-5">
							<button className="btn btn-primary">Create research</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};
