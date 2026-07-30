/**
 * Template body → content regions.
 *
 * A placement template body looks like this:
 *
 *     --- opening ---
 *     Her spot on {{placement_label}} is confirmed.
 *
 *     --- pillar_1 ---
 *     Own development in this area.
 *     What that means for her, in two sentences.
 *
 * TWO MARKER LANGUAGES, deliberately different:
 *
 *   {{key}}   a merge field, filled by src/lib/template-render.ts.
 *   [[ ... ]] copy nobody has written yet.
 *
 * The distinction matters because they fail differently. An unfilled `{{}}`
 * is a bug — a template asked for a value the athlete does not have. An
 * unresolved `[[ ]]` is an unfinished draft. Both are hard blocks on the send
 * path, but Harrison needs to be told which one he is looking at, because one
 * is his to fix and the other is mine.
 */

import { type EmailShape, regionsFor } from "@/lib/placement/shared";

/** `--- key ---` alone on a line opens a region. */
const REGION_RE = /^---\s*([a-z0-9_]+)\s*---\s*$/i;

/** `[[ anything ]]`, non-greedy, across lines. */
const UNWRITTEN_RE = /\[\[[\s\S]*?\]\]/g;

/** `{{anything}}` left behind after rendering. */
const UNFILLED_RE = /\{\{[^}]+\}\}/g;

export type Regions = Record<string, string>;

export function parseRegions(body: string): Regions {
  const out: Regions = {};
  let current: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) out[current] = buffer.join("\n").trim();
    buffer = [];
  };

  for (const line of (body ?? "").split(/\r?\n/)) {
    const match = line.match(REGION_RE);
    if (match) {
      flush();
      current = match[1].toLowerCase();
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return out;
}

/** Region keys the shape requires that the body does not define (or leaves empty). */
export function missingRegions(regions: Regions, shape: EmailShape): string[] {
  return regionsFor(shape).filter((key) => !regions[key]?.trim());
}

/** Region keys still carrying a `[[ ]]` block. */
export function unwrittenRegions(regions: Regions): string[] {
  return Object.entries(regions)
    .filter(([, value]) => UNWRITTEN_RE.test(resetAndReturn(value)))
    .map(([key]) => key);
}

export function hasUnwrittenCopy(text: string): boolean {
  return UNWRITTEN_RE.test(resetAndReturn(text));
}

export function unfilledMergeFields(text: string): string[] {
  return Array.from(new Set(text.match(UNFILLED_RE) ?? []));
}

/**
 * The regexes are /g, which makes .test() stateful across calls. Every caller
 * goes through here so a previous call can never make the next one lie.
 */
function resetAndReturn(value: string): string {
  UNWRITTEN_RE.lastIndex = 0;
  return value;
}

/**
 * A pillar is a bold lead-in on the first line and body on the rest —
 * the structure the brief asks for, and the thing that makes the email read
 * as a club with a plan rather than a form letter.
 */
export interface Pillar {
  lead: string;
  body: string;
}

export function splitPillar(region: string | undefined): Pillar | null {
  if (!region?.trim()) return null;
  const lines = region.trim().split(/\r?\n/);
  const lead = lines[0].trim();
  const body = lines.slice(1).join("\n").trim();
  return { lead, body };
}

export function pillarsFrom(regions: Regions): Pillar[] {
  return [regions.pillar_1, regions.pillar_2, regions.pillar_3, regions.pillar_4]
    .map(splitPillar)
    .filter((p): p is Pillar => p !== null);
}

/** Blank line → paragraph. Single newlines stay inside a paragraph. */
export function paragraphsOf(region: string | undefined): string[] {
  if (!region?.trim()) return [];
  return region
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
