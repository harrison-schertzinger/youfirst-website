/**
 * Sending placement email. Server only.
 *
 * THE SAFETY POSTURE, in the order the guards fire:
 *
 *   1. NOTHING SENDS AUTOMATICALLY. There is no cron entry, no trigger, no
 *      send-on-save and no send-on-placement anywhere in this sprint. Every
 *      function in this file is reachable only from an admin-authenticated
 *      route that a human clicked.
 *   2. The audience is re-derived from the database on every send. The client
 *      posts a tier and a typed confirmation, never a recipient list — a
 *      tampered or merely stale browser cannot widen the audience.
 *   3. placement_tier null or 'declined' is a hard block. It cannot be
 *      overridden by an argument, because no argument reaches it.
 *   4. No email on file is a hard block, and she is named in the response.
 *   5. Idempotency is a partial unique index on hermes_send_log, claimed
 *      BEFORE the send. Two overlapping runs cannot both send: exactly one
 *      insert wins and the loser skips.
 *   6. Unwritten copy or an unfilled merge field is a hard block. An email
 *      reading "[[ THE OPENING ]]" or "{{player_name}}" never leaves.
 *
 * Dry runs write the full log with status 'dry_run', which sits OUTSIDE the
 * unique index — so a rehearsal produces a complete, inspectable record
 * without consuming any athlete's one-time send.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { sendAdminNotification, adminSubject } from "@/lib/admin-notify";
import {
  ADMIN_NOTIFY,
  SITE_URL,
  STANDARD_URL,
  idempotencyKeyFor,
  sendViaResend,
} from "@/lib/placement/config";
import {
  buildAudience,
  loadSendHistory,
  loadSendState,
  resendBlockReason,
  sendableAthletes,
  usableEmail,
} from "@/lib/placement/audience";
import { correctAddress, type AddressCorrection } from "@/lib/placement/address";
import { buildRosterData } from "@/lib/rosters/data";
import { loadTemplates, renderEmail } from "@/lib/placement/templates";
import { standardIsWritten } from "@/content/standard";
import {
  findTokenForAthlete,
  issueToken,
  type TokenRow,
} from "@/lib/placement/tokens";
import {
  approvalPhrase,
  cycleKeyFor,
  EMPTY_HISTORY,
  EXCLUDED_CLASSES,
  HELD_ATHLETES,
  greetingFor,
  groupKeyForYear,
  isSendableTier,
  NUDGE_DAYS,
  PLACEMENT_CAMPAIGN,
  RESEND_BLOCK_LABEL,
  RESEND_COOLDOWN_SECONDS,
  SEND_KINDS,
  SKIP_REASON_LABEL,
  TIER_GROUP_LABEL,
  tierLabel,
  type EmailShape,
  type NudgeDay,
  type ResendBlock,
  type SendableTier,
  type SkipReason,
} from "@/lib/placement/shared";

export type SendMode = "dry_run" | "test" | "live";

export interface SendOutcome {
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}

export interface SkippedAthlete {
  name: string;
  reason: SkipReason | "blocked";
  detail: string;
}

export interface SendReport {
  mode: SendMode;
  tier: SendableTier;
  campaign: string;
  attempted: number;
  sent: SendOutcome[];
  failed: SendOutcome[];
  skipped: SkippedAthlete[];
  /** Present when the whole run refused before touching anyone. */
  refusal?: string;
}

export { approvalPhrase };

// ── Preview ───────────────────────────────────────────────────────────────

export interface PreviewResult {
  name: string;
  email: string | null;
  placementLabel: string;
  subject?: string;
  html?: string;
  text?: string;
  confirmUrl?: string;
  blocked?: { reason: SkipReason; detail: string };
}

/**
 * One athlete's email, rendered with her real merge values and her real
 * confirmation link — the same link the send would use, because issuing is
 * idempotent per (campaign, athlete). What Harrison previews is what ships.
 */
export async function previewAthlete(
  db: SupabaseClient,
  athleteKey: string,
): Promise<PreviewResult | null> {
  const [roster, bundle] = await Promise.all([
    buildRosterData(db),
    loadTemplates(db),
  ]);
  const athlete = sendableAthletes(roster.athletes).find(
    (a) => a.key === athleteKey,
  );
  if (!athlete) return null;

  const placementLabel = tierLabel(athlete.tier, athlete.classYear);

  if (!athlete.email) {
    return {
      name: athlete.name,
      email: null,
      placementLabel,
      blocked: {
        reason: "no_email",
        detail: "No email on file — this family cannot be contacted by email.",
      },
    };
  }
  if (athlete.classYear == null) {
    return {
      name: athlete.name,
      email: athlete.email,
      placementLabel,
      blocked: {
        reason: "no_class_year",
        detail: "No graduation year on file — set or merge her before sending.",
      },
    };
  }

  const { url } = await issueToken(db, {
    table: athlete.table,
    id: athlete.id,
    name: athlete.name,
    classYear: athlete.classYear,
    tier: athlete.tier,
    email: athlete.email,
    parentName: athlete.parentName,
  });

  const rendered = renderEmail(
    bundle,
    "placement",
    {
      name: athlete.name,
      classYear: athlete.classYear,
      tier: athlete.tier,
      parentName: athlete.parentName,
      confirmUrl: url,
    },
    url,
  );

  if (!rendered.ok) {
    return {
      name: athlete.name,
      email: athlete.email,
      placementLabel,
      confirmUrl: url,
      blocked: { reason: rendered.reason, detail: rendered.detail },
    };
  }

  return {
    name: athlete.name,
    email: athlete.email,
    placementLabel,
    confirmUrl: url,
    subject: rendered.email.subject,
    html: rendered.email.html,
    text: rendered.email.text,
  };
}

