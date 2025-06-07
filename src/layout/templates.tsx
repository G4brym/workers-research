import { html } from "hono/html";
import type { FC } from "hono/jsx";
import type { ResearchType } from "../types";
import { timeAgo } from "../utils";

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

				<div className="collapse collapse-arrow border-base-300 bg-base-100 border">
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

				<div className="collapse collapse-arrow border-base-300 bg-base-100 border">
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

				<div className="collapse collapse-open collapse-arrow border-base-300 bg-base-100 border">
					<div className="collapse-title font-semibold">Report</div>
					<div className="collapse-content">
						<div className="report p-1">{html(props.research.report_html)}</div>
					</div>
				</div>
			</div>
		</div>
	);
};
