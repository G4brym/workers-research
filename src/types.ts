export type ResearchType = {
	id: string;
	query: string;
	depth: string;
	breadth: string;
	status: number;
	questions: {
		question: string;
		answer: string;
	}[];
	result?: string;
	created_at?: string;
};

export type ResearchTypeDB = {
	id: string;
	query: string;
	depth: string;
	breadth: string;
	status: number;
	questions: string;
	result?: string;
	created_at?: string;
};
