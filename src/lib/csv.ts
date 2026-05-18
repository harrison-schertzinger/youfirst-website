/**
 * CSV escape + render utilities. Shared by the expenses and financials
 * export routes. RFC 4180 escaping: wrap any cell containing a comma,
 * quote, or newline in double quotes, and double up any internal
 * double quotes.
 */

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Formula-injection guard: Excel / Sheets will execute a cell whose first
  // character is =, +, -, @, tab, or CR. Prefix a tick so the cell renders
  // as plain text. Cheap, harmless, mitigates a class of macro abuse.
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

/** Convenience: pass any cell value, get a string back, then run through
 *  rowsToCsv. Avoids forcing callers to String() every nullable. */
export function rowsToCsvLoose(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

/** YYYY-MM-DD in the operator's local time. Used for filename stamps. */
export function localDateStamp(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
