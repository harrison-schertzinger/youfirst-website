/**
 * Loading and rendering the placement templates. Server only.
 *
 * Templates come from `email_templates` — the store Hermes already uses — and
 * run through `src/lib/template-render.ts`, the engine every other email in
 * this system uses. Nothing here is a second template system; it is the
 * existing one, keyed by name and rendered into the placement shell.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { renderTemplate, type SnippetMap } from "@/lib/template-render";
import {
  buildHtml,
  buildText,
  type EmailChrome,
} from "@/lib/placement/email-shell";
import {
  missingRegions,
  parseRegions,
  unfilledMergeFields,
  type Regions,
} from "@/lib/placement/regions";
import { standardIsWritten } from "@/content/standard";
import {
  EMAIL_FOOTER,
  HERO_ALT,
  heroUrl,
  STANDARD_LINK_LABEL,
  STANDARD_URL,
} from "@/lib/placement/config";
import {
  bannedLanguageIn,
  greetingFor,
  lastNameOf,
  NUDGE_TEMPLATE_NAME,
  PLACEMENT_DEADLINE,
  PLACEMENT_DEADLINE_LONG,
  PLACEMENT_SEASON,
  PLACEMENT_TEMPLATE_NAMES,
  placementTemplateFor,
  RECEIPT_TEMPLATE_NAME,
  tierLabel,
  type EmailShape,
  type SendableTier,
  type SkipReason,
} from "@/lib/placement/shared";

export interface LoadedTemplate {
  name: string;
  subject: string;
  body: string;
}

export interface TemplateBundle {
  byName: Map<string, LoadedTemplate>;
  snippets: SnippetMap;
}

const ALL_TEMPLATE_NAMES = [
  ...PLACEMENT_TEMPLATE_NAMES,
  RECEIPT_TEMPLATE_NAME,
  NUDGE_TEMPLATE_NAME,
];

export async function loadTemplates(db: SupabaseClient): Promise<TemplateBundle> {
  const [tpls, snips] = await Promise.all([
    db
      .from("email_templates")
      .select("name, subject, body")
      .eq("type", "placement")
      .eq("status", "active")
      .in("name", ALL_TEMPLATE_NAMES),
    db.from("email_snippets").select("key, content"),
  ]);

  if (tpls.error) throw new Error(`Template read failed: ${tpls.error.message}`);
  if (snips.error) throw new Error(`Snippet read failed: ${snips.error.message}`);

  const byName = new Map<string, LoadedTemplate>();
  for (const t of (tpls.data ?? []) as LoadedTemplate[]) byName.set(t.name, t);

  const snippets: Record<string, string> = {};
  for (const s of (snips.data ?? []) as { key: string; content: string }[]) {
    snippets[s.key] = s.content;
  }

  return { byName, snippets };
}

/**
 * The template this email will render from — null when no letter can be chosen.
 *
 * CLASS IS REQUIRED, not optional with a fallback. The receipt and the nudge are
 * one letter each and ignore it; a placement letter cannot be picked without it,
 * and says so by returning null rather than guessing.
 */
export function templateNameFor(
  shape: EmailShape,
  tier: SendableTier,
  classYear: number | null,
): string | null {
  if (shape === "receipt") return RECEIPT_TEMPLATE_NAME;
  if (shape === "nudge") return NUDGE_TEMPLATE_NAME;
  return placementTemplateFor(tier, classYear);
}

// ── Merge context ─────────────────────────────────────────────────────────

export interface AthleteContext {
  name: string;
  classYear: number | null;
  tier: SendableTier;
  parentName: string | null;
  confirmUrl: string;
}

function firstWord(s: string | null): string | null {
  const w = (s ?? "").trim().split(/\s+/)[0];
  return w || null;
}

/**
 * A key that is UNKNOWN is OMITTED, never set to "".
 *
 * The renderer leaves an unmatched `{{token}}` literal, which the
 * unfilled_merge_field check then hard-blocks. So a template that reaches for a
 * name we do not have fails loudly instead of quietly emitting "Hi ," to a
 * family. Empty-string defaults are the reason that class of bug ships.
 */
export function mergeContext(a: AthleteContext): Record<string, string> {
  const first = firstWord(a.name) ?? a.name;
  const parentFirst = firstWord(a.parentName);
  const greeting = greetingFor(a.parentName, a.name);
  const surname = lastNameOf(a.name);
  return {
    player_name: a.name,
    player_first_name: first,
    ...(parentFirst ? { parent_first_name: parentFirst } : {}),
    ...(surname ? { player_last_name: surname, family_name: `${surname} family` } : {}),
    // The complete opening line — "Meredith —" or "Cline family —". Omitted
    // when neither is knowable, which blocks the send rather than greeting
    // nobody. Templates should reach for THIS, not for the parts.
    ...(greeting ? { parent_greeting: greeting } : {}),
    placement_label: tierLabel(a.tier, a.classYear),
    class_year: a.classYear != null ? String(a.classYear) : "",
    season: PLACEMENT_SEASON,
    // Fixed for the whole round — never an input on the send screen.
    deadline: PLACEMENT_DEADLINE,
    deadline_long: PLACEMENT_DEADLINE_LONG,
    confirm_url: a.confirmUrl,
    club: "YOU. FIRST Elite Lacrosse",
  };
}

// ── Rendering one athlete's email ─────────────────────────────────────────

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  regions: Regions;
}

export type RenderResult =
  | { ok: true; email: RenderedEmail }
  | { ok: false; reason: SkipReason; detail: string };

