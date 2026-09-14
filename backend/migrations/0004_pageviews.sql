CREATE TABLE IF NOT EXISTS pageviews (
  view_date TEXT NOT NULL,
  path TEXT NOT NULL,
  device TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (view_date, path, device)
);
