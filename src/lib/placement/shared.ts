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

import {
  ELITE_DEV_PROGRAM,
  groupKeyForYear,
  TEAM_TIERS,
  type PlacementTier,
  tierLabel,
} from "@/lib/rosters/shared";

export { groupKeyForYear };

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
  // One team across 2029 and 2030 — one group, one send, one anchor.
  blue: "You First Blue",
  elite_youth: ELITE_DEV_PROGRAM,
  elite_training: "Elite Training Group",
};

/**
 * Tiers that are split BY CLASS on the send screen. Blue is absent: it is one
 * team across 2029 and 2030, so it is one group.
 */
export const CLASS_SPLIT_TIERS: readonly SendableTier[] = [
  "elite",
  "elite_youth",
  "elite_training",
];

/**
 * Classes that are NOT offered on this screen. 2028 is being handled separately
 * by Harrison, so it must not appear as an approvable group at all — an empty
 * group he could click is worse than no group.
 */
export const EXCLUDED_CLASSES: readonly string[] = ["2028"];

/**
 * Athletes held out of every send, by roster key, with the reason shown on
 * screen. Harrison is contacting these families himself.
 *
 * This is a HOLD, not a fix for a broken check. Kelsey Lorenzen has a perfectly
 * good address — Anna Lorenzen, from her family's own roster confirmation filed
 * 23 July — which is why she was sendable. The check was right; the decision to
 * hold her is a separate thing, so it gets its own mechanism rather than being
 * disguised as a contact problem.
 *
 * Grace Lanzillotta is already 'declined' and so blocked twice over. She is
 * listed anyway: if her tier ever changes, the hold still stands.
 */
export const HELD_ATHLETES: Record<string, string> = {
  "reg:ffb64ea4-1fb9-466b-81ac-8d0dd5297888": "Kelsey Lorenzen",
  "player:36e8db08-366e-4806-9b4e-01992f113426": "Grace Lanzillotta",
};

/** "2030:elite", or "blue" — the id of one approvable group. */
export function groupKeyFor(tier: SendableTier, classKey: string | null): string {
  return tier === "blue" ? "blue" : `${classKey}:${tier}`;
}

/**
 * The phrase that approves a group. Typed, not clicked — and the server
 * compares it independently, so the screen showing it is a convenience, never
 * the gate.
 *
 * It names the CLASS as well as the tier, because the whole point of grouping
 * by class is that approving 2030 must not be confusable with approving 2029.
 */
export function approvalPhrase(
  tier: SendableTier,
  classKey: string | null,
): string {
  const label = TIER_GROUP_LABEL[tier].toUpperCase();
  return tier === "blue" || !classKey
    ? `SEND ${label}`
    : `SEND ${classKey} ${label}`;
}

/** The phrase that approves a nudge round. */
export const NUDGE_APPROVAL = "SEND NUDGE";

// ── Templates ─────────────────────────────────────────────────────────────