// ── The group send ────────────────────────────────────────────────────────

export interface SendGroupInput {
  tier: SendableTier;
  /**
   * The class being approved — "2030", "2033/2034". REQUIRED for every tier
   * except Blue, which is one team across 2029 and 2030 and so has no single
   * class. A missing classKey on a class-split tier REFUSES the whole run
   * rather than falling back to "everyone": the entire point of grouping by
   * class is that approving 2030 can never reach 2029.
   */
  classKey?: string | null;
  mode: SendMode;
  /** Required for mode 'test' — the only address a test may ever reach. */
  testTo?: string;
  /**
   * Restrict the run to one athlete. Honoured in TEST and DRY_RUN — the two
   * modes that cannot reach a family — and IGNORED in live, where narrowing
   * could make a partial send look complete while most of the group goes out
   * to nobody.
   *
   * Without it a test renders every athlete in the group and delivers all of
   * them to the tester: 72 identical emails for Elite.
   *
   * Dry run honours it so the narrowing itself can be PROVEN before a real
   * send — asserting the exact feature you are about to depend on, using a
   * mode that emails nobody. Gating this to test-only made that check
   * impossible, which is how 72 emails once went out.
   */
  athleteKey?: string;
  /** TEST MODE ONLY — which header band to render. See config.HEADER_VARIANTS. */
  headerVariant?: string | null;
  /** Who clicked. Recorded in the log so a send always has an author. */
  actor: string;
}

export async function sendGroup(
  db: SupabaseClient,
  input: SendGroupInput,
): Promise<SendReport> {
  const { tier, mode, actor } = input;
  const report: SendReport = {
    mode,
    tier,
    campaign: PLACEMENT_CAMPAIGN,
    attempted: 0,
    sent: [],
    failed: [],
    skipped: [],
  };

  const classKey = input.classKey ?? null;
  if (tier !== "blue" && !classKey) {
    report.refusal =
      "No class given. A class-split group must name its class, or the send " +
      "would reach every class at once.";
    return report;
  }
  if (classKey && EXCLUDED_CLASSES.includes(classKey)) {
    report.refusal = `${classKey} is not offered on this screen.`;
    return report;
  }

  const [roster, bundle, state] = await Promise.all([
    buildRosterData(db),
    loadTemplates(db),
    loadSendState(db),
  ]);

  // THE AUDIENCE IS DERIVED HERE, from the database, every time — from
  // graduation class AND tier together. The client sends two labels and a typed
  // phrase; it never sends a recipient list, and it cannot widen one.
  const audience = sendableAthletes(roster.athletes).filter(
    (a) =>
      a.tier === tier &&
      // Blue spans 2029+2030 by definition; every other tier is pinned to its
      // class, so a 2030 approval cannot reach a 2029.
      (tier === "blue" ||
        (a.classYear != null && groupKeyForYear(a.classYear) === classKey)) &&
      // Narrowing never applies to a live send — see SendGroupInput.
      (mode === "live" || !input.athleteKey || a.key === input.athleteKey),
  );

  for (const athlete of audience) {
    // ── Hard blocks, before anything is claimed or rendered ──────────────
    if (!isSendableTier(athlete.tier)) {
      report.skipped.push({
        name: athlete.name,
        reason: "blocked",
        detail: "Not a sendable placement.",
      });
      continue;
    }
    if (athlete.key in HELD_ATHLETES) {
      report.skipped.push({
        name: athlete.name,
        reason: "held",
        detail: SKIP_REASON_LABEL.held,
      });
      continue;
    }
    if (!athlete.email) {
      report.skipped.push({
        name: athlete.name,
        reason: "no_email",
        detail: SKIP_REASON_LABEL.no_email,
      });
      continue;
    }
    if (athlete.classYear == null) {
      report.skipped.push({
        name: athlete.name,
        reason: "no_class_year",
        detail: SKIP_REASON_LABEL.no_class_year,
      });
      continue;
    }
    if (!greetingFor(athlete.parentName, athlete.name)) {
      report.skipped.push({
        name: athlete.name,
        reason: "no_greeting_name",
        detail: SKIP_REASON_LABEL.no_greeting_name,
      });
      continue;
    }

    const cycleKey = cycleKeyFor(athlete.table, athlete.id);

    // A test send is exempt from the dedup check on purpose — Harrison must be
    // able to test the same athlete's email as many times as he likes. It is
    // logged under 'placement_test', outside the unique index, so it can never
    // consume her real one-time send.
    if (mode !== "test" && state.sentAt.has(cycleKey)) {
      report.skipped.push({
        name: athlete.name,
        reason: "already_sent",
        detail: SKIP_REASON_LABEL.already_sent,
      });
      continue;
    }

    const { url } = await issueToken(db, {
      table: athlete.table,
      id: athlete.id,
      name: athlete.name,
      classYear: athlete.classYear,
      tier: athlete.tier,
      email: athlete.email,
      parentName: athlete.parentName,
    });

    const rendered = renderEmail(
      bundle,
      "placement",
      {
        name: athlete.name,
        classYear: athlete.classYear,
        tier: athlete.tier,
        parentName: athlete.parentName,
        confirmUrl: url,
      },
      url,
      mode === "test" ? input.headerVariant : null,
    );
    if (!rendered.ok) {
      report.skipped.push({
        name: athlete.name,
        reason: rendered.reason,
        detail: rendered.detail,
      });
      continue;
    }

    report.attempted++;

    const outcome = await deliverOne(db, {
      mode,
      kind: mode === "test" ? SEND_KINDS.test : SEND_KINDS.placement,
      cycleKey:
        mode === "test"
          ? `${cycleKey}|test-${Date.now()}`
          : cycleKey,
      playerId: athlete.table === "players" ? athlete.id : null,
      athleteName: athlete.name,
      realRecipient: athlete.email,
      to: mode === "test" ? (input.testTo ?? "") : athlete.email,
      subject: rendered.email.subject,
      html: rendered.email.html,
      text: rendered.email.text,
      detail: {
        campaign: PLACEMENT_CAMPAIGN,
        tier,
        athlete_table: athlete.table,
        athlete_id: athlete.id,
        athlete_name: athlete.name,
        actor,
      },
      testLabel: mode === "test" ? (input.headerVariant ?? undefined) : undefined,
    });

    if (outcome.status === "skipped") {
      report.attempted--;
      report.skipped.push({
        name: athlete.name,
        reason: "already_sent",
        detail: outcome.detail,
      });
    } else if (outcome.status === "ok") {
      report.sent.push({ name: athlete.name, email: outcome.to, ok: true });
    } else {
      report.failed.push({
        name: athlete.name,
        email: outcome.to,
        ok: false,
        error: outcome.detail,
      });
    }
  }

  if (mode === "live") {
    await notifyWaveSummary(report, actor, classKey);
  }

  return report;
}

