CREATE TABLE IF NOT EXISTS ai_chat_activity (
  activity_date TEXT PRIMARY KEY,
  successful_replies INTEGER NOT NULL DEFAULT 0
);
