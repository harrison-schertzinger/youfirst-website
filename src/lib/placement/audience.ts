/**
 * Who is about to receive a placement email. Server only.
 *
 * The audience is derived from T1's roster data (src/lib/rosters/data.ts) —
 * the same unified athlete the placement decision was made on, so the send
 * screen can never disagree with the roster screen about who is in what. This
 * module reads that data; it never writes to it.
 *
 * The screen shows NAMES, never counts, for every bucket including the ones
 * being skipped. An athlete who is quietly dropped is the failure mode this
 * whole sprint exists to prevent.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { buildRosterData, type RosterAthlete } from "@/lib/rosters/data";
import {
  loadTemplates,
  templateHealth,
  type TemplateBundle,
} from "@/lib/placement/templates";
import {
  CLASS_SPLIT_TIERS,
  cycleKeyFor,
  EXCLUDED_CLASSES,
  greetingFor,
  groupKeyFor,
  groupKeyForYear,
  isSendableTier,
  PLACEMENT_CAMPAIGN,
  PLACEMENT_SEASON,
  SEND_KINDS,
  TEMPLATE_NAME_BY_TIER,
  TIER_GROUP_LABEL,
  tierLabel,
  type ExcludedBucket,
  type SendAudience,
  type SendCandidate,
  type SendGroup,
  type SendableTier,
  type SkipReason,
} from "@/lib/placement/shared";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function usableEmail(raw: string | null): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export interface SendableAthlete {
  key: string;
  table: "players" | "tryout_registrations";
  id: string;
  name: string;
  classYear: number | null;
  tier: SendableTier;
  parentName: string | null;
  email: string | null;
}

/** Everyone with a sendable placement, in one flat list. */
export function sendableAthletes(athletes: RosterAthlete[]): SendableAthlete[] {
  const out: SendableAthlete[] = [];
  for (const a of athletes) {
    if (!isSendableTier(a.placementTier)) continue;
    out.push({
      key: a.key,
      table: a.table,
      id: a.id,
      name: a.name,
      classYear: a.classYear,
      tier: a.placementTier,
      parentName: a.parentName,
      email: usableEmail(a.parentEmail),
    });
  }
  return out;
}

export interface SendState {
  /** cycle_key → created_at of the placement email already sent. */
  sentAt: Map<string, string>;
  /** cycle_key → confirmed_at, from placement_tokens. */
  confirmedAt: Map<string, string>;
}

/**
 * IDEMPOTENCY IS READ FROM THE DATABASE, never from memory.
 *
 * `claimed` counts as sent: a row stuck in 'claimed' means a previous run died
 * mid-send. Treating it as unsent would re-send to a family who may already
 * have the email. It has to be inspected by a human and cleared by hand.
 */
export async function loadSendState(
  db: SupabaseClient,
  kind: string = SEND_KINDS.placement,
): Promise<SendState> {
  const [log, tokens] = await Promise.all([
    db
      .from("hermes_send_log")
      .select("cycle_key, created_at, status")
      .eq("kind", kind)
      .in("status", ["claimed", "sent"])
      .like("cycle_key", `${PLACEMENT_CAMPAIGN}|%`),
    db
      .from("placement_tokens")
      .select("athlete_table, athlete_id, confirmed_at")
      .eq("campaign", PLACEMENT_CAMPAIGN)
      .not("confirmed_at", "is", null),
  ]);

  if (log.error) throw new Error(`Send log read failed: ${log.error.message}`);
  if (tokens.error) throw new Error(`Token read failed: ${tokens.error.message}`);

  const sentAt = new Map<string, string>();
  for (const r of (log.data ?? []) as { cycle_key: string; created_at: string }[]) {
    const prev = sentAt.get(r.cycle_key);
    if (!prev || r.created_at < prev) sentAt.set(r.cycle_key, r.created_at);
  }

  const confirmedAt = new Map<string, string>();
  for (const t of (tokens.data ?? []) as {
    athlete_table: string;
    athlete_id: string;
    confirmed_at: string;
  }[]) {
    confirmedAt.set(cycleKeyFor(t.athlete_table, t.athlete_id), t.confirmed_at);
  }

  return { sentAt, confirmedAt };
}

/**
 * Why this athlete cannot be sent to right now — or null if she can.
 * Order matters: the most specific, most actionable reason wins.
 */
export function blockReason(
  a: SendableAthlete,
  state: SendState,
  bundle: TemplateBundle,
): SkipReason | null {
  if (!a.email) return "no_email";
  if (a.classYear == null) return "no_class_year";
  // Nothing to greet her by. Surfaced here so she appears in cannot-contact
  // with a reason, rather than sitting in the ready list and being skipped at
  // send time with no warning.
  if (!greetingFor(a.parentName, a.name)) return "no_greeting_name";
  if (state.sentAt.has(cycleKeyFor(a.table, a.id))) return "already_sent";
  if (!bundle.byName.has(TEMPLATE_NAME_BY_TIER[a.tier])) return "no_template";
  return null;
}

