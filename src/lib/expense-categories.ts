/**
 * Expense category enum, labels, and colors.
 *
 * Single source of truth shared by the API routes, the new-expense form,
 * the expenses table, the financials breakdown, and the database CHECK
 * constraint on `expenses.category`. If you add or rename a category,
 * update the Postgres constraint in the same change.
 */

export const EXPENSE_CATEGORIES = [
  "tournament_fees",
  "gear",
  "uniforms",
  "travel_hotel",
  "travel_transport",
  "food",
  "admin",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface CategoryMeta {
  text: string;
  color: string;
}

export const expenseCategoryMeta: Record<ExpenseCategory, CategoryMeta> = {
  tournament_fees: { text: "Tournament Fees", color: "#4A90D9" },
  gear: { text: "Gear", color: "#34D399" },
  uniforms: { text: "Uniforms", color: "#8B5CF6" },
  travel_hotel: { text: "Travel — Hotel", color: "#F59E0B" },
  travel_transport: { text: "Travel — Transport", color: "#EF4444" },
  food: { text: "Food", color: "#EC4899" },
  admin: { text: "Admin & Overhead", color: "#6B7280" },
  other: { text: "Other", color: "#14B8A6" },
};

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === "string" &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value)
  );
}
