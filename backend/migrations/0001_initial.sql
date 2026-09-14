CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  plan TEXT NOT NULL,
  timeline TEXT NOT NULL,
  budget TEXT NOT NULL,
  need TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT NOT NULL DEFAULT '',
  payment_provider TEXT,
  payment_trade_no TEXT,
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS login_attempts (
  fingerprint TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
