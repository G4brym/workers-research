CREATE TABLE research_status_history (
    id TEXT PRIMARY KEY,
    research_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_text TEXT,
    FOREIGN KEY (research_id) REFERENCES researches(id)
);
