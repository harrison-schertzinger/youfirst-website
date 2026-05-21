/**
 * Allowed player positions. Single source of truth — referenced by the
 * inline spreadsheet editor, the PlayerInfoEditable form, the player
 * PATCH route, and the inline-update route. Adding a value here lights
 * up the option in all four places.
 *
 * The DB column is `players.position text` with no CHECK constraint, so
 * this list is the only thing keeping bad values out.
 */
export const ALLOWED_POSITIONS = [
  "Attack",
  "Midfield",
  "Defense",
  "Goalie",
  "Other",
] as const;

export type Position = (typeof ALLOWED_POSITIONS)[number];

export function isAllowedPosition(value: unknown): value is Position {
  return (
    typeof value === "string" &&
    (ALLOWED_POSITIONS as readonly string[]).includes(value)
  );
}