/**
 * Render one athlete's email, or refuse with a reason.
 *
 * THE THREE REFUSALS, all hard:
 *   no_template            — the tier has no active template.
 *   unwritten_copy         — a `[[ ]]` block survived, or a required region is
 *                            missing. An email reading "[[ THE OPENING ]]" must
 *                            never reach a family.
 *   unfilled_merge_field   — a `{{ }}` survived. An email reading
 *                            "{{player_name}}" destroys the credibility the
 *                            whole send depends on.
 *
 * Subject is checked as strictly as body: a broken subject line is the first
 * thing she sees.
 */
export function renderEmail(
  bundle: TemplateBundle,
  shape: EmailShape,
  athlete: AthleteContext,
  actionUrl: string,
  /** TEST SENDS ONLY — swaps the header band so treatments can be compared
   *  in a real inbox. Live sends never pass it. */
  headerVariant?: string | null,
): RenderResult {
  // No class, no letter. The refusal is the point: a placement letter chosen
  // without a graduation year is chosen by tier, and every tier is 'elite'.
  const name = templateNameFor(shape, athlete.tier, athlete.classYear);
  if (!name) {
    return {
      ok: false,
      reason: "no_class_year",
      detail:
        "No graduation year on file, so no letter can be chosen for her — set or merge her before sending.",
    };
  }
  const tpl = bundle.byName.get(name);
  if (!tpl) {
    return { ok: false, reason: "no_template", detail: `No active template named "${name}"` };
  }

  // Held before anything renders: no parent first name AND no surname means
  // there is no honest way to open the email. Applies to every shape — offer,
  // nudge and receipt all come through here.
  if (!greetingFor(athlete.parentName, athlete.name)) {
    return {
      ok: false,
      reason: "no_greeting_name",
      detail:
        "No parent name on file and no last name to fall back on — add either before sending.",
    };
  }

  const ctx = mergeContext(athlete);
  const rendered = renderTemplate(
    { subject: tpl.subject, body: tpl.body },
    ctx,
    bundle.snippets,
  );

  if (!rendered.subject.trim()) {
    return {
      ok: false,
      reason: "unwritten_copy",
      detail: "The subject line is empty",
    };
  }

  const regions = parseRegions(rendered.body);

  // The [[ ]] gate is gone — the copy is written. A region that is MISSING or
  // EMPTY is still a hard block: that is a broken template, not an unfinished
  // one, and it would put a hole in the middle of a family's email.
  const missing = missingRegions(regions, shape);
  if (missing.length) {
    return {
      ok: false,
      reason: "unwritten_copy",
      detail: `Empty or missing content: ${missing.join(", ")}`,
    };
  }

  const unfilled = unfilledMergeFields(`${rendered.subject}\n${rendered.body}`);
  if (unfilled.length) {
    return {
      ok: false,
      reason: "unfilled_merge_field",
      detail: `Did not fill: ${unfilled.join(", ")}`,
    };
  }

  // Addendum B3. Checked on the RENDERED text, so a banned word arriving
  // through a snippet or a merge value is caught too, not just one typed into
  // the template body.
  const banned = bannedLanguageIn(`${rendered.subject}\n${rendered.body}`);
  if (banned.length) {
    return {
      ok: false,
      reason: "banned_language",
      detail: `Addendum B bans ${banned.join(", ")}`,
    };
  }

  const chrome: EmailChrome = {
    shape,
    eyebrow:
      shape === "receipt"
        ? `Confirmed · ${PLACEMENT_SEASON} season`
        : `Placement · ${PLACEMENT_SEASON} season`,
    headline: tierLabel(athlete.tier, athlete.classYear),
    subhead: athlete.name,
    actionUrl,
    // The Standard link SELF-SUPPRESSES until /standard has copy: sending 86
    // families to a page of "Pending Harrison" chips is worse than sending them
    // no second link at all. It reappears on its own the moment
    // src/content/standard.ts is written — nothing to remember.
    // Equal to actionUrl → the shell renders no secondary link (see email-shell).
    standardUrl: standardIsWritten() ? STANDARD_URL : actionUrl,
    standardLabel: STANDARD_LINK_LABEL,
    heroUrl: heroUrl(headerVariant),
    heroAlt: HERO_ALT,
    footer: EMAIL_FOOTER,
  };

  return {
    ok: true,
    email: {
      subject: rendered.subject,
      html: buildHtml(chrome, regions),
      text: buildText(chrome, regions),
      regions,
    },
  };
}

// ── Template health, for the send screen ──────────────────────────────────

/**
 * Every letter, checked once — BY TEMPLATE, not by tier.
 *
 * Iterating the tiers used to check four letters because four tiers mapped to
 * four names. With one tier value club-wide that loop would check the college
 * letter four times and never open the youth letter at all, so a broken region
 * or a banned phrase in the letter tonight's families receive would not have
 * appeared on the screen whose whole job is to say the copy is not finished.
 */
export function templateHealth(bundle: TemplateBundle) {
  const entries: {
    templateName: string;
    found: boolean;
    unwritten: string[];
    missingRegions: string[];
    /** Addendum B3 hits, surfaced while writing rather than at send time. */
    banned: string[];
  }[] = [];

  const check = (templateName: string, shape: EmailShape) => {
    const tpl = bundle.byName.get(templateName);
    if (!tpl) {
      entries.push({
        templateName,
        found: false,
        unwritten: [],
        missingRegions: [],
        banned: [],
      });
      return;
    }
    const regions = parseRegions(tpl.body);
    entries.push({
      templateName,
      found: true,
      unwritten: [],
      missingRegions: missingRegions(regions, shape),
      banned: bannedLanguageIn(`${tpl.subject}\n${tpl.body}`),
    });
  };

  for (const name of PLACEMENT_TEMPLATE_NAMES) check(name, "placement");
  check(RECEIPT_TEMPLATE_NAME, "receipt");
  check(NUDGE_TEMPLATE_NAME, "nudge");

  return entries;
}
