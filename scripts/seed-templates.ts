/**
 * seed-templates.ts
 * ─────────────────
 * Seeds the email_templates table with Harrison's real copy.
 *
 *   • UPDATEs the four existing seeded rows by name (Intro to the Club,
 *     Season Logistics, Payment Reminder, Overdue Notice) — replacing
 *     their empty subject + body with the canonical text below.
 *   • INSERTs three new templates that didn't exist in the Sprint 8
 *     seed (Cost & Financial, Tournament Need, Roster Offer).
 *   • ARCHIVEs the "Generic Announcement" placeholder so the active
 *     template list lands at exactly seven entries.
 *
 * Idempotent. Re-runnable: every UPDATE matches by name and resets the
 * row to the canonical content, so running this twice produces the
 * same end state. The INSERTs check for an existing row by name before
 * inserting; if a previous run already created them, the second run
 * UPDATEs instead.
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/seed-templates.ts dotenv_config_path=.env.local
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from .env.local.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Template payloads ────────────────────────────────────────────────────────

interface TemplatePayload {
  name: string;
  type: string;
  subject: string;
  body: string;
  description: string;
}

const TEMPLATE_INTRO: TemplatePayload = {
  name: "The Intro",
  type: "intro",
  subject: "You. First Elite Lacrosse — {{prospect_first_name}}",
  body: `Harrison here — thank you for your patience! Henry and I are concurrently building a few businesses and laying the foundation for summer, so I apologize for the delay. Below is information and maybe some FAQs.

I briefly lay out The Club, The Academy, and YOU.PRJCT (the platform our players will use), and then hope to work with {{prospect_first_name}} before the summer! {{class}}s have spots, so we would love to have her join.

There is You. First Elite Lacrosse, which is the travel team portion of things. This is where the best players in the age-group come together, compete together, prepare for their recruiting summer, then we help get them recruited. If {{prospect_first_name}} has an interest in playing at the next level, we definitely can guide that; and more importantly, welcome her into a community of players who are seriously pursuing the same.

Which brings me to The Cincinnati Lacrosse Academy. This is the training portion. It's a powerful community to witness — the best players around, lift and train daily, and accelerate progress over the course of summer, fall, and winter in ways that continue to shock me. Most people know it from social media and are intimidated to come, but the players and environment that gets created — well, I have not seen it turn anyone away. In fact, it always becomes a place they love.

Regarding the club, the schedule is below. If the elite environment is what {{prospect_first_name}} is looking for, and if she's willing to put the work in, we'd love to work with her.

If she could come to the Academy on a Saturday with {{intro_buddies}} and see if it's the right fit for her, that would be awesome! That's probably the biggest thing — we have the spots; it's more so, is it a right fit for her?

Without even seeing her I can say for certain, she's at the age where if she's willing to work — with an intentional plan — she can become a great player.

Briefly, that's why I built YOU.PRJCT. That business best lays out the ethos and energy of what makes The Academy and Club special. Sure the drills are good, but the energy and essence of the place is the mindset that gets absorbed. It's what we attempt to give all the players — the belief and structure to set and achieve goals — and is what, once we work with {{prospect_first_name}}, will get her set up on.

If all of that is what {{prospect_first_name}} is looking for, then she'll love it!

Logistics-wise: if she can come to a training session, great. If she has film, I'd love to see that, though it's not necessary. Team fees, hotels, rostering — I'll forward onto Kathy and Kim respectively. Gear, sizing, etc., we'll get organized as well.

Main point: if she wants to, she is welcome.

If you have any pertinent questions that can be answered through type, please shoot them here! Will get them answered.

{{snippet:club_links}}

{{snippet:faq_block}}

{{snippet:summer_schedule}}

All the best, look forward to connecting sometime.
Harrison`,
  description: "First-touch intro email; expands club/academy/PRJCT context, embeds club links + FAQ + summer schedule.",
};

const TEMPLATE_COST: TemplatePayload = {
  name: "Cost & Financial",
  type: "general",
  subject: "You. First Lacrosse — Financial Commitment",
  body: `The financial commitment: families usually break it into payments of $465 ($1,850 across four months). There's a Player Portal that handles that, and you're also more than welcome to write a check.

To reaffirm from the intro — if someone is willing and wants to be here, we will work with your family however is needed. Club fees are never a barrier.

{{snippet:club_links}}`,
  description: "Financial commitment explainer; sent after intro when parents ask about cost.",
};

const TEMPLATE_TRAINING: TemplatePayload = {
  name: "Training Schedule",
  type: "logistics",
  subject: "You. First Lacrosse — Training Schedule",
  body: `The bulk of the training we offer is every day at the Academy from 8:00am-12:00pm. It's a 4-hour block of strength & speed training, then lacrosse training, through the CLA (link below). We can extend the summer offer for that as mentioned.

Club practice is after the CLA mornings, 12:00-1:00pm twice a week (Tuesday & Thursday).

The schedule will always be on the SCHEDULE page on the website.

{{snippet:club_links}}

{{snippet:summer_schedule}}`,
  description: "Training schedule details; embeds club links + summer schedule snippet.",
};

const TEMPLATE_TOURNAMENT_NEED: TemplatePayload = {
  name: "Tournament Need",
  type: "general",
  subject: "You. First Lacrosse — Tournaments",
  body: `We'd love {{prospect_first_name}} for all the tournaments, but specifically for Live Love Lax where the {{class}}s are solo.

The full schedule is on the SCHEDULE page, and below.

{{snippet:summer_schedule}}

{{snippet:club_links}}`,
  description: "Tournament-specific recruiting nudge; references age-group and full schedule.",
};

const TEMPLATE_ROSTER_OFFER: TemplatePayload = {
  name: "Roster Offer",
  type: "general",
  subject: "You. First Elite — A Spot for {{prospect_first_name}}",
  body: `{{parent_first_name}} — after seeing {{prospect_first_name}} and where she's at, we'd love to officially offer her a spot on the {{class}} team for the {{season}} season.

The next step is simple: I'll get her set up in the Player Portal so you can handle fees and logistics there, and we'll fold her into the roster and tournament planning.

If you're in, just reply here and I'll get her onboarded right away.

{{snippet:club_links}}`,
  description: "Formal roster offer sent after the prospect has been evaluated and the club wants her.",
};

const TEMPLATE_PAYMENT_REMINDER: TemplatePayload = {
  name: "Payment Reminder",
  type: "payment_reminder",
  subject: "Reminder — {{player_name}}'s Balance",
  body: `Hey {{parent_first_name}} — just a quick update on collections for {{player_name}}.

Current balance: {{balance}}.

Here's a payment link to take care of it whenever it's convenient:
{{payment_link}}

As always, if anything about the timing or amount needs to flex, just let me know — we'll work with you.

Thanks,
Harrison`,
  description: "Friendly reminder with embedded Stripe payment link.",
};

const TEMPLATE_OVERDUE_NOTICE: TemplatePayload = {
  name: "Overdue Notice",
  type: "overdue_notice",
  subject: "Outstanding Balance — {{player_name}}",
  body: `Hi {{parent_first_name}} — following up on {{player_name}}'s account for the {{season}} season. The current outstanding balance is {{balance}}.

Payment link here:
{{payment_link}}

If there's anything going on that we should know about, please reach out — we'd much rather talk it through than have it sit. But if it's just slipped through, this link makes it quick.

Thanks,
Harrison`,
  description: "Firmer follow-up for older outstanding balances.",
};

// Map existing seeded names to their replacement payload. Each row is
// looked up by THIS name, then UPDATEd to the new content (and renamed
// if the payload's name differs). Re-runs hit the new name on lookup,
// fall through to the upsertByName path, and end up at the same state.
const RENAMES: Array<{ existingName: string; payload: TemplatePayload }> = [
  { existingName: "Intro to the Club", payload: TEMPLATE_INTRO },
  { existingName: "Season Logistics", payload: TEMPLATE_TRAINING },
  { existingName: "Payment Reminder", payload: TEMPLATE_PAYMENT_REMINDER },
  { existingName: "Overdue Notice", payload: TEMPLATE_OVERDUE_NOTICE },
];

// Templates that didn't exist in the Sprint 8 seed; inserted on first
// run, UPDATEd in place by name on subsequent runs.
const NEW_TEMPLATES: TemplatePayload[] = [
  TEMPLATE_COST,
  TEMPLATE_TOURNAMENT_NEED,
  TEMPLATE_ROSTER_OFFER,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertByName(payload: TemplatePayload): Promise<void> {
  // Look by NEW name first (re-run safe).
  const { data: existing, error: lookupErr } = await admin
    .from("email_templates")
    .select("id")
    .eq("name", payload.name)
    .maybeSingle();
  if (lookupErr) {
    console.error(`  ! lookup failed for "${payload.name}":`, lookupErr.message);
    return;
  }
  if (existing) {
    const { error } = await admin
      .from("email_templates")
      .update({
        type: payload.type,
        subject: payload.subject,
        body: payload.body,
        description: payload.description,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      console.error(`  ! update failed for "${payload.name}":`, error.message);
    } else {
      console.log(`  ✓ updated existing row: ${payload.name}`);
    }
    return;
  }
  const { error } = await admin.from("email_templates").insert({
    name: payload.name,
    type: payload.type,
    subject: payload.subject,
    body: payload.body,
    description: payload.description,
    is_default: true,
    status: "active",
  });
  if (error) {
    console.error(`  ! insert failed for "${payload.name}":`, error.message);
  } else {
    console.log(`  ✓ inserted new row: ${payload.name}`);
  }
}

async function renameAndReplace(
  existingName: string,
  payload: TemplatePayload,
): Promise<void> {
  // Try lookup by OLD name first.
  const { data: oldRow, error: lookupErr } = await admin
    .from("email_templates")
    .select("id")
    .eq("name", existingName)
    .maybeSingle();
  if (lookupErr) {
    console.error(`  ! lookup failed for "${existingName}":`, lookupErr.message);
    return;
  }
  if (oldRow) {
    const { error } = await admin
      .from("email_templates")
      .update({
        name: payload.name,
        type: payload.type,
        subject: payload.subject,
        body: payload.body,
        description: payload.description,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", oldRow.id);
    if (error) {
      console.error(`  ! rename failed for "${existingName}":`, error.message);
    } else {
      console.log(
        `  ✓ renamed + updated: "${existingName}" → "${payload.name}"`,
      );
    }
    return;
  }
  // Old row not found — fall back to the by-new-name upsert path so
  // re-runs keep working without manual cleanup.
  await upsertByName(payload);
}

async function archiveByName(name: string): Promise<void> {
  const { data: existing, error: lookupErr } = await admin
    .from("email_templates")
    .select("id, status")
    .eq("name", name)
    .maybeSingle();
  if (lookupErr) {
    console.error(`  ! lookup failed for "${name}":`, lookupErr.message);
    return;
  }
  if (!existing) {
    console.log(`  - "${name}" not found, nothing to archive`);
    return;
  }
  if (existing.status === "archived") {
    console.log(`  - "${name}" already archived`);
    return;
  }
  const { error } = await admin
    .from("email_templates")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", existing.id);
  if (error) {
    console.error(`  ! archive failed for "${name}":`, error.message);
  } else {
    console.log(`  ✓ archived: ${name}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─── Seeding email_templates with real copy ───\n");

  console.log("Renaming + replacing existing rows:");
  for (const { existingName, payload } of RENAMES) {
    await renameAndReplace(existingName, payload);
  }

  console.log("\nInserting new templates:");
  for (const payload of NEW_TEMPLATES) {
    await upsertByName(payload);
  }

  console.log("\nArchiving Sprint-8 placeholder:");
  await archiveByName("Generic Announcement");

  // Verify final state.
  const { data: final, error } = await admin
    .from("email_templates")
    .select("name, type, status")
    .eq("status", "active")
    .order("type", { ascending: true });
  if (error) {
    console.error("\n! final verification failed:", error.message);
    process.exit(1);
  }
  console.log(`\n─── Final state: ${final?.length ?? 0} active templates ───`);
  for (const t of final ?? []) {
    console.log(`  • ${(t as { name: string }).name} (${(t as { type: string }).type})`);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
