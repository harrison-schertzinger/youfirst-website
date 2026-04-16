-- Run this once in the Supabase SQL editor BEFORE accepting live payments.
--
-- Why: the Stripe webhook handler (src/app/api/stripe/webhook/route.ts)
-- relies on this unique index to prevent double-processing when Stripe
-- retries a delivery and two handlers run concurrently. Without it,
-- a duplicate webhook can double-credit a payment plan.
--
-- Safe to re-run — CREATE UNIQUE INDEX IF NOT EXISTS is idempotent.
-- The partial WHERE clause preserves manual entries with NULL session id.

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_id_unique
  ON payments (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
