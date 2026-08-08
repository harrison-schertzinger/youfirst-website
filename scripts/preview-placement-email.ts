/**
 * Render the placement email to a file, without a database write and without
 * sending anything.
 *
 *   npx tsx scripts/preview-placement-email.ts            # sample copy
 *   npx tsx scripts/preview-placement-email.ts --live     # the DB templates as they stand
 *
 * WHY: while a template still carries `[[ ]]` blocks, every send path refuses
 * it — correctly — which also means the design cannot be looked at through the
 * admin preview. This renders the shell with stand-in prose so the layout,
 * type and plain-text alternative can be judged before the copy exists.
 *
 * The sample prose lives ONLY in this script. It is never written to the
 * database and can never reach a family.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import {
  buildHtml,
  buildText,
  type EmailChrome,
} from "../src/lib/placement/email-shell";
import { parseRegions } from "../src/lib/placement/regions";
import { renderTemplate } from "../src/lib/template-render";
import { getServiceClient } from "../src/lib/placement/config";
import { standardIsWritten } from "../src/content/standard";
import { loadTemplates } from "../src/lib/placement/templates";
import { mergeContext } from "../src/lib/placement/templates";
import {
  PLACEMENT_SEASON,
  placementTemplateFor,
  tierLabel,
  type SendableTier,
} from "../src/lib/placement/shared";

const OUT_DIR = path.resolve(process.cwd(), "documents/placement-preview");

/**
 * Stand-in prose for the layout-only mode, in the real region shape
 * (opening / spine / closing / signature). Never written to the database.
 */
const SAMPLE: Record<string, string> = {
  opening:
    "{{parent_greeting}}\n\nSample opening. The placement is stated plainly in the first sentence, so a parent reading on a phone in a parking lot knows the answer before they scroll.",
  spine:
    "Sample spine paragraph one — the club's commitment.\n\nSample spine paragraph two — the record.\n\nSample spine paragraph three — the coaches.\n\nSample spine paragraph four — how often she trains.",
  closing:
    "Sample closing. The ask, and the deadline.\n\nSample sign-off line.",
  button_label: "Confirm {{player_first_name}}'s spot",
  signature: "Harrison Schertzinger\nDirector, You First Elite Lacrosse",
};

function sampleBody(): string {
  return Object.entries(SAMPLE)
    .map(([key, value]) => `--- ${key} ---\n${value}`)
    .join("\n\n");
}

async function main() {
  const live = process.argv.includes("--live");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const athlete = {
    name: "Ella Whitmore",
    classYear: 2030,
    parentName: "Michelle Whitmore",
    confirmUrl: "https://www.youfirstlacrosse.com/placement/SAMPLE-TOKEN",
  };

  const tiers: SendableTier[] = ["elite", "blue", "elite_youth", "elite_training"];

  let liveBodies: Map<string, { subject: string; body: string }> | null = null;
  if (live) {
    const db = getServiceClient();
    if (!db) throw new Error("Missing Supabase env — cannot read live templates.");
    const bundle = await loadTemplates(db);
    liveBodies = new Map(
      Array.from(bundle.byName.entries()).map(([name, t]) => [
        name,
        { subject: t.subject, body: t.body },
      ]),
    );
  }

  for (const tier of tiers) {
    const ctx = mergeContext({ ...athlete, tier });
    const source = live
      ? liveBodies?.get(placementTemplateFor(tier, athlete.classYear) ?? "")
      : { subject: `Sample subject — {{placement_label}}`, body: sampleBody() };
    if (!source) {
      console.warn(`! No template for ${tier} — skipped.`);
      continue;
    }

    const rendered = renderTemplate(source, ctx, {});
    const regions = parseRegions(rendered.body);
    // Annotated, so a field added to EmailChrome fails the typecheck here
    // instead of rendering "undefined: undefined" into a preview.
    const chrome: EmailChrome = {
      shape: "placement",
      eyebrow: `Placement · ${PLACEMENT_SEASON} season`,
      headline: tierLabel(tier, athlete.classYear),
      subhead: athlete.name,
      actionUrl: athlete.confirmUrl,
      // Mirrors renderEmail: the Standard link is suppressed until /standard
      // has copy, and the shell drops it when it equals the primary action.
      // Hardcoding a URL here made previews show a link the real send omits.
      standardUrl: standardIsWritten()
        ? "https://www.youfirstlacrosse.com/standard"
        : athlete.confirmUrl,
      standardLabel: "Read The You First Standard",
      // Absolute in production; the local file renders against the live site.
      heroUrl: "https://www.youfirstlacrosse.com/images/email/placement-hero.jpg",
      heroAlt: "YOU. FIRST athletes on the field at sunrise.",
      footer: "YOU. FIRST Elite Lacrosse Club · Cincinnati, Ohio",
    };

    const html = buildHtml(chrome, regions);
    const text = buildText(chrome, regions);
    const stem = path.join(OUT_DIR, `${tier}${live ? "-live" : ""}`);
    fs.writeFileSync(`${stem}.html`, html, "utf8");
    fs.writeFileSync(`${stem}.txt`, text, "utf8");
    console.log(`✓ ${path.relative(process.cwd(), stem)}.html  (+ .txt)`);
  }

  console.log(
    live
      ? "\nRendered from the LIVE templates — [[ ]] blocks appear exactly as a send would refuse them."
      : "\nRendered with SAMPLE copy from this script. Nothing was written to the database.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
