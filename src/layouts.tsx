import type { FC } from "hono/jsx";
import type { ResearchType } from "./types";

export const Layout: FC = (props) => {
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css"
				/>
				<title>Research Dashboard</title>
			</head>
			<body>
				<div className="container py-4">{props.children}</div>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js" />
			</body>
		</html>
	);
};

export const ListResearches: FC = (props) => {
	return (
		<div className="table-responsive mb-4">
			<table className="table table-striped table-hover">
				<thead className="table-dark">
					<tr>
						<th>ID</th>
						<th>Query</th>
						<th>Depth</th>
						<th>Breadth</th>
						<th>Status</th>
						<th>Created At</th>
						<th>Actions</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{(props.researches.results as ResearchType[]).map((obj) => (
						<tr>
							<td>{obj.id}</td>
							<td>{obj.query}</td>
							<td>{obj.depth}</td>
							<td>{obj.breadth}</td>
							<td>
								<span
									className={`badge ${obj.status === 1 ? "bg-warning" : "bg-success"}`}
								>
									{obj.status === 1 ? "Running" : "Complete"}
								</span>
							</td>
							<td>{obj.created_at}</td>
							<td>
								<form action="/re-run" method="post">
									<input name="id" value={obj.id} type="hidden" />
									<button
										className="btn btn-outline-primary btn-sm"
										type="submit"
									>
										🔄
									</button>
								</form>
							</td>
							<td>
								{obj.status === 2 && (
									<a
										href={"/read/" + obj.id}
										className="btn btn-outline-success btn-sm"
									>
										Read
									</a>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export const CreateResearch: FC = () => {
	return (
		<div className="card">
			<div className="card-header">
				<h5 className="card-title mb-0">Create New Research</h5>
			</div>
			<div className="card-body">
				<form action="/create" method="get">
					<div className="mb-3">
						<label htmlFor="query" className="form-label">
							Query:
						</label>
						<input name="query" className="form-control" required />
					</div>
					<div className="mb-3">
						<label htmlFor="depth" className="form-label">
							Depth:
						</label>
						<input
							value="3"
							name="depth"
							type="number"
							className="form-control"
							required
						/>
					</div>
					<div className="mb-3">
						<label htmlFor="breadth" className="form-label">
							Breadth:
						</label>
						<input
							value="4"
							name="breadth"
							type="number"
							className="form-control"
							required
						/>
					</div>
					<button type="submit" className="btn btn-primary">
						Continue with creation
					</button>
				</form>
			</div>
		</div>
	);
};

export const NewResearchQuestions: FC = (props) => {
	return (
		<div className="card">
			<div className="card-header">
				<h5 className="card-title mb-0">
					Initial Query: <strong>{props.research.query}</strong>
				</h5>
			</div>
			<div className="card-body">
				<form action="/create" method="post">
					<input name="query" value={props.research.query} type="hidden" />
					<input name="breadth" value={props.research.breadth} type="hidden" />
					<input name="depth" value={props.research.depth} type="hidden" />

					{props.questions.map((obj) => (
						<div className="mb-3">
							<label htmlFor="answer" className="form-label">
								{obj}
							</label>
							<input name="question" value={obj} type="hidden" />
							<input name="answer" className="form-control" required />
						</div>
					))}

					<button type="submit" className="btn btn-primary">
						Create new Research
					</button>
				</form>
			</div>
		</div>
	);
};
