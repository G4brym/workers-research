-- Migration number: 0003 	 2025-06-08T16:10:06.657Z

alter table researches
	add title text;

alter table researches
	add duration integer;
