import { NextRequest } from "next/server";
import { getFeedByToken, getEvents, buildIcs } from "@/lib/events";

/**
 * The calendar subscription feed.
 *
 *   GET /api/calendar/<token>.ics
 *
 * Reachable WITHOUT a login, by design: calendar clients (iOS, Google, Outlook)
 * cannot authenticate against our session cookie. The unguessable token is the
 * credential — 18 random bytes, minted per feed, revocable by flipping
 * calendar_feeds.active to false.
 *
 * A parent subscribes once. From then on their calendar re-fetches this route
 * on its own schedule, and every edit the club makes propagates to their phone
 * with no email and no action from them.
 *
 * Never cached at the edge: a cached feed is a stale feed, and the entire point
 * is that a rained-out practice moves within the hour.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;

  // Clients append .ics; the stored token does not include it.
  const token = rawToken.replace(/\.ics$/i, "");

  if (!token || token.length < 16) {
    return new Response("Not found", { status: 404 });
  }

  let feed;
  try {
    feed = await getFeedByToken(token);
  } catch (err) {
    console.error("[calendar] feed lookup failed:", err);
    return new Response("Calendar temporarily unavailable", { status: 503 });
  }

  if (!feed) {
    return new Response("Not found", { status: 404 });
  }

  let events;
  try {
    events = await getEvents({ teamSlug: feed.teamSlug });
  } catch (err) {
    console.error("[calendar] event fetch failed:", err);
    return new Response("Calendar temporarily unavailable", { status: 503 });
  }

  const ics = buildIcs(events, feed.label);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${feed.teamSlug ?? "youfirst"}-schedule.ics"`,
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
