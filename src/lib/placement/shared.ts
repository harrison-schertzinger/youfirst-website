/**
 * Placement emails — vocabulary shared by server and client.
 *
 * Pure data and pure functions only. Anything that touches Supabase, env vars
 * or Resend lives in the sibling server modules so the admin client bundle
 * never pulls a service-role key into the browser.
 *
 * The tier vocabulary is T1's (src/lib/rosters/shared.ts) and is imported, not
 * restated — one definition of what a placement is.
 */

import { TEAM_TIERS, type PlacementTier, tierLabel } from "@/lib/rosters/shared";

export { tierLabel };
export type { PlacementTier };

// ── Who can be emailed ────────────────────────────────────────────────────

/**
 * The tiers that receive a placement email — T1's TEAM_TIERS, imported rather
 * than restated so the two lists cannot drift. Everything else in the
 * placement vocabulary (declined, no_tryout, no_registration) and null are
 * hard blocks, not filters. This type is the first line of that defence; the
 * schema (placement_tokens.placement_tier CHECK) is the last.
 */
export const SENDABLE_TIERS = TEAM_TIERS;
export type SendableTier = (typeof TEAM_TIERS)[number];

export function isSendableTier(v: string | null): v is SendableTier {
  return v != null && (SENDABLE_TIERS as readonly string[]).includes(v);
}

/** Group order on the send screen — the order Harrison works down. */
export const TIER_ORDER: readonly SendableTier[] = SENDABLE_TIERS;

export const TIER_GROUP_LABEL: Record<SendableTier, string> = {
  elite: "Elite",
  blue: "Blue",
  elite_youth: "Elite Youth Program",
  elite_training: "Elite Training Group",
};

/**
 * The phrase that approves a group. Typed, not clicked — and the server
 * compares it independently, so the screen showing it is a convenience, never
 * the gate.
 */
export function approvalPhrase(tier: SendableTier): string {
  return `SEND ${TIER_GROUP_LABEL[tier].toUpperCase()}`;
}

/** The phrase that approves a nudge round. */
export const NUDGE_APPROVAL = "SEND NUDGE";

// ── Templates ─────────────────────────────────────────────────────────────

export const TEMPLATE_NAME_BY_TIER: Record<SendableTier, string> = {
  elite: "Placement — Elite",
  blue: "Placement — Blue",
  elite_youth: "Placement — Elite Youth Program",
  elite_training: "Placement — Elite Training Group",
};

export const RECEIPT_TEMPLATE_NAME = "Placement — Confirmation Receipt";
export const NUDGE_TEMPLATE_NAME = "Placement — Unconfirmed Nudge";

// ── The campaign ──────────────────────────────────────────────────────────

/**
 * One campaign per placement round. It is half of every idempotency key, so
 * changing it deliberately re-opens the whole audience for a second send —
 * which is exactly what you would want next season, and exactly what you must
 * never do by accident. It is a constant here rather than an input for that
 * reason.
 */
export const PLACEMENT_CAMPAIGN = "placement-2026-27";

export const PLACEMENT_SEASON = "2026–27";

/** hermes_send_log.kind values this sprint owns. */
export const SEND_KINDS = {
  placement: "placement",
  nudge: "placement_nudge",
  receipt: "placement_receipt",
  /** Test sends log here — outside the unique index, so a test can never
   *  consume a real athlete's dedup key. Mirrors the collections_test pattern. */
  test: "placement_test",
} as const;

/** "placement-2026-27|reg:8f0c…" — never null, unlike player_id. */
export function athleteKey(table: string, id: string): string {
  return `${table === "players" ? "player" : "reg"}:${id}`;
}

export function cycleKeyFor(
  table: string,
  id: string,
  suffix?: string,
): string {
  const base = `${PLACEMENT_CAMPAIGN}|${athleteKey(table, id)}`;
  return suffix ? `${base}|${suffix}` : base;
}