// ── One delivery: claim → send → resolve ──────────────────────────────────

interface DeliverInput {
  mode: SendMode;
  kind: string;
  cycleKey: string;
  playerId: string | null;
  athleteName: string;
  /** The family's real address, even when a test redirects elsewhere. */
  realRecipient: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  detail: Record<string, unknown>;
  /** Test sends only — named in the subject so a dozen tests are tellable apart. */
  testLabel?: string;
}

type DeliverOutcome =
  | { status: "ok"; to: string }
  | { status: "failed"; to: string; detail: string }
  | { status: "skipped"; to: string; detail: string };

/**
 * A claim that could not be written, in words a director can act on.
 *
 * THE ONE FACT EVERY BRANCH STATES: nobody was emailed. The claim is written
 * BEFORE the Resend call, so a claim that fails means the send never happened —
 * and that is precisely what an operator staring at an error needs to know
 * first, ahead of any diagnosis.
 *
 * The SQLSTATE never appears here; it goes to the server log for whoever is
 * debugging. What appeared in the drawer before this existed was the raw
 * Postgres text of a constraint violation, which reads as gibberish to the
 * person clicking and as nothing in particular to anyone reviewing a screenshot.
 * That is how a dead send path survived eight days on screen.
 */
function claimFailureMessage(code: string | null, kind: string): string {
  const nobody = "Nothing was emailed — nobody was contacted.";
  switch (code) {
    case "23514":
      return (
        `The send log will not accept a '${kind}' entry, so the send stopped ` +
        `before it started. ${nobody} This is a database migration that has not ` +
        `been applied: '${kind}' needs adding to hermes_send_log_kind_check. ` +
        `Nothing on this screen can fix it — send this line to whoever is on the code.`
      );
    case "23503":
      return (
        `The send log could not link this email to her record, so the send ` +
        `stopped before it started. ${nobody} Her record may have been merged or ` +
        `removed since this screen loaded — reload and check her on the roster.`
      );
    case "42501":
    case "42P01":
      return (
        `The send log could not be written — the server is missing permission ` +
        `or the table is not there. ${nobody} This is a deployment problem, not ` +
        `a data problem; send this line to whoever is on the code.`
      );
    default:
      return (
        `The send could not be recorded, so it was not sent. ${nobody} The ` +
        `details are in the server log` +
        (code ? ` under database code ${code}.` : ".")
      );
  }
}

