/**
 * Prospect stage + status enums + display metadata.
 * Single source of truth shared by the API routes, the kanban view, the
 * detail page, and the DB CHECK constraint in scripts/sprint8-migration.sql.
 */

export const PROSPECT_STAGES = [
  "interested",
  "contacted",
  "parent_confirmed",
  "ready_to_onboard",
  "converted",
  "declined",
] as const;

export type ProspectStage = (typeof PROSPECT_STAGES)[number];

export const PROSPECT_STATUSES = ["active", "archived"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export function isProspectStage(value: unknown): value is ProspectStage {
  return (
    typeof value === "string" &&
    (PROSPECT_STAGES as readonly string[]).includes(value)
  );
}

export function isProspectStatus(value: unknown): value is ProspectStatus {
  return (
    typeof value === "string" &&
    (PROSPECT_STATUSES as readonly string[]).includes(value)
  );
}

export const stageLabel: Record<ProspectStage, string> = {
  interested: "Interested",
  contacted: "Contacted",
  parent_confirmed: "Parent Confirmed",
  ready_to_onboard: "Ready to Onboard",
  converted: "Converted",
  declined: "Declined",
};

/**
 * Stages that count as "pipeline progress" once reached. Used by the PATCH
 * route to decide whether to auto-stamp last_contacted_at on a forward move
 * out of `interested`/`contacted`.
 */
export const PROGRESSED_STAGES: ReadonlySet<ProspectStage> = new Set<ProspectStage>([
  "parent_confirmed",
  "ready_to_onboard",
  "converted",
  "declined",
]);

export const PRE_PROGRESS_STAGES: ReadonlySet<ProspectStage> = new Set<ProspectStage>([
  "interested",
  "contacted",
]);
