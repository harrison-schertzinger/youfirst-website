/**
 * Email template renderer (v2 — Sprint 10).
 *
 * Substitution semantics:
 *  • `{{key}}` — replaced by context[key] when defined and non-null.
 *    Empty strings DO substitute. Missing/undefined/null values leave
 *    the placeholder literal so misses are obvious in the preview.
 *  • `{{snippet:summer_schedule}}` — replaced by the snippet content
 *    looked up by key. Unknown keys leave the literal.
 *
 * Snippets are expanded BEFORE context placeholders, so a snippet that
 * itself contains `{{player_name}}` will substitute on the second pass.
 * Multi-pass with an explicit cap so a self-referential snippet can't
 * loop forever.
 *
 * The renderer never throws — templates seed empty in this project and
 * surfaces hand the output straight to admins as preview text.
 */

export interface TemplateContext {
  player_name?: string | null;
  prospect_first_name?: string | null;
  parent_first_name?: string | null;
  parent_last_name?: string | null;
  class?: string | null;
  grad_year?: string | null;
  balance?: string | null;
  payment_link?: string | null;
  season?: string | null;
  intro_buddies?: string | null;
  // Compose surfaces unfilled keys as inputs at render time; allow arbitrary
  // string keys for free-text placeholders added by admins in new templates.
  [key: string]: string | null | undefined;
}

export type SnippetMap = Readonly<Record<string, string>>;

export interface RenderInput {
  subject: string;
  body: string;
}

export interface RenderOutput {
  subject: string;
  body: string;
}

// Allow colons in placeholder keys to support `snippet:key` syntax.
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_:]*)\s*\}\}/g;

const SNIPPET_PREFIX = "snippet:";

// Snippet expansion can introduce more placeholders or even more
// snippets (we don't currently nest, but the engine should tolerate it).
// Cap so a malformed self-referential snippet doesn't run forever.
const MAX_PASSES = 6;

function substituteOnce(
  input: string,
  context: TemplateContext,
  snippets: SnippetMap,
): string {
  return input.replace(PLACEHOLDER_RE, (match, key: string) => {
    if (key.startsWith(SNIPPET_PREFIX)) {
      const snippetKey = key.slice(SNIPPET_PREFIX.length);
      if (Object.prototype.hasOwnProperty.call(snippets, snippetKey)) {
        return snippets[snippetKey];
      }
      // Unknown snippet — leave literal so the admin sees the typo.
      return match;
    }
    const value = (context as Record<string, unknown>)[key];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
}

function substituteStable(
  input: string,
  context: TemplateContext,
  snippets: SnippetMap,
): string {
  let prev = input;
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = substituteOnce(prev, context, snippets);
    if (next === prev) return next;
    prev = next;
  }
  return prev;
}

export function renderTemplate(
  template: RenderInput,
  context: TemplateContext,
  snippets: SnippetMap = {},
): RenderOutput {
  return {
    subject: substituteStable(template.subject ?? "", context, snippets),
    body: substituteStable(template.body ?? "", context, snippets),
  };
}

/**
 * Extract every distinct context placeholder key referenced in a
 * template. Snippet placeholders (`snippet:foo`) are NOT included —
 * those expand from the snippets map and don't need admin input.
 *
 * Used by the Compose modal to surface "Fill in: intro_buddies"
 * style inputs for free-text placeholders that have no canonical
 * context value.
 */
export function extractPlaceholders(template: RenderInput): string[] {
  const seen = new Set<string>();
  const combined = `${template.subject ?? ""}\n${template.body ?? ""}`;
  // Reset lastIndex by using matchAll, which produces a fresh iterator.
  for (const match of combined.matchAll(PLACEHOLDER_RE)) {
    const key = match[1];
    if (!key.startsWith(SNIPPET_PREFIX)) {
      seen.add(key);
    }
  }
  return Array.from(seen);
}

/**
 * Compute the set of placeholders that aren't filled by the given
 * context — what the Compose modal turns into input fields.
 *
 * A key is "filled" when context has a non-null, non-undefined value
 * for it. Empty strings count as filled (admin typed nothing on
 * purpose) so the modal doesn't re-prompt for them.
 */
export function unfilledPlaceholders(
  template: RenderInput,
  context: TemplateContext,
): string[] {
  return extractPlaceholders(template).filter((key) => {
    const v = (context as Record<string, unknown>)[key];
    return v === undefined || v === null;
  });
}

export const TEMPLATE_PLACEHOLDERS: ReadonlyArray<keyof TemplateContext> = [
  "player_name",
  "prospect_first_name",
  "parent_first_name",
  "parent_last_name",
  "class",
  "grad_year",
  "balance",
  "payment_link",
  "season",
  "intro_buddies",
];
