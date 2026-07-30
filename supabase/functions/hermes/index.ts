// Hermes — the administrative agent for YOU. FIRST Elite Lacrosse.
//
// Three jobs (all guarded, all logged):
//   1. payment_radar     — remind families with a balance before/after next_due_date
//   2. question_ack      — warm holding reply to a parent + route notice to the right admin
//   3. morning_briefing  — one daily digest to Harrison + Kathleen
//
// SAFETY POSTURE (inert by default):
//   - dry_run defaults to TRUE. A caller must pass {"dry_run": false} to send for real.
//   - Even with dry_run:false, nothing sends unless HERMES_ENABLE_SEND=="true" AND
//     RESEND_API_KEY is set. Otherwise the run is force-simulated.
//   - Payment radar NEVER emails a zero balance and NEVER emails a plan with no
//     next_due_date. Every real send is written to hermes_send_log so the same family
//     never gets the same reminder twice in one cycle.
//   - Auth: verify_jwt=true at the gateway + this function requires role=service_role,
//     so the public anon key cannot invoke it and read family/financial data.
//
// Reuses the site's own patterns: Resend HTTP payload (src/lib/tryout-email.ts) and the
// {{placeholder}} / {{snippet:key}} engine (src/lib/template-render.ts).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ---------- config ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM =
  Deno.env.get("HERMES_FROM_EMAIL") ??
  "YOU. FIRST Lacrosse <noreply@youfirstlacrosse.com>";
const REPLY_TO = Deno.env.get("HERMES_REPLY_TO") ?? "kathleen@youfirstlacrosse.com";
const ADMIN_HARRISON = Deno.env.get("HERMES_ADMIN_HARRISON") ?? "harrison@theyoufirstproject.com";
const ADMIN_KATHLEEN = Deno.env.get("HERMES_ADMIN_KATHLEEN") ?? "kathleen@youfirstlacrosse.com";
// Portal-now, Stripe-later: a stable pay destination. Swap to a per-player Stripe link later.
const PAYMENT_LINK = Deno.env.get("HERMES_PAYMENT_LINK") ?? "https://youfirstlacrosse.com/portal";
const REMINDER_LEAD_DAYS = Number(Deno.env.get("HERMES_REMINDER_LEAD_DAYS") ?? "3");

// Global kill switch. Sends are simulated unless this is explicitly "true".
const SEND_ENABLED = Deno.env.get("HERMES_ENABLE_SEND") === "true" && RESEND_API_KEY.length > 0;

const BRAND_BLUE = "#4B9CD3";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- small helpers ----------
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Port of src/lib/template-render.ts: {{key}} + {{snippet:key}}, snippet-first, multi-pass.
function renderTemplate(
  template: string,
  context: Record<string, unknown>,
  snippets: Record<string, string>,
  maxPasses = 6,
): string {
  let out = template ?? "";
  const RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_:]*)\s*\}\}/g;
  for (let i = 0; i < maxPasses; i++) {
    let changed = false;
    out = out.replace(RE, (m, key: string) => {
      if (key.startsWith("snippet:")) {
        const sk = key.slice("snippet:".length);
        if (Object.prototype.hasOwnProperty.call(snippets, sk)) {
          changed = true;
          return snippets[sk];
        }
        return m;
      }
      const v = context[key];
      if (v === undefined || v === null) return m;
      changed = true;
      return String(v);
    });
    if (!changed) break;
  }
  return out;
}

// Brand-compliant wrapper (Carolina blue / black / white — no gradients).
function wrapHtml(bodyText: string, opts: { heading?: string } = {}): string {
  const paragraphs = escapeHtml(bodyText)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p.replaceAll("\n", "<br>")}</p>`)
    .join("");
  const heading = opts.heading
    ? `<h2 style="margin:0 0 12px;font-size:18px;color:#111">${escapeHtml(opts.heading)}</h2>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:8px">
  <div style="border-top:4px solid ${BRAND_BLUE};padding-top:18px">
    ${heading}${paragraphs}
    <hr style="border:none;border-top:1px solid #eee;margin:22px 0 10px">
    <p style="margin:0;font-size:12px;color:#888">YOU. FIRST Elite Lacrosse</p>
  </div>