// ── Nudges ────────────────────────────────────────────────────────────────

/** Days after the placement send that an unconfirmed family is nudged. */
export const NUDGE_DAYS = [4, 7] as const;
export type NudgeDay = (typeof NUDGE_DAYS)[number];

// ── Content regions ───────────────────────────────────────────────────────

/**
 * A template body is a sequence of `--- key ---` regions. The email shell
 * renders each into its designed slot; the regions are the only thing that
 * varies between the five placement templates.
 */
export const PLACEMENT_REGIONS = [
  "preheader",
  "opening",
  "pillar_1",
  "pillar_2",
  "pillar_3",
  "pillar_4",
  "staff",
  "summer",
  "platform",
  "button_label",
  "deadline",
  "signature",
] as const;

export const RECEIPT_REGIONS = [
  "preheader",
  "opening",
  "whats_next",
  "button_label",
  "signature",
] as const;

export const NUDGE_REGIONS = [
  "preheader",
  "opening",
  "button_label",
  "deadline",
  "signature",
] as const;

export type RegionKey =
  | (typeof PLACEMENT_REGIONS)[number]
  | (typeof RECEIPT_REGIONS)[number]
  | (typeof NUDGE_REGIONS)[number];

export type EmailShape = "placement" | "receipt" | "nudge";

export function regionsFor(shape: EmailShape): readonly string[] {
  if (shape === "receipt") return RECEIPT_REGIONS;
  if (shape === "nudge") return NUDGE_REGIONS;
  return PLACEMENT_REGIONS;
}

// ── Why an athlete cannot be contacted ────────────────────────────────────

export type SkipReason =
  | "no_email"
  | "already_sent"
  | "unwritten_copy"
  | "unfilled_merge_field"
  | "no_template"
  | "no_class_year"
  | "already_confirmed";

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  no_email: "No email on file",
  already_sent: "Already received this email",
  unwritten_copy: "Template still has unwritten copy",
  unfilled_merge_field: "A merge field did not fill",
  no_template: "No template found for this tier",
  no_class_year: "No graduation year on file",
  already_confirmed: "Already confirmed",
};

// ── Shapes crossing the wire to the send screen ───────────────────────────

export interface SendCandidate {
  key: string;
  table: "players" | "tryout_registrations";
  id: string;
  name: string;
  classYear: number | null;
  tier: SendableTier;
  placementLabel: string;
  parentName: string | null;
  email: string | null;
  /** Non-null once she has received her placement email. */
  sentAt: string | null;
  confirmedAt: string | null;
  /** Populated when this athlete cannot be sent to right now. */
  blockedBy: SkipReason | null;
}

export interface SendGroup {
  tier: SendableTier;
  label: string;
  /** Everyone who would receive the email if this group were approved. */
  ready: SendCandidate[];
  /** Already sent — shown so the count is honest, never re-sent. */
  alreadySent: SendCandidate[];
  /** Placed, but unreachable. Named, with the reason, never silently dropped. */
  cannotContact: SendCandidate[];
}

/**
 * A placement decision that is NOT a send. Derived by exclusion — every
 * athlete who is not in a sendable tier lands in one of these, whatever her
 * tier value is. A tier added to the roster vocabulary later shows up here on
 * its own rather than silently disappearing from both the audience and the
 * excluded count.
 */
export interface ExcludedBucket {
  tier: string;
  label: string;
  count: number;
}

export interface SendAudience {
  campaign: string;
  season: string;
  groups: SendGroup[];
  /** Never sendable — counted and named, never listed as a recipient. */
  excluded: ExcludedBucket[];
  templateHealth: {
    tier: SendableTier | "receipt" | "nudge";
    templateName: string;
    found: boolean;
    /** Regions still carrying [[ ]] copy Harrison has not written. */
    unwritten: string[];
    missingRegions: string[];
  }[];
  fetchedAt: string;
}
