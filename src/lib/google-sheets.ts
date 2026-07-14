/**
 * Google Sheet sync for paid tryout registrations.
 *
 * Supabase is the source of truth; this is a convenience mirror so the club can
 * open one sheet and print rosters. Dependency-free: a service-account JWT is
 * signed with Node `crypto` (RS256), exchanged for an access token, then a row
 * is appended via the Sheets API. No `googleapis` SDK.
 *
 * FAIL SOFT: if creds are missing or any call errors, we log and return
 * { synced:false } — the caller must NEVER let this break payment or the DB.
 *
 * Required env to actually sync:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — the full service-account key JSON (one line)
 *   GOOGLE_SHEET_ID             — the spreadsheet id from its URL
 *   GOOGLE_SHEET_TAB            — optional tab name (default "Sheet1")
 *
 * ⚠️ This sheet holds minors' personal data. Share it ONLY with specific named
 * Google accounts (+ the service-account email) — never "anyone with the link."
 */

import { getAccessToken, getServiceAccount } from "@/lib/google-auth";

/** Canonical column order — must match the header row in the Sheet. */
export const SHEET_COLUMNS = [
  "Timestamp",
  "Tryout Type",
  "Tryout Date",
  "Player Full Name",
  "Parent Name",
  "Email",
  "Phone",
  "Graduation Year",
  "Position",
  "Payment Status",
] as const;

export interface TryoutSheetRow {
  /** ISO timestamp of the paid event. */
  timestampIso: string;
  /** "Scheduled" | "Make-up" */
  tryoutTypeLabel: string;
  /** YYYY-MM-DD (sortable for per-session printing). */
  tryoutDateIso: string;
  playerFullName: string;
  parentName: string;
  email: string;
  phone: string;
  graduationYear: number | string;
  position: string;
  paymentStatus: string;
}

/** Append one paid registration to the Sheet. Fail-soft; never throws. */
export async function syncTryoutToSheet(
  row: TryoutSheetRow,
): Promise<{ synced: boolean; reason?: string }> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sa = getServiceAccount();
  if (!sheetId || !sa) {
    console.warn(
      "Google Sheet sync skipped — GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON not set.",
    );
    return { synced: false, reason: "no_creds" };
  }

  const token = await getAccessToken(sa);
  if (!token) return { synced: false, reason: "no_token" };

  const values = [
    [
      row.timestampIso,
      row.tryoutTypeLabel,
      row.tryoutDateIso,
      row.playerFullName,
      row.parentName,
      row.email,
      row.phone,
      String(row.graduationYear),
      row.position,
      row.paymentStatus,
    ],
  ];

  const tab = process.env.GOOGLE_SHEET_TAB || "Sheet1";
  const range = encodeURIComponent(`${tab}!A1`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      console.error("Sheets append failed:", res.status, await res.text().catch(() => ""));
      return { synced: false, reason: `append_${res.status}` };
    }
    return { synced: true };
  } catch (err) {
    console.error("Sheets append threw:", err);
    return { synced: false, reason: "exception" };
  }
}