</div>`;
}

// verify_jwt handles signature; we additionally require the service role.
function callerRole(req: Request): string | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const pad = "=".repeat((4 - (parts[1].length % 4)) % 4);
    const payload = JSON.parse(atob((parts[1] + pad).replaceAll("-", "+").replaceAll("_", "/")));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.replyTo ?? REPLY_TO,
    }),
  });
  if (!res.ok) {
    return { ok: false, error: `resend ${res.status}: ${await res.text()}` };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data?.id };
}

async function logSend(row: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("hermes_send_log").insert(row);
  if (error) console.error("hermes_send_log insert failed", error, row);
}

async function loadTemplate(type: string): Promise<{ subject: string; body: string } | null> {
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("type", type)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function loadSnippets(): Promise<Record<string, string>> {
  const { data } = await supabase.from("email_snippets").select("key, content");
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.key] = r.content;
  return map;
}

// ---------- JOB 1: payment radar ----------
async function runPaymentRadar(dryRun: boolean) {
  const { data: fams, error } = await supabase.rpc("hermes_owing_families");
  if (error) return { error: error.message };

  const reminder = await loadTemplate("payment_reminder");
  const overdue = await loadTemplate("overdue_notice");
  const snippets = await loadSnippets();
  const today = new Date().toISOString().slice(0, 10);

  const wouldSend: unknown[] = [];
  const skipped: Record<string, number> = {};
  let sent = 0;
  const errors: string[] = [];
  const bump = (k: string) => (skipped[k] = (skipped[k] ?? 0) + 1);

  for (const f of fams ?? []) {
    const balance = Number(f.balance_cents ?? 0);
    if (balance <= 0) { bump("zero_or_negative_balance"); continue; }        // HARD SAFETY
    if (!f.parent_email) { bump("no_guardian_email"); continue; }
    if (!f.next_due_date) { bump("no_due_date"); continue; }                 // can't time a nudge

    const due = f.next_due_date as string;
    let kind: "payment_reminder" | "overdue_notice" | null = null;
    if (due < today) kind = "overdue_notice";
    else {
      const leadFrom = new Date(Date.now() + REMINDER_LEAD_DAYS * 86400000)
        .toISOString().slice(0, 10);
      if (due <= leadFrom) kind = "payment_reminder";
    }
    if (!kind) { bump("not_yet_in_window"); continue; }

    // Dedupe: already sent this kind for this due-date cycle?
    const { count } = await supabase
      .from("hermes_send_log")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("plan_id", f.plan_id)
      .eq("cycle_key", due)
      .eq("status", "sent");
    if ((count ?? 0) > 0) { bump("already_sent_this_cycle"); continue; }

    const tpl = kind === "overdue_notice" ? overdue : reminder;
    if (!tpl) { bump("template_missing"); continue; }

    const ctx = {
      player_name: f.player_name,
      parent_first_name: f.parent_first_name ?? "there",
      balance: formatCents(balance),
      payment_link: PAYMENT_LINK,
      season: f.season,
    };
    const subject = renderTemplate(tpl.subject, ctx, snippets);
    const bodyText = renderTemplate(tpl.body, ctx, snippets);

    const preview = {
      kind, plan_id: f.plan_id, player: f.player_name, to: f.parent_email,
      balance: ctx.balance, due, subject,
    };

    if (dryRun) { wouldSend.push(preview); continue; }

    const r = await sendEmail({ to: f.parent_email, subject, html: wrapHtml(bodyText), text: bodyText });
    await logSend({
      kind, plan_id: f.plan_id, player_id: f.player_id, recipient_email: f.parent_email,
      cycle_key: due, subject, status: r.ok ? "sent" : "failed", detail: r.ok ? { id: r.id } : { error: r.error },
    });
    if (r.ok) sent++; else errors.push(`${f.player_name}: ${r.error}`);
  }

  return {
    scanned: (fams ?? []).length,
    would_send: dryRun ? wouldSend : undefined,
    would_send_count: wouldSend.length,
    sent: dryRun ? 0 : sent,
    skipped,
    errors: errors.length ? errors : undefined,
  };
}

// ---------- JOB 1b: season close-out collections ----------
//
// The precision send. Distinct from payment_radar: the summer is over, so there
// are no due dates to time a nudge against (every owing plan has
// next_due_date = NULL, which is exactly why the radar has never fired). This
// job is driven purely by money owed.
//
// WAVE MEMBERSHIP IS A PARAMETER, never a code edit — pass grad_years.
//   { job:"collections", grad_years:[2027,2028,2030], wave:"1", dry_run:true }
//
// Balance comes from player_balances() via hermes_collections_targets(), the
// same function the portal renders. It is never recomputed here and the
// template can never default it: a missing balance aborts that family.
//
// Sends to EVERY linked guardian, but writes ONE log row per player so dedup
// holds at the family level.
const PORTAL_PASSWORD = Deno.env.get("HERMES_PORTAL_PASSWORD") ?? "YOUFIRST";
const COLLECTIONS_DEADLINE =
  Deno.env.get("HERMES_COLLECTIONS_DEADLINE") ?? "August 1";

interface CollectionsTarget {
  player_id: string;
  plan_id: string;
  player_name: string;
  player_first_name: string;
  graduation_year: number;
  season: string;
  charged_cents: number;
  paid_cents: number;
  adjustment_cents: number;
  remaining_cents: number;
  guardian_id: string;
  guardian_email: string;
  guardian_first_name: string | null;
  // Resolved in SQL: a real first name, or a neutral fallback when the stored
  // value is an import placeholder ('Parent'). Never guessed from the email.
  guardian_greeting: string;
  greeting_is_fallback: boolean;
}

async function runCollections(
  dryRun: boolean,
  opts: { gradYears?: number[]; wave?: string; redirectTo?: string },
) {
  const gradYears = Array.isArray(opts.gradYears) && opts.gradYears.length
    ? opts.gradYears.map(Number).filter((n) => Number.isInteger(n))
    : null;

  if (!gradYears) {
    return {
      error:
        "grad_years is required — pass the wave explicitly, e.g. grad_years:[2027,2028,2030].",
    };
  }

  const wave = String(opts.wave ?? "unlabelled");
  const cycleKey = `closeout-w${wave}`;
  const redirectTo = opts.redirectTo?.trim() || null;

  const { data: rows, error } = await supabase.rpc(
    "hermes_collections_targets",
    { p_grad_years: gradYears },
  );
  if (error) return { error: error.message };

  const tpl = await loadTemplate("payment_reminder");
  if (!tpl) return { error: "payment_reminder template missing" };
  const snippets = await loadSnippets();

  // Group guardians by player so we log once per family.
  const byPlayer = new Map<string, CollectionsTarget[]>();
  for (const r of (rows ?? []) as CollectionsTarget[]) {
    const list = byPlayer.get(r.player_id) ?? [];
    list.push(r);
    byPlayer.set(r.player_id, list);
  }

  const previews: unknown[] = [];
  const skipped: Record<string, number> = {};
  const errors: string[] = [];
  let sent = 0;
  let players = 0;
  const bump = (k: string) => (skipped[k] = (skipped[k] ?? 0) + 1);

  for (const [playerId, guardians] of byPlayer) {
    const first = guardians[0];
    const balance = Number(first.remaining_cents ?? 0);

    if (!Number.isFinite(balance) || balance <= 0) {
      bump("zero_or_negative_balance"); // HARD SAFETY
      continue;
    }

    // Dedupe at the family level for this wave.
    const { count } = await supabase
      .from("hermes_send_log")
      .select("id", { count: "exact", head: true })
      .eq("kind", "collections")
      .eq("player_id", playerId)
      .eq("cycle_key", cycleKey)
      .eq("status", "sent");
    if ((count ?? 0) > 0) {
      bump("already_sent_this_wave");
      continue;
    }

    players++;
    const recipients: string[] = [];
    const results: { to: string; ok: boolean; error?: string }[] = [];

    for (const g of guardians) {
      const ctx = {
        player_name: first.player_name,
        parent_first_name: g.guardian_greeting,
        balance: formatCents(balance),
        payment_link: PAYMENT_LINK,
        login_email: g.guardian_email,
        portal_password: PORTAL_PASSWORD,
        deadline: COLLECTIONS_DEADLINE,
        season: first.season,
      };

      const subject = renderTemplate(tpl.subject, ctx, snippets);
      const bodyText = renderTemplate(tpl.body, ctx, snippets);

      // A template that still carries an unfilled placeholder must never reach
      // a parent — an email reading "{{balance}}" destroys the credibility the
      // whole send depends on.
      const unfilled = bodyText.match(/\{\{[^}]+\}\}/g);
      if (unfilled) {
        errors.push(
          `${first.player_name} (${g.guardian_email}): unfilled ${unfilled.join(",")}`,
        );
        bump("unfilled_placeholder");
        continue;
      }

      recipients.push(g.guardian_email);

      if (dryRun) {
        previews.push({
          player: first.player_name,
          grad_year: first.graduation_year,
          to: g.guardian_email,
          charged: formatCents(first.charged_cents),
          paid: formatCents(first.paid_cents),
          adjustment: formatCents(first.adjustment_cents),
          balance: ctx.balance,
          subject,
          body: bodyText,
        });
        continue;
      }

      const to = redirectTo ?? g.guardian_email;
      const finalSubject = redirectTo
        ? `[TEST → ${g.guardian_email}] ${subject}`
        : subject;
      const finalBody = redirectTo
        ? `*** TEST SEND — the real recipient would be ${g.guardian_email} ***\n\n${bodyText}`
        : bodyText;

      const r = await sendEmail({
        to,
        subject: finalSubject,
        html: wrapHtml(finalBody),
        text: finalBody,
      });
      results.push({ to, ok: r.ok, error: r.error });
      if (r.ok) sent++;
      else errors.push(`${first.player_name} → ${to}: ${r.error}`);
    }

    if (!dryRun && recipients.length > 0) {
      // ONE row per player. A redirected test logs under a different kind so it
      // can never consume the real wave's dedup key.
      await logSend({
        kind: redirectTo ? "collections_test" : "collections",
        plan_id: first.plan_id,
        player_id: playerId,
        recipient_email: recipients.join(","),
        cycle_key: cycleKey,
        subject: `Season close-out — ${first.player_name}`,
        status: results.some((x) => x.ok) ? "sent" : "failed",
        detail: {
          wave,
          grad_years: gradYears,
          balance_cents: balance,
          guardians: recipients,
          redirected_to: redirectTo,
          results,
        },
      });
    }
  }

  const totalCents = Array.from(byPlayer.values())
    .map((g) => Number(g[0].remaining_cents ?? 0))
    .filter((c) => c > 0)
    .reduce((a, b) => a + b, 0);

  return {
    wave,
    grad_years: gradYears,
    cycle_key: cycleKey,
    players_matched: byPlayer.size,
    players_targeted: players,
    total_outstanding: formatCents(totalCents),
    guardian_emails: dryRun
      ? previews.length
      : sent,
    redirected_to: redirectTo,
    would_send: dryRun ? previews : undefined,
    sent: dryRun ? 0 : sent,
    skipped,
    errors: errors.length ? errors : undefined,
  };
}

// ---------- JOB 2: question auto-acknowledge ----------
function routeQuestion(q: string): { owner: "Kathleen" | "Harrison" | "Both"; to: string[]; reason: string } {
  const s = (q ?? "").toLowerCase();
  const fee = /(fee|cost|price|pay|payment|afford|discount|financial|money|scholarship|tuition|deposit)/.test(s);
  const film = /(film|highlight|placement|recruit|roster|spot|position|missed tryout|join|midseason|mid-season|indiana|kentucky|video)/.test(s);
  if (fee && !film) return { owner: "Kathleen", to: [ADMIN_KATHLEEN], reason: "fees/money → Kathleen" };
  if (film && !fee) return { owner: "Harrison", to: [ADMIN_HARRISON], reason: "film/placement → Harrison" };
  return { owner: "Both", to: [ADMIN_HARRISON, ADMIN_KATHLEEN], reason: "unclassified → both" };
}

async function runQuestionAck(dryRun: boolean, record: { id?: string; email?: string; question?: string }) {
  let row = record;
  if (record.id && (!record.email || !record.question)) {
    const { data } = await supabase
      .from("qa_unanswered_questions")
      .select("id, email, question")
      .eq("id", record.id)
      .maybeSingle();
    if (data) row = data;
  }
  if (!row?.email || !row?.question) return { error: "missing email/question" };

  // Dedupe: never acknowledge the same question twice.
  if (row.id) {
    const { count } = await supabase
      .from("hermes_send_log")
      .select("id", { count: "exact", head: true })
      .eq("kind", "qa_ack").eq("question_id", row.id).eq("status", "sent");
    if ((count ?? 0) > 0 && !dryRun) return { skipped: "already_acknowledged" };
  }

  const ackTpl = await loadTemplate("qa_acknowledgement");
  const snippets = await loadSnippets();
  if (!ackTpl) return { error: "qa_acknowledgement template missing" };

  const ackSubject = renderTemplate(ackTpl.subject, {}, snippets);
  const ackBody = renderTemplate(ackTpl.body, {}, snippets);

  const route = routeQuestion(row.question);
  const adminSubject = `New question (${route.owner}) — ${row.email}`;
  const adminText =
    `A parent submitted a question through the site.\n\n` +
    `From: ${row.email}\n` +
    `Suggested owner: ${route.owner} (${route.reason})\n\n` +
    `Question:\n${row.question}\n\n` +
    `A holding reply has been sent to the parent. Do NOT reply to the parent from Hermes — ` +
    `answer them personally. Open questions live in the admin Q&A queue.`;

  const plan = {
    parent_holding_reply: { to: row.email, subject: ackSubject },
    admin_notification: { to: route.to, subject: adminSubject, suggested_owner: route.owner },
  };

  if (dryRun) return { would_send: plan, ack_body_preview: ackBody, admin_text_preview: adminText };

  const r1 = await sendEmail({ to: row.email, subject: ackSubject, html: wrapHtml(ackBody), text: ackBody });
  await logSend({
    kind: "qa_ack", question_id: row.id ?? null, recipient_email: row.email,
    subject: ackSubject, status: r1.ok ? "sent" : "failed", detail: r1.ok ? { id: r1.id } : { error: r1.error },
  });
  const r2 = await sendEmail({
    to: route.to, subject: adminSubject,
    html: wrapHtml(adminText, { heading: "New parent question" }), text: adminText,
    replyTo: row.email,
  });
  return { parent_ack: r1, admin_notified: r2, owner: route.owner };
}

// ---------- JOB 3: morning briefing ----------
async function runMorningBriefing(dryRun: boolean) {
  const { data: b, error } = await supabase.rpc("hermes_briefing_data");
  if (error) return { error: error.message };

  const d = b as Record<string, any>;
  const today = new Date().toISOString().slice(0, 10);
  const subject = `YOU. FIRST — Morning Briefing (${today})`;

  const tryouts = (d.new_tryouts ?? []) as any[];
  const tryoutLines = tryouts.length
    ? tryouts.map((t) => `  • ${t.player} (${t.grad_year}) — ${t.group}`).join("\n")
    : "  • None since yesterday";
  const questions = (d.open_questions ?? []) as any[];
  const questionLines = questions.length
    ? questions.map((q) => `  • ${q.email}: ${q.question}`).join("\n")
    : "  • None waiting";
  const newlyOverdue = (d.newly_overdue ?? []) as any[];
  const overdueLines = newlyOverdue.length
    ? newlyOverdue.map((o) => `  • ${o.player} — ${formatCents(o.balance_cents)} (due ${o.due})`).join("\n")
    : "  • None newly overdue";

  const text =
`Good morning — here's the club at a glance.

