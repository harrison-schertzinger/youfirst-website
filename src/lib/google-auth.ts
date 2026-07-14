/**
 * Google service-account auth, shared by every Sheets integration.
 * Extracted from google-sheets.ts so the Roster Command Sheet engine and the
 * legacy append sync use one credential path. Dependency-free: the JWT is
 * signed with Node `crypto` (RS256) and exchanged for an OAuth access token.
 *
 * Required env: GOOGLE_SERVICE_ACCOUNT_JSON — the full service-account key
 * JSON (one line). Missing creds → null returns, never throws; callers are
 * responsible for failing soft.
 */

import crypto from "crypto";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function getServiceAccount(): ServiceAccount | null {
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

export async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
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
