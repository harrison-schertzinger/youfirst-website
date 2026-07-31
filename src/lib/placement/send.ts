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
  sendViaResend,
} from "@/lib/placement/config";
import {
  buildAudience,
  loadSendState,
  sendableAthletes,
  usableEmail,
} from "@/lib/placement/audience";
import { buildRosterData } from "@/lib/rosters/data";
import { loadTemplates, renderEmail } from "@/lib/placement/templates";
import { standardIsWritten } from "@/content/standard";
import { issueToken, type TokenRow } from "@/lib/placement/tokens";
import {
  approvalPhrase,
  cycleKeyFor,
  greetingFor,
  isSendableTier,
  NUDGE_DAYS,
  PLACEMENT_CAMPAIGN,
  SEND_KINDS,
  SKIP_REASON_LABEL,
  TIER_GROUP_LABEL,
  tierLabel,
  type EmailShape,
  type NudgeDay,
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
  mode: SendMode;
  /** Required for mode 'test' — the only address a test may ever reach. */
  testTo?: string;
  /**
   * TEST MODE ONLY: restrict the run to one athlete.
   *
   * Without this a test renders every athlete in the group and delivers all of
   * them to the tester — 72 identical emails for Elite. A test is for reading
   * one email, so the preview modal passes the athlete you are looking at.
   * Ignored outside test mode: it must never be able to narrow a live send into
   * looking complete while most of the group goes unsent.
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

  const [roster, bundle, state] = await Promise.all([
    buildRosterData(db),
    loadTemplates(db),
    loadSendState(db),
  ]);

  // The audience is derived here, from the database, every time.
  const audience = sendableAthletes(roster.athletes).filter(
    (a) =>
      a.tier === tier &&
      // Narrowing is a TEST-mode affordance only — see SendGroupInput.
      (mode !== "test" || !input.athleteKey || a.key === input.athleteKey),
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
    await notifyWaveSummary(report, actor);
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
}

type DeliverOutcome =
  | { status: "ok"; to: string }
  | { status: "failed"; to: string; detail: string }
  | { status: "skipped"; to: string; detail: string };

async function deliverOne(
  db: SupabaseClient,
  input: DeliverInput,
): Promise<DeliverOutcome> {
  const isTestRedirect = input.mode === "test";
  const subject = isTestRedirect
    ? `[TEST → ${input.realRecipient}] ${input.subject}`
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
    if ((claimErr as { code?: string } | null)?.code === "23505") {
      return {
        status: "skipped",
        to: input.to,
        detail: "Already claimed or sent — not sent twice.",
      };
    }
    return {
      status: "failed",
      to: input.to,
      detail: `Claim failed: ${claimErr?.message ?? "no row"}`,
    };
  }
  const claimId = claim.id as string;

  const result = await sendViaResend({
    to: input.to,
    subject,
    html,
    text,
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
async function notifyWaveSummary(report: SendReport, actor: string) {
  const label = TIER_GROUP_LABEL[report.tier];
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
