import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient, resendConfig } from "@/lib/placement/config";
import { resendPlacement } from "@/lib/placement/send";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/placements/resend  { athleteKey, mode, email? }
 *
 * One family, one email, sent again — usually because the first one went to the
 * wrong address. Elizabeth Woll's went to her own iCloud instead of her mother
 * Sarah's inbox, and until this route existed there was no way to fire it again.
 *
 * WHAT THE CLIENT MAY DECIDE: which athlete, which mode, and what the corrected
 * address is.
 * WHAT THE CLIENT MAY NOT DECIDE: whether she is allowed to be sent to. That is
 * re-derived from the database inside resendPlacement on every call — a family
 * who has confirmed cannot be asked again by a stale tab, and an athlete who
 * never received the original cannot be sent one from here at all.
 *
 * MODES:
 *   test — the whole email, delivered to the signed-in admin. The destination is
 *          taken from the session, never from the request.
 *   live — reaches the family, at the address named in the response.
 *
 * No typed approval phrase, deliberately. The group send asks for one because it
 * approves up to 72 families at once; this is one email to one family, and the
 * guards that matter here are the ones a phrase cannot provide — confirmed
 * state, prior send, and the cooldown. Friction that does not prevent the
 * failure only makes the tool go unused on the Tuesday morning it is needed.
 */

export async function POST(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const actor = user.email;

  let body: { athleteKey?: unknown; mode?: unknown; email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const athleteKey =
    typeof body.athleteKey === "string" ? body.athleteKey.trim() : "";
  if (!athleteKey) {
    return NextResponse.json({ error: "Missing athleteKey." }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "test" && mode !== "live") {
    return NextResponse.json({ error: "Unknown send mode." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;

  // A live resend with no mail configured would log a failure and tell the
  // operator nothing useful. Refuse up front, with the reason.
  const cfg = resendConfig();
  if (!cfg.ok) {
    return NextResponse.json(
      { error: `Email is not configured: ${cfg.reason}` },
      { status: 503 },
    );
  }

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }

  try {
    const result = await resendPlacement(db, {
      athleteKey,
      mode,
      email,
      testTo: mode === "test" ? actor : undefined,
      actor,
    });

    if (result.ok) return NextResponse.json(result);

    // The refusal reason chooses the status, so the browser can tell "she has
    // already confirmed" from "you clicked twice" without parsing prose.
    const status =
      result.refusalCode === "not_found"
        ? 404
        : result.refusalCode === "cooling_down"
          ? 429
          : result.refusalCode === "failed"
            ? 502
            : result.refusalCode === "blocked"
              ? 400
              : 409;

    return NextResponse.json({ ...result, error: result.refusal }, { status });
  } catch (err) {
    console.error("[placements] resend failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resend failed." },
      { status: 500 },
    );
  }
}
