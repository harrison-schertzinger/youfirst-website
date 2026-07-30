/**
 * Email template type enum + display labels. Mirrors the DB CHECK in
 * scripts/sprint8-migration.sql.
 */

export const TEMPLATE_TYPES = [
  "intro",
  "logistics",
  "payment_reminder",
  "overdue_notice",
  "announcement",
  "general",
  "custom",
  "qa_acknowledgement",
  "placement",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TEMPLATE_STATUSES = ["active", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export function isTemplateType(value: unknown): value is TemplateType {
  return (
    typeof value === "string" &&
    (TEMPLATE_TYPES as readonly string[]).includes(value)
  );
}

export function isTemplateStatus(value: unknown): value is TemplateStatus {
  return (
    typeof value === "string" &&
    (TEMPLATE_STATUSES as readonly string[]).includes(value)
  );
}

export const templateTypeLabel: Record<TemplateType, string> = {
  intro: "Intro",
  logistics: "Logistics",
  payment_reminder: "Payment Reminder",
  overdue_notice: "Overdue Notice",
  announcement: "Announcement",
  general: "General",
  custom: "Custom",
  qa_acknowledgement: "Q&A Acknowledgement",
  placement: "Placement",
};