async function deliverOne(
  db: SupabaseClient,
  input: DeliverInput,
): Promise<DeliverOutcome> {
  const isTestRedirect = input.mode === "test";
  const subject = isTestRedirect
    ? `[TEST${input.testLabel ? ` · ${input.testLabel}` : ""} → ${input.realRecipient}] ${input.subject}`
    : input.subject;
  const testBanner = `*** TEST SEND — the real recipient would be ${input.realRecipient} ***`;
  const html = isTestRedirect
    ? input.html.replace(
        /<body([^>]*)>/i,
        `<body$1><div style="background:#4B9CD3;color:#fff;font:700 13px/1.5 Arial,sans-serif;padding:12px 16px;text-align:center">${testBanner}</div>`,
      )
    : input.html;
  const text = isTestRedirect ? `${testBanner}\n\n${input.text}` : input.text;

  // ── DRY RUN: full log row, no Resend call. status 'dry_run' sits outside
  //    the unique index, so a rehearsal never consumes the real send.
  if (input.mode === "dry_run") {
    await db.from("hermes_send_log").insert({
      kind: input.kind,
      player_id: input.playerId,
      recipient_email: input.realRecipient,
      cycle_key: `${input.cycleKey}|dry-${Date.now()}`,
      subject: input.subject,
      status: "dry_run",
      detail: { ...input.detail, dry_run: true, would_send_to: input.realRecipient },
    });
    return { status: "ok", to: input.realRecipient };
  }

  if (!input.to) {
    return { status: "failed", to: "", detail: "No destination address." };
  }

  // ── CLAIM BEFORE SEND. The partial unique index makes this atomic: if two
  //    invocations overlap, exactly one insert survives and the loser skips.
  //    A read-check alone cannot do this — it leaves a race the width of the
  //    whole send.
  const { data: claim, error: claimErr } = await db
    .from("hermes_send_log")
    .insert({
      kind: input.kind,
      player_id: input.playerId,
      recipient_email: input.to,
      cycle_key: input.cycleKey,
      subject,
      status: "claimed",
      detail: input.detail,
    })
    .select("id")
    .single();

  if (claimErr || !claim) {
    const code = (claimErr as { code?: string } | null)?.code ?? null;
    if (code === "23505") {
      return {
        status: "skipped",
        to: input.to,
        detail: "Already claimed or sent — not sent twice.",
      };
    }
    // The SQLSTATE goes to the log, where someone can act on it. The operator
    // gets sentences. A raw constraint string in a 502 is what hid the missing
    // 'placement_resend' kind for eight days.
    console.error("[placement] claim insert failed — nothing was emailed", {
      kind: input.kind,
      cycle_key: input.cycleKey,
      sqlstate: code,
      message: claimErr?.message ?? "insert returned no row",
      details: (claimErr as { details?: string } | null)?.details ?? null,
      hint: (claimErr as { hint?: string } | null)?.hint ?? null,
    });
    return {
      status: "failed",
      to: input.to,
      detail: claimFailureMessage(code, input.kind),
    };
  }
  const claimId = claim.id as string;

  const result = await sendViaResend({
    to: input.to,
    subject,
    html,
    text,
    // Keyed on the claim's cycle_key AND the destination, so a lost response
    // cannot become a second email. See idempotencyKeyFor.
    idempotencyKey: idempotencyKeyFor(input.cycleKey, input.to),
  });

  // Resolve the claim. A failure resolves to 'failed', which falls outside the
  // unique index — so the athlete can be retried once the cause is fixed.
  await db
    .from("hermes_send_log")
    .update({
      status: result.ok ? "sent" : "failed",
      detail: {
        ...input.detail,
        resend_id: result.id ?? null,
        error: result.error ?? null,
        ...(isTestRedirect ? { redirected_to: input.to } : {}),
      },
    })
    .eq("id", claimId);

  // Per-recipient delivery row so the existing bounce webhook can attribute a
  // failure. Best effort: the email is already gone, and a bookkeeping error
  // must not read as a send failure.
  if (result.id) {
    const { error: delErr } = await db
      .from("hermes_email_deliveries")
      .upsert(
        {
          send_log_id: claimId,
          player_id: input.playerId,
          recipient_email: input.to,
          resend_id: result.id,
          status: result.ok ? "sent" : "failed",
        },
        { onConflict: "resend_id" },
      );
    if (delErr) console.error("[placement] delivery row failed:", delErr);
  }

  return result.ok
    ? { status: "ok", to: input.to }
    : { status: "failed", to: input.to, detail: result.error ?? "unknown" };
}

// ── Sending it again, to the right place ──────────────────────────────────

export interface ResendInput {
  athleteKey: string;
  /** 'test' delivers to the signed-in admin. 'live' reaches the family. */
  mode: "test" | "live";
  /**
   * A corrected address. When it differs from what is on file, it is SAVED to
   * the record the audience reads before anything is sent — see address.ts.
   * Omitted or unchanged, the resend goes where the roster already points.
   */
  email?: string | null;
  /** Required for 'test' — taken from the session, never from the request. */
  testTo?: string;
  actor: string;
}

