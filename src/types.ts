export type ResearchType = {
	id: string;
	title?: string;
	duration?: number;
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
	start_ms?: number;
	initialLearnings?: string;
	browse_internet?: boolean;
	autorag_id?: string;
};

export type ResearchTypeDB = {
	id: string;
	query: string;
	title?: string;
	duration?: number;
	depth: string;
	breadth: string;
	status: number;
	questions: string;
	result?: string;
	created_at?: string;
	initialLearnings?: string;
	browse_internet: number;
	autorag_id?: string;
};
