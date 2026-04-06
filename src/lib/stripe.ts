import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

/**
 * Returns a Stripe client if a real key is configured.
 * Returns null when using placeholder keys so the app
 * can show a friendly error instead of crashing.
 */
export function getStripe(): Stripe | null {
  if (!key || key === "sk_test_placeholder" || !key.startsWith("sk_")) {
    return null;
  }
  return new Stripe(key);
}
