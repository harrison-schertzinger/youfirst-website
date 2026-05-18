/**
 * Pure source inference for a player record.
 *
 * Sprint 2 added Command Center as a third write path alongside the existing
 * seed (Wix history) and public /api/register flows. This helper labels which
 * one a given player came from based on three signals:
 *
 *   - `payment_method === "historical"` on any payment → seeded
 *   - `photo_url` present                              → public /api/register
 *     (only /api/register uploads to the player-photos bucket)
 *   - `created_at` after 2025-11-01 with neither of the above → Command Center
 *   - none of the above → unknown
 *
 * Pure function: callable from server components and from tests without any
 * Supabase / network dependency.
 */

export type SourceLabel =
  | "seeded"
  | "public_signup"
  | "command_center"
  | "unknown";

export interface PlayerSourceInput {
  created_at: string | null;
  photo_url: string | null;
  status?: string | null;
}

export interface PaymentSourceInput {
  payment_method: string | null;
  created_at?: string | null;
}

/** Cutoff for "Command Center" rows. Anything created after this is assumed
 *  to be admin-written when no other signal is present. */
const COMMAND_CENTER_CUTOFF_MS = new Date(
  "2025-11-01T00:00:00Z",
).getTime();

export function inferPlayerSource(
  player: PlayerSourceInput,
  payments: PaymentSourceInput[] | null | undefined,
): SourceLabel {
  const safePayments = Array.isArray(payments) ? payments : [];
  const hasHistorical = safePayments.some(
    (p) => p?.payment_method === "historical",
  );
  if (hasHistorical) return "seeded";

  if (player.photo_url) return "public_signup";

  const createdMs = player.created_at
    ? new Date(player.created_at).getTime()
    : Number.NaN;
  if (
    Number.isFinite(createdMs) &&
    createdMs > COMMAND_CENTER_CUTOFF_MS &&
    !hasHistorical &&
    !player.photo_url
  ) {
    return "command_center";
  }

  return "unknown";
}

/** UI mapping. Colors are deliberate:
 *   - seeded: neutral gray (it's historical, not actionable)
 *   - public_signup: amber — "came from outside your control" warning
 *   - command_center: success green — admin created it intentionally
 *   - unknown: red — surface it so a human investigates
 */
export const sourceLabels: Record<
  SourceLabel,
  { text: string; color: string }
> = {
  seeded: { text: "Seeded from Wix", color: "#6B7280" },
  public_signup: { text: "Public register", color: "#F59E0B" },
  command_center: { text: "Command Center", color: "#34D399" },
  unknown: { text: "Unknown source", color: "#EF4444" },
};
