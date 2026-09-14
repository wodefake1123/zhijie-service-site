CREATE TABLE IF NOT EXISTS submission_limits (
  fingerprint TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  submissions INTEGER NOT NULL
);