export const TEMPLATE_NAME_BY_TIER: Record<SendableTier, string> = {
  elite: "Placement — Elite",
  blue: "Placement — Blue",
  elite_youth: "Placement — Elite Development Program",
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

/**
 * The confirmation deadline. A FIXED DATE, not a per-send input — one date for
 * the whole round, so no group can go out carrying a different one and nobody
 * has to fill anything in before approving.
 *
 * Exposed to templates as {{deadline}} and seeded as the default deadline
 * region, so a template gets it whether it writes the date or the token.
 */
export const PLACEMENT_DEADLINE = "August 7";
export const PLACEMENT_DEADLINE_LONG = "Friday, August 7";

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
/**
 * The regions the copy actually has.
 *
 *   opening    the greeting and what this placement is
 *   spine      the club paragraphs, identical in all four offers and expanded
 *              INLINE in each — not a shared snippet, so a change to one offer
 *              can never silently rewrite the other three
 *   closing    what is specific to this tier again, plus the ask
 *   signature  the sign-off
 *
 * `preheader`, `deadline` and `button_label` are OPTIONAL: rendered when a
 * template defines them, skipped when it does not. The final copy carries its
 * deadline inside the closing, so no separate deadline panel is drawn.
 */
export const PLACEMENT_REGIONS = [
  "opening",
  "spine",
  "closing",
  "signature",
] as const;

export const RECEIPT_REGIONS = ["opening", "signature"] as const;

export const NUDGE_REGIONS = ["opening", "signature"] as const;

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

// ── The greeting ──────────────────────────────────────────────────────────

/**
 * Last whitespace-separated token, or null when the name is a single word.
 * Same semantics as splitName() in command-sheet/data.ts, restated here as a
 * pure function so the client bundle never pulls that module in.
 */
export function lastNameOf(fullName: string | null): string | null {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function firstWord(s: string | null): string | null {
  const w = (s ?? "").trim().split(/\s+/)[0];
  return w || null;
}

/**
 * How the email opens.
 *
 *   parent first name known   →  "Meredith —"
 *   not known, surname known  →  "Cline family —"
 *   neither                   →  null
 *
 * Null means HOLD. A headless greeting is worse than an unsent email, so the
 * caller blocks and she surfaces in the cannot-contact bucket instead of going
 * out addressed to nobody.
 */
export function greetingFor(
  parentName: string | null,
  athleteName: string | null,
): string | null {
  const parentFirst = firstWord(parentName);
  if (parentFirst) return `${parentFirst} —`;
  const surname = lastNameOf(athleteName);
  if (surname) return `${surname} family —`;
  return null;
}

// ── Why an athlete cannot be contacted ────────────────────────────────────

export type SkipReason =
  | "no_email"
  | "already_sent"
  | "unwritten_copy"
  | "unfilled_merge_field"
  | "no_template"
  | "no_class_year"
  | "already_confirmed"
  | "banned_language"
  | "no_greeting_name"
  | "held";

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  no_email: "No email on file",
  already_sent: "Already received this email",
  unwritten_copy: "Template still has unwritten copy",
  unfilled_merge_field: "A merge field did not fill",
  no_template: "No template found for this tier",
  no_class_year: "No graduation year on file",
  already_confirmed: "Already confirmed",
  banned_language: "Copy uses language Addendum B bans",
  no_greeting_name: "No parent name and no last name — nothing to greet her by",
  held: "Held — Harrison is contacting this family directly",
};

// ── Addendum B3 — banned language ─────────────────────────────────────────

/**
 * Language that must never reach a family, enforced rather than trusted. A
 * rendered email matching any of these is refused at preview, test and live,
 * exactly like unwritten copy — Addendum B3 says "banned … in every email",
 * and a rule that depends on nobody slipping is not a rule.
 *
 * NOTE ON "DEVELOPMENT": only "developmental" is banned. B3's list never
 * included "development team" — that pattern was an over-reading of B1 on my
 * part, and the final copy disproves it twice: the tier is now the "Elite
 * Development Program", and the Elite Development offer says "our development
 * teams". B1 governs what LABELS a tier, not the word in prose.
 *
 * NOT MACHINE-CHECKABLE, and deliberately not faked here:
 *   · "'second team' USED COMPARATIVELY" — the phrase is flagged outright
 *     rather than judged in context. A false positive costs a rewrite; a false
 *     negative costs a family.
 *   · "any sentence that opens by naming what the athlete did not get" — this
 *     needs a human read. It is called out in every template's guidance.
 */
export const BANNED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: '"developmental"', re: /\bdevelopmental\b/i },
  { label: '"B team"', re: /\bb[\s-]?team\b/i },
  { label: '"second team"', re: /\bsecond\s+team\b/i },
  { label: '"lower team"', re: /\blower\s+team\b/i },
  { label: '"tier 2"', re: /\btier\s*2\b/i },
  { label: '"didn\'t make it"', re: /\bdid\s?n[o']?t\s+make\s+(it|the)\b/i },
  { label: '"unfortunately"', re: /\bunfortunately\b/i },
];

/**
 * Every banned phrase present in the text, by label.
 *
 * `[[ ]]` blocks are stripped first: those are authoring guidance, not copy,
 * and the guidance necessarily quotes the very words it is warning about.
 * Nothing is lost by ignoring them — unwritten copy is already its own hard
 * block, so a template containing a `[[ ]]` cannot send regardless, and once
 * the blocks are deleted this check sees the real copy.
 */
export function bannedLanguageIn(text: string): string[] {
  const copyOnly = String(text).replace(/\[\[[\s\S]*?\]\]/g, " ");
  const hits = new Set<string>();
  for (const { label, re } of BANNED_PATTERNS) {
    if (re.test(copyOnly)) hits.add(label);
  }
  return Array.from(hits);
}

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
  /**
   * Exactly how her email will open — "Meredith —" or "Cline family —".
   * Shown on the send screen so a misspelled surname is caught BEFORE the send,
   * not discovered in a family's inbox. Null means the send is held.
   */
  greeting: string | null;
  /** Non-null once she has received her placement email. */
  sentAt: string | null;
  confirmedAt: string | null;
  /** Populated when this athlete cannot be sent to right now. */
  blockedBy: SkipReason | null;
}

export interface SendGroup {
  /** "2030:elite" | "blue" — stable id for typed-approval state and anchors. */
  key: string;
  tier: SendableTier;
  /** "2030", "2033/2034", or null for Blue which spans two classes. */
  classKey: string | null;
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
  /**
   * Placed, but with no graduation year, so she belongs to no class group.
   * Listed once at the bottom rather than dropped — she cannot be sent to
   * either way, but she must still be visible.
   */
  noClassYear: SendCandidate[];
  templateHealth: {
    tier: SendableTier | "receipt" | "nudge";
    templateName: string;
    found: boolean;
    /** Regions still carrying [[ ]] copy Harrison has not written. */
    unwritten: string[];
    missingRegions: string[];
    /** Addendum B3 phrases found in the copy. */
    banned: string[];
  }[];
  fetchedAt: string;
}
