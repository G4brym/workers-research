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
];
