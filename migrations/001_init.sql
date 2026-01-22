CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','in_transit','delivered','failed')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

CREATE INDEX IF NOT EXISTS idx_shipments_last_synced_at ON shipments(last_synced_at);