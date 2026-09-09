/**
 * The War Room — vocabulary shared by the server routes and the board.
 *
 * Pure data and pure functions only. No Supabase, no env vars, so the client
 * bundle can import this file without dragging the service-role key anywhere
 * near it. Same split as src/lib/rosters/shared.ts vs data.ts.
 *
 * DELIBERATELY SMALL. The spec called this a shared whiteboard, not a project
 * management tool: a card is a title, a line of description, and who put it
 * up. There is no due date, no assignee, no priority score, and adding one
 * later should require arguing with this comment first — the moment a card
 * carries a deadline, someone has to maintain it, and an unmaintained board is
 * worse than no board.
 */

export const BOARD_COLUMNS = ["doing_now", "needs_decision", "ideas"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export function isBoardColumn(v: unknown): v is BoardColumn {
  return typeof v === "string" && (BOARD_COLUMNS as readonly string[]).includes(v);
}

/** Column headings, and the one line under each that says what belongs there. */
export const COLUMN_META: Record<BoardColumn, { title: string; hint: string }> = {
  doing_now: {
    title: "Doing Now",
    hint: "In motion this week.",
  },
  needs_decision: {
    title: "Needs a Decision",
    hint: "Blocked on Harrison, Henry, or Luke.",
  },
  ideas: {
    title: "Ideas",
    hint: "Parked. Not work yet.",
  },
};

/** Mirrors the CHECK constraints in scripts/luke-handoff-migration.sql. */
export const TITLE_MAX = 120;
export const BODY_MAX = 400;

export interface WarRoomCard {
  id: string;
  board_column: BoardColumn;
  title: string;
  body: string | null;
  added_by: string;
  created_at: string;
}

/**
 * Who put the card up, short enough to sit in a card footer. The board stores
 * the full admin email because that is what the session proves; nobody wants to
 * read "harrison@youfirstlacrosse.com" four times in a column.
 */
export function shortAuthor(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}
