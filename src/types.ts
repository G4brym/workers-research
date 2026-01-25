// ============================================
// Research Types
// ============================================

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
	updated_at?: string;
	deleted_at?: string;
	start_ms?: number;
	initialLearnings?: string;
	browse_internet?: boolean;
	autorag_id?: string;
	source_urls?: string[];
	excluded_domains?: string[];
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
	updated_at?: string;
	deleted_at?: string;
	initialLearnings?: string;
	browse_internet: number;
	autorag_id?: string;
	source_urls?: string;
	excluded_domains?: string;
};

// ============================================
// Source Tracking Types
// ============================================

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ResearchSource {
	id: string;
	research_id: string;
	url: string;
	title?: string;
	domain?: string;
	crawled_at?: string;
	content_hash?: string;
}

export interface ResearchLearning {
	id: string;
	research_id: string;
	source_id?: string;
	learning_text: string;
	confidence: ConfidenceLevel;
	created_at?: string;
}

// ============================================
// Status Types
// ============================================

export type ResearchStatus = 1 | 2 | 3; // 1=processing, 2=completed, 3=failed

export interface ResearchStatusHistory {
	id: string;
	research_id: string;
	timestamp: string;
	status_text: string;
}

// ============================================
// Learnings with Source Attribution
// ============================================

export interface LearningWithSource {
	learning: string;
	sourceUrl?: string;
	sourceDomain?: string;
	confidence: ConfidenceLevel;
}

export interface ProcessedLearnings {
	learnings: LearningWithSource[];
	followUpQuestions: string[];
}
