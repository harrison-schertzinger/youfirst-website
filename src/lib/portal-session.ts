import crypto from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Parent-portal session token.
 *
 * The parent portal does NOT use Supabase Auth (that stays reserved for the
 * coach/admin Command Center). Instead, after a parent proves the universal
 * password, this module mints a lightweight HMAC-signed token that identifies
 * the logged-in email + its guardian row. The token is stored in an httpOnly
 * cookie — the browser bundle never sees the password or the signing secret,
 * and every portal read/write re-validates the token server-side and reaches
 * Supabase through the service role.
 *
 * This file is server-only: it imports node:crypto and reads server secrets.
 * Never import it from a "use client" component.
 */

export const PORTAL_COOKIE_NAME = "yf_portal";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface PortalSession {
  email: string;
  guardianId: string;
}

interface TokenPayload extends PortalSession {
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.PORTAL_TOKEN_SECRET;
  if (!secret) {
    throw new Error("PORTAL_TOKEN_SECRET is not configured.");
  }
  return secret;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
}

/** Mint a signed token for a logged-in parent. */
export function signPortalToken(
  session: PortalSession,
  nowMs: number = Date.now(),
): string {
  const iat = Math.floor(nowMs / 1000);
  const payload: TokenPayload = {
    email: session.email,
    guardianId: session.guardianId,
    iat,
    exp: iat + MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/**
 * Verify a token. Returns the session on success, or null if the token is
 * missing, malformed, tampered with (signature mismatch), or expired.
 * Signature comparison is constant-time.
 */
export function verifyPortalToken(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): PortalSession | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(body);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.email !== "string" ||
    typeof payload.guardianId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp * 1000 <= nowMs) return null;

  return { email: payload.email, guardianId: payload.guardianId };
}

/** Read + verify the portal session from a route-handler request. */
export function readPortalSession(
  request: NextRequest,
  nowMs: number = Date.now(),
): PortalSession | null {
  return verifyPortalToken(request.cookies.get(PORTAL_COOKIE_NAME)?.value, nowMs);
}

/** Cookie options for setting the session (and, with maxAge 0, clearing it). */
export function portalCookieOptions(maxAgeSeconds: number = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
