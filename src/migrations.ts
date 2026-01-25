import type { Migration } from "workers-qb";

export const migrations: Migration[] = [
	{
		name: "0001_initial_migrations.sql",
		sql: `
		CREATE TABLE researches
		(
			id         TEXT PRIMARY KEY,
			query      TEXT                                NOT NULL,
			depth      TEXT                                NOT NULL,
			breadth    TEXT                                NOT NULL,
			questions  TEXT                                NOT NULL,
			status     INTEGER                             NOT NULL,
			result     TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP not null
		);
    `,
	},
	{
		name: "0002_add_users_column.sql",
		sql: `
		alter table researches
			add user text not null default 'unknown';
    `,
	},
	{
		name: "0003_add_new_fields.sql",
		sql: `
		alter table researches
			add title text;

		alter table researches
			add duration integer;
    `,
	},
	{
		name: "0004_add_initial_learnings_column.sql",
		sql: `
		ALTER TABLE researches
		ADD COLUMN initialLearnings TEXT;
    `,
	},
	{
		name: "0005_create_research_status_history.sql",
		sql: `
		CREATE TABLE research_status_history (
			id TEXT PRIMARY KEY,
			research_id TEXT,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			status_text TEXT,
			FOREIGN KEY (research_id) REFERENCES researches(id)
		);
    `,
	},
	{
		name: "0006_fix_research_status_history.sql",
		sql: `
		DROP TABLE research_status_history;
		CREATE TABLE research_status_history (
			id TEXT PRIMARY KEY,
			research_id TEXT,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			status_text TEXT,
			FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
		);
    `,
	},
	{
		name: "0007_add_browse_internet_and_autorag_id_columns.sql",
		sql: `
		ALTER TABLE researches
		ADD COLUMN browse_internet INTEGER DEFAULT 1;

		ALTER TABLE researches
		ADD COLUMN autorag_id TEXT;
		`,
	},
	{
		name: "0008_add_indexes.sql",
		sql: `
		CREATE INDEX IF NOT EXISTS idx_researches_status ON researches(status);
		CREATE INDEX IF NOT EXISTS idx_researches_created_at ON researches(created_at);
		CREATE INDEX IF NOT EXISTS idx_researches_user ON researches(user);
		CREATE INDEX IF NOT EXISTS idx_research_status_history_research_id ON research_status_history(research_id);
		`,
	},
	{
		name: "0009_add_updated_at_and_deleted_at.sql",
		sql: `
		ALTER TABLE researches ADD COLUMN updated_at TIMESTAMP;
		ALTER TABLE researches ADD COLUMN deleted_at TIMESTAMP;
		CREATE INDEX IF NOT EXISTS idx_researches_deleted_at ON researches(deleted_at);
		`,
	},
	{
		name: "0010_create_source_tracking_tables.sql",
		sql: `
		CREATE TABLE research_sources (
			id TEXT PRIMARY KEY,
			research_id TEXT NOT NULL,
			url TEXT NOT NULL,
			title TEXT,
			domain TEXT,
			crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			content_hash TEXT,
			FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
		);

		CREATE TABLE research_learnings (
			id TEXT PRIMARY KEY,
			research_id TEXT NOT NULL,
			source_id TEXT,
			learning_text TEXT NOT NULL,
			confidence TEXT DEFAULT 'MEDIUM' CHECK(confidence IN ('HIGH', 'MEDIUM', 'LOW')),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
			FOREIGN KEY (source_id) REFERENCES research_sources(id) ON DELETE SET NULL
		);

		CREATE INDEX IF NOT EXISTS idx_research_sources_research_id ON research_sources(research_id);
		CREATE INDEX IF NOT EXISTS idx_research_sources_domain ON research_sources(domain);
		CREATE INDEX IF NOT EXISTS idx_research_learnings_research_id ON research_learnings(research_id);
		CREATE INDEX IF NOT EXISTS idx_research_learnings_confidence ON research_learnings(confidence);
		`,
	},
	{
		name: "0011_add_source_urls_and_excluded_domains.sql",
		sql: `
		ALTER TABLE researches ADD COLUMN source_urls TEXT;
		ALTER TABLE researches ADD COLUMN excluded_domains TEXT;
		`,
	},
];