export interface ResendResult {
  ok: boolean;
  /** Set when nothing was sent, with the reason in plain words. */
  refusal?: string;
  refusalCode?: ResendBlock | "not_found" | "blocked" | "failed";
  /** Seconds left on the cooldown, when that is what refused. */
  cooldownRemaining?: number;
  name?: string;
  /** Where this copy actually went. */
  to?: string;
  /** Present when the operator corrected the address on the way through. */
  correction?: AddressCorrection;
  /**
   * The address a REHEARSAL was asked to save and deliberately did not. A test
   * send changes no record, and the operator has to be told that plainly or
   * they will believe the correction is filed and never send the live one.
   */
  correctionDeferred?: string;
  /** 1 for the first resend, 2 for the second… */
  attempt?: number;
}

/**
 * Send one athlete's placement email again.
 *
 * THE GUARDS, in the order they fire — every one of them re-checked here even
 * when the screen has already checked it, because the screen is a convenience
 * and this is the gate:
 *
 *   1. She must be in the placed audience, derived from the database. The
 *      client posts a key, never a recipient.
 *   2. CONFIRMED IS ABSOLUTE. A family who has said yes is never asked again,
 *      and this is checked against placement_tokens.confirmed_at at the moment
 *      of the click, not against what the browser last saw.
 *   3. Held athletes stay held.
 *   4. She must already have received the original. A "resend" to someone who
 *      never got one is an unapproved original send — that belongs to the
 *      class-approval flow, with its typed phrase, and cannot be reached from
 *      here.
 *   5. COOLDOWN. A second live resend inside RESEND_COOLDOWN_SECONDS is refused
 *      outright — the impatient click cannot produce two emails.
 *   6. The claim. The attempt ordinal is part of the cycle_key and the partial
 *      unique index makes the insert atomic, so two requests that race past the
 *      cooldown together still produce exactly one email.
 *   7. Unwritten copy and banned language block a resend exactly as they block
 *      an original send — it is the same renderer, not a relaxed one.
 *   8. A REHEARSAL WRITES NOTHING. Only mode 'live' may correct an address, and
 *      the mode is derived by the route from the session, so a direct POST
 *      cannot dress a real write up as a test.
 */
