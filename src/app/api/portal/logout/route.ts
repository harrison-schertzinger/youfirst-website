import { NextResponse } from "next/server";
import { PORTAL_COOKIE_NAME, portalCookieOptions } from "@/lib/portal-session";

export const dynamic = "force-dynamic";

/** Clear the portal session cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE_NAME, "", portalCookieOptions(0));
  return response;
}
