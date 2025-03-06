-- Migration number: 0002 	 2025-03-05T22:48:59.916Z

alter table researches
	add user text not null default 'unknown';