NEW TRYOUT SIGNUPS (last 24h): ${d.new_tryouts_count}
${tryoutLines}

PAYMENTS RECEIVED (last 24h): ${d.payments_24h_count} totaling ${formatCents(d.payments_24h_cents)}

BALANCES: ${d.families_owing} families owing, ${formatCents(d.total_outstanding_cents)} outstanding.
Overdue right now: ${d.overdue_now}
Newly overdue (crossed yesterday):
${overdueLines}

OPEN QUESTIONS WAITING: ${d.open_questions_count}
${questionLines}

— Hermes`;

  if (dryRun) return { subject, to: [ADMIN_HARRISON, ADMIN_KATHLEEN], text_preview: text, data: d };

  const r = await sendEmail({
    to: [ADMIN_HARRISON, ADMIN_KATHLEEN], subject,
    html: wrapHtml(text, { heading: "Morning Briefing" }), text,
  });
  await logSend({
    kind: "morning_briefing", cycle_key: today, recipient_email: `${ADMIN_HARRISON},${ADMIN_KATHLEEN}`,
    subject, status: r.ok ? "sent" : "failed", detail: r.ok ? { id: r.id } : { error: r.error },
  });
  return { sent: r };
}

// ---------- entrypoint ----------
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (callerRole(req) !== "service_role") return json({ error: "forbidden: service_role required" }, 403);

  let payload: any = {};
  try { payload = await req.json(); } catch { /* empty body ok */ }

  const job = payload.job ?? "all";
  // Inert by default: dry_run is TRUE unless explicitly false, AND sends require the kill switch.
  const requestedDryRun = payload.dry_run !== false;
  const dryRun = requestedDryRun || !SEND_ENABLED;

  const out: Record<string, unknown> = {
    ok: true,
    job,
    dry_run: dryRun,
    send_enabled: SEND_ENABLED,
    forced_dry_run: !requestedDryRun && !SEND_ENABLED ? "HERMES_ENABLE_SEND/RESEND_API_KEY not set" : undefined,
    ran_at: new Date().toISOString(),
  };

  try {
    if (job === "payment_radar" || job === "all") out.payment_radar = await runPaymentRadar(dryRun);
    if (job === "morning_briefing" || job === "all") out.morning_briefing = await runMorningBriefing(dryRun);
    if (job === "question_ack") out.question_ack = await runQuestionAck(dryRun, payload.record ?? {});
    // Deliberately NOT part of "all" — the close-out send is fired by hand,
    // one wave at a time, never by the nightly cron.
    if (job === "collections") {
      out.collections = await runCollections(dryRun, {
        gradYears: payload.grad_years,
        wave: payload.wave,
        redirectTo: payload.redirect_to,
      });
    }
  } catch (e) {
    return json({ ok: false, job, error: String(e) }, 500);
  }
  return json(out);
});
