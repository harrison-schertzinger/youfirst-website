/**
 * Season close-out collections DRY RUN.
 *
 * Renders every email for a wave to a file so Harrison can read every name,
 * balance and link before one reaches a parent. Sends nothing, ever — there is
 * no Resend call in this file.
 *
 * The balance comes from `hermes_collections_targets()`, which reads
 * `player_balances()` — the same function the portal renders. The template is
 * loaded from `email_templates` in the database, not hardcoded here. So this
 * dry run exercises the same two sources of truth the real send uses.
 *
 * Run:
 *   npx tsx scripts/collections-dryrun.ts 1          # wave 1 (2027, 2028, 2030)
 *   npx tsx scripts/collections-dryrun.ts 2          # wave 2 (2029)
 *   npx tsx scripts/collections-dryrun.ts 1 2027     # ad-hoc grad years
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { renderTemplate } from "../src/lib/template-render";

// Waves are a parameter, not a code constant. These are convenience labels for
// the two waves Harrison defined; any grad years can be passed on the CLI.
const WAVES: Record<string, number[]> = {
  "1": [2027, 2028, 2030],
  "2": [2029],
};

const PORTAL_LINK =
  process.env.HERMES_PAYMENT_LINK ?? "https://youfirstlacrosse.com/portal";
const PORTAL_PASSWORD = process.env.HERMES_PORTAL_PASSWORD ?? "YOUFIRST";
const DEADLINE = process.env.HERMES_COLLECTIONS_DEADLINE ?? "August 1";

interface Target {
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
  guardian_greeting: string;
  greeting_line: string;
  greeting_is_fallback: boolean;
  collections_hold: boolean;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

async function main() {
  const waveArg = process.argv[2] ?? "1";
  const explicitYears = process.argv
    .slice(3)
    .map(Number)
    .filter((n) => Number.isInteger(n));
  const gradYears = explicitYears.length ? explicitYears : WAVES[waveArg];

  if (!gradYears) {
    throw new Error(
      `Unknown wave "${waveArg}". Known: ${Object.keys(WAVES).join(", ")}, or pass grad years.`,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing Supabase env in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  // ── The target list — same function the real send uses ──────────────
  const { data: rows, error } = await db.rpc("hermes_collections_targets", {
    p_grad_years: gradYears,
  });
  if (error) throw new Error(`hermes_collections_targets: ${error.message}`);
  const targets = (rows ?? []) as Target[];

  // ── The template — from the database, not from this file ────────────
  const { data: tpl, error: tplErr } = await db
    .from("email_templates")
    .select("subject, body")
    .eq("type", "payment_reminder")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (tplErr) throw new Error(`template load: ${tplErr.message}`);
  if (!tpl) throw new Error("no active payment_reminder template");

  const { data: snippetRows } = await db
    .from("email_snippets")
    .select("key, content");
  const snippets: Record<string, string> = {};
  for (const s of snippetRows ?? []) snippets[s.key] = s.content;

  // ── Group by player: one family per block, every guardian inside ────
  const byPlayer = new Map<string, Target[]>();
  for (const t of targets) {
    const list = byPlayer.get(t.player_id) ?? [];
    list.push(t);
    byPlayer.set(t.player_id, list);
  }

  const out: string[] = [];
  const problems: string[] = [];
  let emails = 0;
  let totalCents = 0;
  let fallbackGreetings = 0;
  let bannedGreetings = 0;

  const sortedPlayers = Array.from(byPlayer.values()).sort(
    (a, b) =>
      a[0].graduation_year - b[0].graduation_year ||
      a[0].player_name.localeCompare(b[0].player_name),
  );

  out.push("═".repeat(78));
  out.push(`SEASON CLOSE-OUT COLLECTIONS — WAVE ${waveArg}`);
  out.push(`Grad years: ${gradYears.join(", ")}`);
  out.push(`Generated:  ${new Date().toISOString()}`);
  out.push(`Portal:     ${PORTAL_LINK}`);
  out.push(`Password:   ${PORTAL_PASSWORD}`);
  out.push(`Deadline:   ${DEADLINE}`);
  out.push("");
  out.push("NOTHING WAS SENT. This file is a render only.");
  out.push("");
  out.push(
    "NOTE: every email opens \"Hi Name —\". Guardians with no real first name on",
  );
  out.push(
    "file get a bare \"Hi —\". Names are never guessed from an email address.",
  );
  out.push("═".repeat(78));
  out.push("");

  // Roster summary first, so the whole wave is checkable at a glance.
  out.push("── WAVE ROSTER ".padEnd(78, "─"));
  out.push(
    "GY   PLAYER                        CHARGED      PAID    ADJ   BALANCE  GUARDIANS",
  );
  for (const guardians of sortedPlayers) {
    const p = guardians[0];
    totalCents += p.remaining_cents;
    emails += guardians.length;
    out.push(
      [
        String(p.graduation_year).padEnd(5),
        p.player_name.padEnd(29).slice(0, 29),
        money(p.charged_cents).padStart(9),
        money(p.paid_cents).padStart(9),
        money(p.adjustment_cents).padStart(6),
        money(p.remaining_cents).padStart(9),
        "  " + guardians.length,
      ].join(" "),
    );
  }
  out.push("─".repeat(78));
  out.push(
    `${sortedPlayers.length} players · ${emails} emails · ${money(totalCents)} outstanding`,
  );
  out.push("");
  out.push("");

  // Then every rendered email in full.
  for (const guardians of sortedPlayers) {
    const p = guardians[0];
    for (const g of guardians) {
      const ctx = {
        player_name: p.player_name,
        // Complete greeting line resolved in SQL: "Hi Michelle", or a bare
        // "Hi" when we have no real name. Never "Hey", never "there", and
        // never guessed from an email address.
        greeting_line: g.greeting_line,
        parent_first_name: g.guardian_greeting,
        balance: money(p.remaining_cents),
        payment_link: PORTAL_LINK,
        login_email: g.guardian_email,
        portal_password: PORTAL_PASSWORD,
        deadline: DEADLINE,
        season: p.season,
      };

      if (g.greeting_is_fallback) fallbackGreetings++;

      const rendered = renderTemplate(

        { subject: tpl.subject, body: tpl.body },
        ctx,
        snippets,
      );

      // A parent must never receive an email containing "{{balance}}".
      const unfilled = `${rendered.subject}\n${rendered.body}`.match(
        /\{\{[^}]+\}\}/g,
      );
      if (unfilled) {
        problems.push(
          `${p.player_name} → ${g.guardian_email}: unfilled ${unfilled.join(", ")}`,
        );
      }
      // The balance must literally appear in the body.
      if (!rendered.body.includes(ctx.balance)) {
        problems.push(
          `${p.player_name} → ${g.guardian_email}: balance ${ctx.balance} missing from body`,
        );
      }
      // Greeting rules: Harrison writes "Hi". "Hey", "Hey there", the import
      // placeholder "Parent", and an empty greeting are all failures.
      for (const banned of ["Hey ", "Hey there", "Hi there", "Parent"]) {
        if (rendered.body.includes(banned)) {
          bannedGreetings++;
          problems.push(
            `${p.player_name} → ${g.guardian_email}: banned greeting "${banned}"`,
          );
        }
      }
      if (!/^Hi( [A-Z][^\s—]*)? —/.test(rendered.body)) {
        bannedGreetings++;
        problems.push(
          `${p.player_name} → ${g.guardian_email}: greeting is not "Hi —" or "Hi Name —" (opens: ${JSON.stringify(rendered.body.slice(0, 24))})`,
        );
      }

      out.push("━".repeat(78));
      out.push(`TO:      ${g.guardian_email}`);
      out.push(`PLAYER:  ${p.player_name} (${p.graduation_year})`);
      out.push(
        `MONEY:   charged ${money(p.charged_cents)} · paid ${money(
          p.paid_cents,
        )} · adjustment ${money(p.adjustment_cents)} · BALANCE ${money(
          p.remaining_cents,
        )}`,
      );
      out.push(`SUBJECT: ${rendered.subject}`);
      out.push("━".repeat(78));
      out.push(rendered.body);
      out.push("");
      out.push("");
    }
  }

  if (problems.length) {
    out.push("!".repeat(78));
    out.push(`${problems.length} PROBLEM(S) — DO NOT SEND:`);
    for (const p of problems) out.push(`  • ${p}`);
    out.push("!".repeat(78));
  }

  mkdirSync("tmp", { recursive: true });
  const path = `tmp/collections-wave${waveArg}-dryrun.txt`;
  writeFileSync(path, out.join("\n"), "utf8");

  // ── Console summary ────────────────────────────────────────────────
  console.log(`\nWAVE ${waveArg} — grad years ${gradYears.join(", ")}`);
  console.log(`  players:        ${sortedPlayers.length}`);
  console.log(`  emails:         ${emails}`);
  console.log(`  outstanding:    ${money(totalCents)}`);
  console.log(`  2029s included: ${
    sortedPlayers.filter((g) => g[0].graduation_year === 2029).length
  }`);
  console.log(`  bare "Hi" (no real first name on file): ${fallbackGreetings}/${emails}`);
  console.log(`  banned greetings ("Hey"/"there"/"Parent"): ${bannedGreetings}`);
  console.log(`  problems:       ${problems.length}`);
  if (problems.length) for (const p of problems) console.log(`    ! ${p}`);
  console.log(`\n  written to ${path}`);
  console.log(`  NOTHING SENT.\n`);

  if (problems.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
