ALTER TABLE orders ADD COLUMN lookup_hash TEXT;
ALTER TABLE orders ADD COLUMN public_note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN quoted_amount INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_lookup_hash ON orders(lookup_hash);
