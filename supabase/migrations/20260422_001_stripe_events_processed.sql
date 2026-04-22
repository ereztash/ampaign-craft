-- Idempotency log for Stripe webhook events.
-- Stripe retries webhook deliveries on timeouts/5xx, which without dedup
-- causes duplicate tier updates (or worse, a cancelled→renewed→cancelled
-- race that flips a paying user back to free).
--
-- The webhook handler does an upsert on event.id before processing; if the
-- row already exists, the event is a retry and we return 200 immediately.

CREATE TABLE IF NOT EXISTS stripe_events_processed (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Flag for events we accepted (valid signature) but couldn't resolve to a
  -- user (missing metadata AND no matching stripe_customer_id). These need
  -- manual / cron reconciliation so we don't silently leave a cancelled
  -- subscription on the paid tier.
  unresolved BOOLEAN NOT NULL DEFAULT false,
  unresolved_reason TEXT
);

-- Retention: keep 90 days of history for debugging, then prune via cron.
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON stripe_events_processed (processed_at);

-- Fast lookup for the reconciliation job: all events still unresolved.
CREATE INDEX IF NOT EXISTS idx_stripe_events_unresolved
  ON stripe_events_processed (processed_at)
  WHERE unresolved;

-- Only the edge function (service role) reads or writes this table; RLS
-- denies all client access.
ALTER TABLE stripe_events_processed ENABLE ROW LEVEL SECURITY;