export async function resendPlacement(
  db: SupabaseClient,
  input: ResendInput,
): Promise<ResendResult> {
  const { mode, actor } = input;

  const [roster, bundle, state, histories] = await Promise.all([
    buildRosterData(db),
    loadTemplates(db),
    loadSendState(db),
    loadSendHistory(db),
  ]);

  const athlete = sendableAthletes(roster.athletes).find(
    (a) => a.key === input.athleteKey,
  );
  if (!athlete) {
    return {
      ok: false,
      refusalCode: "not_found",
      refusal: "That athlete is not in the placed audience.",
    };
  }

  const cycleKey = cycleKeyFor(athlete.table, athlete.id);
  const history = histories.get(cycleKey) ?? EMPTY_HISTORY;

  // Guards 2–4, from the same function the screen used to decide whether to
  // offer the button at all.
  const blocked = resendBlockReason(athlete, state, history);
  if (blocked) {
    return {
      ok: false,
      refusalCode: blocked,
      refusal: RESEND_BLOCK_LABEL[blocked],
      name: athlete.name,
    };
  }

  const token = await findTokenForAthlete(db, athlete.table, athlete.id);
  if (!token) {
    return {
      ok: false,
      refusalCode: "not_found",
      refusal: "She has no confirmation link on file — nothing to send again.",
      name: athlete.name,
    };
  }
  // Belt and braces: the token carries confirmation too, and it is the row the
  // family's tap actually writes. If the two ever disagree, the stricter wins.
  if (token.confirmed_at) {
    return {
      ok: false,
      refusalCode: "confirmed",
      refusal: RESEND_BLOCK_LABEL.confirmed,
      name: athlete.name,
    };
  }

  // ── The address ────────────────────────────────────────────────────────
  const requested = input.email ? usableEmail(input.email) : null;
  if (input.email && !requested) {
    return {
      ok: false,
      refusalCode: "blocked",
      refusal: "That is not a valid email address.",
      name: athlete.name,
    };
  }

  /**
   * A REHEARSAL CHANGES NOTHING.
   *
   * correctAddress used to run whatever the mode was, and the drawer's "Send
   * this to me" button posts whatever is in the address field — so typing a
   * correction and clicking the test button wrote the guardian row, the token,
   * and a shared sibling's address in production, then emailed the admin. One
   * click, no arming step, under a tooltip that said it only sends to your own
   * address. Given the send path was dead at the time, that made the mode which
   * reaches nobody the only mode that changed anything.
   *
   * THE GATE IS HERE, IN THE SERVER, not in the drawer. The drawer is a
   * convenience and a direct POST is one curl away; only the mode the route
   * derives — from the session for test, never from the request body — decides
   * whether a record may be written.
   *
   * The requested address is dropped entirely for a rehearsal rather than merely
   * withheld from correctAddress, because issueToken() re-stamps
   * placement_tokens.recipient_email from whatever address it is handed. Passing
   * an operator-typed value through would have written it to the token even with
   * correctAddress skipped — the same mutation, one door along.
   */
  const isRehearsal = mode !== "live";
  const correctionRequested =
    requested && requested !== athlete.email ? requested : null;

  const onFile = athlete.email ?? history.lastSentTo;
  const target = isRehearsal ? onFile : (requested ?? onFile);
  if (!target) {
    return {
      ok: false,
      refusalCode: "no_email",
      refusal: RESEND_BLOCK_LABEL.no_email,
      name: athlete.name,
    };
  }

  // ── Guard 5: the cooldown ──────────────────────────────────────────────
  // Read from the log, not from memory — a second browser tab is still the
  // same impatient click.
  const priorResends = history.resends.filter((r) => r.status !== "failed");
  if (mode === "live") {
    const last = priorResends[priorResends.length - 1];
    if (last) {
      const elapsed = (Date.now() - new Date(last.at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        return {
          ok: false,
          refusalCode: "cooling_down",
          refusal: RESEND_BLOCK_LABEL.cooling_down,
          cooldownRemaining: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
          name: athlete.name,
        };
      }
    }
  }

  // The correction is saved BEFORE the send, so an email that goes to a new
  // address is never reported against a record still holding the old one. Live
  // only — see isRehearsal above.
  let correction: AddressCorrection | undefined;
  if (!isRehearsal && correctionRequested) {
    correction = await correctAddress(db, athlete, token.id, correctionRequested);
  }
  /** A rehearsal was asked to change the address and deliberately did not. */
  const correctionDeferred = isRehearsal ? (correctionRequested ?? undefined) : undefined;

  // Re-issue with the FINAL address so the token agrees with what was just
  // saved, and so the link in this email is the link she already has.
  const { url } = await issueToken(db, {
    table: athlete.table,
    id: athlete.id,
    name: athlete.name,
    classYear: athlete.classYear,
    tier: athlete.tier,
    email: target,
    parentName: athlete.parentName,
  });

  const rendered = renderEmail(
    bundle,
    "placement",
    {
      name: athlete.name,
      classYear: athlete.classYear,
      tier: athlete.tier,
      parentName: athlete.parentName,
      confirmUrl: url,
    },
    url,
  );
  if (!rendered.ok) {
    return {
      ok: false,
      refusalCode: "blocked",
      refusal: rendered.detail,
      name: athlete.name,
      correction,
      correctionDeferred,
    };
  }

  const attempt = priorResends.length + 1;

  const outcome = await deliverOne(db, {
    mode,
    kind: mode === "test" ? SEND_KINDS.test : SEND_KINDS.resend,
    // Guard 6. In live the ordinal makes the key unique per attempt and the
    // partial index makes the claim atomic; in test it is timestamped, outside
    // the index, so Harrison can rehearse as often as he likes.
    cycleKey:
      mode === "test"
        ? `${cycleKey}|resend-test-${Date.now()}`
        : `${cycleKey}|resend-${attempt}`,
    playerId: athlete.table === "players" ? athlete.id : null,
    athleteName: athlete.name,
    realRecipient: target,
    to: mode === "test" ? (input.testTo ?? "") : target,
    subject: rendered.email.subject,
    html: rendered.email.html,
    text: rendered.email.text,
    detail: {
      campaign: PLACEMENT_CAMPAIGN,
      tier: athlete.tier,
      athlete_table: athlete.table,
      athlete_id: athlete.id,
      athlete_name: athlete.name,
      actor,
      // Why this row exists at all, so the history reads without archaeology.
      resend: true,
      resend_attempt: attempt,
      resend_of_sent_at: history.original?.at ?? null,
      previous_recipient: history.lastSentTo,
      ...(correction
        ? {
            address_corrected_from: correction.from,
            address_corrected_to: correction.to,
            address_record: correction.label,
          }
        : {}),
    },
    testLabel: mode === "test" ? `resend #${attempt}` : undefined,
  });

  if (outcome.status === "ok") {
    return {
      ok: true,
      name: athlete.name,
      to: outcome.to,
      correction,
      correctionDeferred,
      attempt,
    };
  }
  if (outcome.status === "skipped") {
    // Lost the atomic claim to a concurrent request — the other one sent it.
    return {
      ok: false,
      refusalCode: "cooling_down",
      refusal: "That resend was already sent a moment ago — not sent twice.",
      cooldownRemaining: RESEND_COOLDOWN_SECONDS,
      name: athlete.name,
      correction,
      correctionDeferred,
    };
  }
  return {
    ok: false,
    refusalCode: "failed",
    refusal: outcome.detail,
    name: athlete.name,
    correction,
    correctionDeferred,
  };
}

// ── The receipt, fired on confirmation ────────────────────────────────────

/**
 * The receipt. Its primary action IS the Standard — that page is the thing
 * that arrives after confirming, and it arrives as a link, never a file.
 * Nothing on this path can attach: sendViaResend has no attachment parameter.
 */
export async function sendReceipt(
  db: SupabaseClient,
  token: TokenRow,
): Promise<{ ok: boolean; error?: string }> {
  const bundle = await loadTemplates(db);

  // The receipt's button points at The You First Standard once that page has
  // copy; until then it points at the site, which is where the receipt's own
  // words send the family ("Everything about the club is at
  // youfirstlacrosse.com"). Sending them to a page of placeholders would be
  // worse than sending them to the front door.
  const receiptAction = standardIsWritten() ? STANDARD_URL : SITE_URL;

  const rendered = renderEmail(
    bundle,
    "receipt",
    {
      name: token.athlete_name,
      classYear: token.class_year,
      tier: token.placement_tier,
      parentName: token.parent_name,
      confirmUrl: receiptAction,
    },
    receiptAction,
  );
  if (!rendered.ok) return { ok: false, error: rendered.detail };

  const outcome = await deliverOne(db, {
    mode: "live",
    kind: SEND_KINDS.receipt,
    cycleKey: cycleKeyFor(token.athlete_table, token.athlete_id, "receipt"),
    playerId: token.athlete_table === "players" ? token.athlete_id : null,
    athleteName: token.athlete_name,
    realRecipient: token.recipient_email,
    to: token.recipient_email,
    subject: rendered.email.subject,
    html: rendered.email.html,
    text: rendered.email.text,
    detail: {
      campaign: PLACEMENT_CAMPAIGN,
      tier: token.placement_tier,
      athlete_table: token.athlete_table,
      athlete_id: token.athlete_id,
      athlete_name: token.athlete_name,
      standard_url: receiptAction,
    },
  });

  if (outcome.status === "ok") {
    await db
      .from("placement_tokens")
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq("id", token.id);
  }

  return {
    ok: outcome.status === "ok",
    error: outcome.status === "ok" ? undefined : outcome.detail,
  };
}

// ── The nudge ─────────────────────────────────────────────────────────────

/**
 * Day 4 and day 7 after HER placement email — measured per athlete from her
 * own send, not from a wave date, because groups are approved on different
 * days. A family that has confirmed is filtered by placement_tokens.confirmed_at,
 * so a confirmation always wins over a scheduled nudge.
 *
 * Like everything else here, this runs only when a human asks it to.
 */
export async function sendNudges(
  db: SupabaseClient,
  input: { day: NudgeDay; mode: SendMode; testTo?: string; actor: string },
): Promise<SendReport> {
  const { day, mode, actor } = input;
  const report: SendReport = {
    mode,
    tier: "elite",
    campaign: PLACEMENT_CAMPAIGN,
    attempted: 0,
    sent: [],
    failed: [],
    skipped: [],
  };

  if (!NUDGE_DAYS.includes(day)) {
    report.refusal = `Day ${day} is not a nudge day (${NUDGE_DAYS.join(", ")}).`;
    return report;
  }

  const [roster, bundle, placementState, nudgeState] = await Promise.all([
    buildRosterData(db),
    loadTemplates(db),
    loadSendState(db, SEND_KINDS.placement),
    loadSendState(db, SEND_KINDS.nudge),
  ]);

  const now = Date.now();
  const cutoffMs = day * 24 * 60 * 60 * 1000;

  for (const athlete of sendableAthletes(roster.athletes)) {
    // A HOLD IS A HOLD ON EVERY PATH. sendGroup has always honoured this list
    // and the resend guards check it, but the nudge did not — so a held athlete
    // who had already received her placement email would have been reminded
    // automatically by a flow Harrison had explicitly taken her out of. Nobody
    // is exposed today: the one held athlete is 'declined' and so never reaches
    // a sendable tier at all. That is two accidents lining up, not a guard.
    // Reported rather than skipped silently, matching sendGroup.
    if (athlete.key in HELD_ATHLETES) {
      report.skipped.push({
        name: athlete.name,
        reason: "held",
        detail: SKIP_REASON_LABEL.held,
      });
      continue;
    }

    const cycleKey = cycleKeyFor(athlete.table, athlete.id);
    const sentAt = placementState.sentAt.get(cycleKey);
    if (!sentAt) continue; // never nudge someone who never got the original
    if (placementState.confirmedAt.has(cycleKey)) continue; // she confirmed
    if (now - new Date(sentAt).getTime() < cutoffMs) continue; // too early

    const nudgeKey = cycleKeyFor(athlete.table, athlete.id, `d${day}`);
    if (mode !== "test" && nudgeState.sentAt.has(nudgeKey)) continue;

    const email = usableEmail(athlete.email);
    if (!email || athlete.classYear == null) {
      report.skipped.push({
        name: athlete.name,
        reason: email ? "no_class_year" : "no_email",
        detail: email ? SKIP_REASON_LABEL.no_class_year : SKIP_REASON_LABEL.no_email,
      });
      continue;
    }

    const { url } = await issueToken(db, {
      table: athlete.table,
      id: athlete.id,
      name: athlete.name,
      classYear: athlete.classYear,
      tier: athlete.tier,
      email,
      parentName: athlete.parentName,
    });

    const rendered = renderEmail(
      bundle,
      "nudge",
      {
        name: athlete.name,
        classYear: athlete.classYear,
        tier: athlete.tier,
        parentName: athlete.parentName,
        confirmUrl: url,
      },
      url,
    );
    if (!rendered.ok) {
      report.skipped.push({
        name: athlete.name,
        reason: rendered.reason,
        detail: rendered.detail,
      });
      continue;
    }

    report.attempted++;
    const outcome = await deliverOne(db, {
      mode,
      kind: mode === "test" ? SEND_KINDS.test : SEND_KINDS.nudge,
      cycleKey: mode === "test" ? `${nudgeKey}|test-${Date.now()}` : nudgeKey,
      playerId: athlete.table === "players" ? athlete.id : null,
      athleteName: athlete.name,
      realRecipient: email,
      to: mode === "test" ? (input.testTo ?? "") : email,
      subject: rendered.email.subject,
      html: rendered.email.html,
      text: rendered.email.text,
      detail: {
        campaign: PLACEMENT_CAMPAIGN,
        tier: athlete.tier,
        nudge_day: day,
        athlete_table: athlete.table,
        athlete_id: athlete.id,
        athlete_name: athlete.name,
        actor,
      },
    });

    if (outcome.status === "ok") {
      report.sent.push({ name: athlete.name, email: outcome.to, ok: true });
    } else if (outcome.status === "skipped") {
      report.attempted--;
    } else {
      report.failed.push({
        name: athlete.name,
        email: outcome.to,
        ok: false,
        error: outcome.detail,
      });
    }
  }

  return report;
}

// ── Receipts to the club ──────────────────────────────────────────────────

/**
 * One summary per approved group.
 *
 * The collections wave proved this is load-bearing: without it, a mass silent
 * failure is indistinguishable from a quiet inbox. Fails soft — it reports on
 * something that has already happened.
 */
async function notifyWaveSummary(
  report: SendReport,
  actor: string,
  classKey: string | null,
) {
  const label = classKey
    ? `${classKey} ${TIER_GROUP_LABEL[report.tier]}`
    : TIER_GROUP_LABEL[report.tier];
  const result = await sendAdminNotification({
    subject: adminSubject(
      `${label} placement sent`,
      `${report.sent.length} families`,
      `${report.failed.length} failed`,
    ),
    headline: `${label} — placement emails sent`,
    subhead: `${PLACEMENT_CAMPAIGN} · approved by ${actor}`,
    rows: [
      { label: "Sent", value: String(report.sent.length), emphasise: true },
      { label: "Failed", value: String(report.failed.length) },
      { label: "Skipped", value: String(report.skipped.length) },
    ],
    paragraphs: [
      report.sent.length
        ? `Received: ${report.sent.map((s) => s.name).join(", ")}`
        : "No email reached a family in this run.",
      ...(report.failed.length
        ? [`Failed: ${report.failed.map((f) => `${f.name} (${f.error})`).join("; ")}`]
        : []),
      ...(report.skipped.length
        ? [
            `Skipped: ${report.skipped
              .map((s) => `${s.name} — ${s.detail}`)
              .join("; ")}`,
          ]
        : []),
    ],
    button: { label: "Open the send screen", url: `${SITE_URL}/admin/placements` },
    footnote:
      "Bounces arrive minutes later and are reported separately by the delivery webhook.",
    to: ADMIN_NOTIFY,
  });
  if (!result.sent) console.error("[placement] wave summary failed:", result.error);
}

/** Harrison and Kathleen, the moment a family confirms. */
export async function notifyConfirmation(token: TokenRow, receiptOk: boolean) {
  const result = await sendAdminNotification({
    subject: adminSubject(
      "Spot confirmed",
      token.athlete_name,
      tierLabel(token.placement_tier, token.class_year),
    ),
    headline: token.athlete_name,
    subhead: tierLabel(token.placement_tier, token.class_year),
    rows: [
      { label: "Placement", value: tierLabel(token.placement_tier, token.class_year), emphasise: true },
      { label: "Confirmed by", value: token.recipient_email },
      ...(token.parent_name ? [{ label: "Parent", value: token.parent_name }] : []),
    ],
    paragraphs: [
      receiptOk
        ? "She is in. The receipt is on its way, pointing the family at The You First Standard."
        : "She is in — but the receipt email did NOT go out. Send her the Standard link by hand and check the logs.",
    ],
    button: { label: "Open the roster", url: `${SITE_URL}/admin/rosters` },
    to: ADMIN_NOTIFY,
  });
  if (!result.sent) console.error("[placement] confirm notify failed:", result.error);
}

export { buildAudience };
export type { EmailShape };