function toCandidate(
  a: SendableAthlete,
  state: SendState,
  blockedBy: SkipReason | null,
): SendCandidate {
  const key = cycleKeyFor(a.table, a.id);
  return {
    key: a.key,
    table: a.table,
    id: a.id,
    name: a.name,
    classYear: a.classYear,
    tier: a.tier,
    placementLabel: tierLabel(a.tier, a.classYear),
    parentName: a.parentName,
    email: a.email,
    greeting: greetingFor(a.parentName, a.name),
    sentAt: state.sentAt.get(key) ?? null,
    confirmedAt: state.confirmedAt.get(key) ?? null,
    blockedBy,
  };
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

export async function buildAudience(db: SupabaseClient): Promise<SendAudience> {
  const [roster, bundle, state] = await Promise.all([
    buildRosterData(db),
    loadTemplates(db),
    loadSendState(db),
  ]);

  const sendable = sendableAthletes(roster.athletes);

  // By exclusion, not by enumeration: anyone who is not sendable is counted
  // and named here, whatever her tier says.
  const excludedCounts = new Map<string, number>();
  for (const a of roster.athletes) {
    if (isSendableTier(a.placementTier)) continue;
    const key = a.placementTier ?? "__unplaced__";
    excludedCounts.set(key, (excludedCounts.get(key) ?? 0) + 1);
  }
  const excluded: ExcludedBucket[] = Array.from(excludedCounts.entries())
    .map(([tier, count]) => ({
      tier,
      label: tier === "__unplaced__" ? "Not placed yet" : tierLabel(tier, null),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // ── The class each athlete is offered under ─────────────────────────────
  // groupKeyForYear is T1's, so these keys ARE the roster screen's tabs —
  // including the combined 2033/2034.
  const classOf = (a: SendableAthlete): string | null =>
    a.classYear == null ? null : groupKeyForYear(a.classYear);

  const noClassYear: SendCandidate[] = [];
  const buckets = new Map<string, SendableAthlete[]>();
  const classMinYear = new Map<string, number>();

  for (const a of sendable) {
    const cls = classOf(a);
    if (a.tier === "blue") {
      // Blue is ONE team across 2029 and 2030 — one group, never split.
      const list = buckets.get("blue") ?? [];
      list.push(a);
      buckets.set("blue", list);
      continue;
    }
    if (cls == null) {
      noClassYear.push(toCandidate(a, state, blockReason(a, state, bundle)));
      continue;
    }
    if (EXCLUDED_CLASSES.includes(cls)) continue;
    classMinYear.set(cls, Math.min(classMinYear.get(cls) ?? 9999, a.classYear!));
    const key = groupKeyFor(a.tier, cls);
    const list = buckets.get(key) ?? [];
    list.push(a);
    buckets.set(key, list);
  }

  const build = (
    key: string,
    tier: SendableTier,
    classKey: string | null,
  ): SendGroup => {
    const ready: SendCandidate[] = [];
    const alreadySent: SendCandidate[] = [];
    const cannotContact: SendCandidate[] = [];
    for (const a of buckets.get(key) ?? []) {
      const reason = blockReason(a, state, bundle);
      const candidate = toCandidate(a, state, reason);
      if (reason === null) ready.push(candidate);
      else if (reason === "already_sent") alreadySent.push(candidate);
      else cannotContact.push(candidate);
    }
    return {
      key,
      tier,
      classKey,
      label: TIER_GROUP_LABEL[tier],
      ready: ready.sort(byName),
      alreadySent: alreadySent.sort(byName),
      cannotContact: cannotContact.sort(byName),
    };
  };

  // Classes ascending, each with its tiers in a fixed order; Blue last, because
  // it belongs to no single class.
  const groups: SendGroup[] = [];
  const classes = Array.from(classMinYear.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);

  for (const cls of classes) {
    for (const tier of CLASS_SPLIT_TIERS) {
      const key = groupKeyFor(tier, cls);
      if (!buckets.has(key)) continue;
      groups.push(build(key, tier, cls));
    }
  }
  if (buckets.has("blue")) groups.push(build("blue", "blue", null));

  return {
    campaign: PLACEMENT_CAMPAIGN,
    season: PLACEMENT_SEASON,
    groups,
    excluded,
    noClassYear: noClassYear.sort(byName),
    templateHealth: templateHealth(bundle),
    fetchedAt: new Date().toISOString(),
  };
}
