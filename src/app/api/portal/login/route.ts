import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  signPortalToken,
  portalCookieOptions,
  PORTAL_COOKIE_NAME,
} from "@/lib/portal-session";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Per-IP throttle to slow brute-force / email enumeration. In-memory and
// best-effort (per server instance) — deliberately NOT an allowlist: any email
// can still log in and pay; this only rate-limits a single IP's attempts. ──
const RL_WINDOW_MS = 60_000;
const RL_MAX_ATTEMPTS = 10;
const rlHits = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string, nowMs: number): boolean {
  const rec = rlHits.get(ip);
  if (!rec || nowMs >= rec.resetAt) {
    rlHits.set(ip, { count: 1, resetAt: nowMs + RL_WINDOW_MS });
    // Opportunistically prune expired entries so the map can't grow unbounded.
    if (rlHits.size > 5000) {
      for (const [k, v] of rlHits) if (v.resetAt <= nowMs) rlHits.delete(k);
    }
    return false;
  }
  rec.count += 1;
  return rec.count > RL_MAX_ATTEMPTS;
}

/** Constant-time string compare via fixed-length digests. */
function passwordMatches(provided: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Derive a friendly placeholder first name from an email local-part. */
function deriveFirstName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const letters = local.replace(/[^a-zA-Z]/g, "");
  if (!letters) return "Parent";
  return letters.charAt(0).toUpperCase() + letters.slice(1, 40);
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientIp(request), Date.now())) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const universal = process.env.PORTAL_UNIVERSAL_PASSWORD;
  if (!universal) {
    return NextResponse.json(
      { error: "Portal login is not configured." },
      { status: 503 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  // Constant-time compare. The password is one of TWO gates now — see the
  // club-family check below.
  if (!password || !passwordMatches(password, universal)) {
    return NextResponse.json(
      { error: "That password isn’t right." },
      { status: 401 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Server is not configured." },
      { status: 500 },
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── GATE TWO: is this a family of the club? ────────────────────────────
  //
  // The password is shared, so on its own it admits anyone who has ever been
  // told it. The portal holds an athlete's record and her family's balance, so
  // knowing a password cannot be the whole test. The address must appear
  // against an eligible athlete somewhere the club actually collects addresses.
  //
  // Deliberately wider than "on the roster": a family that has aged out but
  // still owes must be able to sign in and pay.
  //
  // The failure message is identical to the wrong-password one. Distinguishing
  // them would turn this endpoint into an oracle for who is on the team.
  const { data: isClubFamily, error: gateErr } = await admin.rpc(
    "is_club_family_email",
    { p_email: email },
  );

  if (gateErr) {
    console.error("[portal/login] club-family check failed:", gateErr);
    return NextResponse.json(
      { error: "We couldn’t sign you in. Please try again." },
      { status: 500 },
    );
  }

  if (!isClubFamily) {
    console.warn("[portal/login] rejected non-club address:", email);
    return NextResponse.json(
      { error: "That email and password don’t match." },
      { status: 401 },
    );
  }

  // Find the guardian by email (all stored emails are already lowercased,
  // so an equality match is a correct case-insensitive lookup).
  const { data: existing, error: lookupErr } = await admin
    .from("guardians")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (lookupErr) {
    console.error("[portal/login] guardian lookup failed:", lookupErr);
    return NextResponse.json(
      { error: "We couldn’t sign you in. Please try again." },
      { status: 500 },
    );
  }

  let guardianId = existing?.[0]?.id as string | undefined;

  // A club address we have seen on a roster form or a placement letter but that
  // has no guardian row yet — mint one. This can only be reached AFTER the
  // club-family gate, so a stranger's address never creates a record.
  if (!guardianId) {
    const { data: inserted, error: insertErr } = await admin
      .from("guardians")
      .insert({
        email,
        first_name: deriveFirstName(email),
        last_name: "",
      })
      .select("id")
      .single();

    if (insertErr) {
      // Lost a race with a concurrent login for the same new email — re-read.
      const { data: reread } = await admin
        .from("guardians")
        .select("id")
        .eq("email", email)
        .limit(1);
      guardianId = reread?.[0]?.id as string | undefined;
      if (!guardianId) {
        console.error("[portal/login] guardian shell insert failed:", insertErr);
        return NextResponse.json(
          { error: "We couldn’t set up your account. Please try again." },
          { status: 500 },
        );
      }
    } else {
      guardianId = inserted.id;
    }
  }

  if (!guardianId) {
    return NextResponse.json(
      { error: "We couldn’t set up your account. Please try again." },
      { status: 500 },
    );
  }

  // Is this guardian already linked to at least one player?
  const { data: links } = await admin
    .from("player_guardians")
    .select("player_id")
    .eq("guardian_id", guardianId)
    .limit(1);
  const linked = !!(links && links.length > 0);

  const token = signPortalToken({ email, guardianId });
  const response = NextResponse.json({ ok: true, linked });
  response.cookies.set(PORTAL_COOKIE_NAME, token, portalCookieOptions());
  return response;
}
