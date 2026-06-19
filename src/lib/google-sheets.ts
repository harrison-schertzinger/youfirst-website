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

import crypto from "crypto";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

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

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      // env-escaped "\n" → real newlines for the PEM
      private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
    };
  } catch (err) {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON parse failed:", err);
    return null;
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;

  let signature: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    signature = base64url(signer.sign(sa.private_key));
  } catch (err) {
    console.error("Sheets JWT sign failed:", err);
    return null;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
    });
    if (!res.ok) {
      console.error("Sheets token exchange failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch (err) {
    console.error("Sheets token exchange threw:", err);
    return null;
  }
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
