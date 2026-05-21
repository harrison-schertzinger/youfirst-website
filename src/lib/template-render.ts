/**
 * Email template renderer.
 *
 * Replaces `{{placeholder}}` tokens in subject + body using values from a
 * context object. Single source of truth shared by the templates UI and
 * the Send Reminder modal.
 *
 * Substitution rules (documented for posterity):
 *  • If `context[key]` is defined and non-null, replace `{{key}}` with
 *    `String(context[key])`. Empty strings DO substitute (so an empty
 *    `payment_link` blanks the placeholder rather than leaving it).
 *  • If `context[key]` is undefined or null, the placeholder is left
 *    untouched. This makes missing-data bugs visible to the admin in
 *    the preview rather than silently emailing parents "{{balance}}".
 *  • Unknown placeholders (no matching key in context) are also left
 *    untouched. Same reason.
 *
 * The renderer is intentionally not strict — it never throws on a
 * bad placeholder name, because templates seed empty in this sprint
 * and admins will paste real copy in over time.
 */

export interface TemplateContext {
  player_name?: string | null;
  parent_first_name?: string | null;
  parent_last_name?: string | null;
  balance?: string | null;
  payment_link?: string | null;
  season?: string | null;
}

export const TEMPLATE_PLACEHOLDERS: Array<keyof TemplateContext> = [
  "player_name",
  "parent_first_name",
  "parent_last_name",
  "balance",
  "payment_link",
  "season",
];

export interface RenderInput {
  subject: string;
  body: string;
}

export interface RenderOutput {
  subject: string;
  body: string;
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function substituteOnce(input: string, context: TemplateContext): string {
  return input.replace(PLACEHOLDER_RE, (match, key: string) => {
    const value = (context as Record<string, unknown>)[key];
    if (value === undefined || value === null) {
      // Leave literal so missing values are visible in the preview.
      return match;
    }
    return String(value);
  });
}

export function renderTemplate(
  template: RenderInput,
  context: TemplateContext,
): RenderOutput {
  return {
    subject: substituteOnce(template.subject ?? "", context),
    body: substituteOnce(template.body ?? "", context),
  };
}
