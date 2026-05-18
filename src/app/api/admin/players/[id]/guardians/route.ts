import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface PostBody {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
  relationship?: unknown;
  is_primary?: unknown;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: player_id } = await context.params;
  if (!player_id || typeof player_id !== "string") {
    return fail(400, "Missing player id.");
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  // ── Parse + validate body ──────────────────────────────────────────────
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const first_name = asTrimmedString(body.first_name);
  if (!first_name) return fail(400, "first_name is required.", "first_name");

  const last_name = asTrimmedString(body.last_name);
  if (!last_name) return fail(400, "last_name is required.", "last_name");

  const rawEmail = asTrimmedString(body.email);
  if (!rawEmail) return fail(400, "email is required.", "email");
  const email = rawEmail.toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return fail(400, "email is not a valid address.", "email");
  }

  const phone =
    body.phone === undefined || body.phone === null
      ? null
      : typeof body.phone === "string"
        ? (asTrimmedString(body.phone) ?? null)
        : "__bad__";
  if (phone === "__bad__") return fail(400, "phone must be a string or null.", "phone");

  const relationship =
    body.relationship === undefined || body.relationship === null
      ? null
      : typeof body.relationship === "string"
        ? (asTrimmedString(body.relationship) ?? null)
        : "__bad__";
  if (relationship === "__bad__") {
    return fail(400, "relationship must be a string or null.", "relationship");
  }

  // is_primary is optional; default false. Accept boolean only.
  let is_primary = false;
  if (body.is_primary !== undefined) {
    if (typeof body.is_primary !== "boolean") {
      return fail(400, "is_primary must be a boolean.", "is_primary");
    }
    is_primary = body.is_primary;
  }

  // ── Service-role client ────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the player exists before we touch anything.
  const { data: player, error: playerErr } = await admin
    .from("players")
    .select("id")
    .eq("id", player_id)
    .maybeSingle();
  if (playerErr) {
    console.error("[admin/players/.../guardians POST] player lookup failed:", playerErr);
    return fail(500, "Player lookup failed.");
  }
  if (!player) return fail(404, "Player not found.");

  // ── Find-or-create guardian by email ───────────────────────────────────
  const { data: existingGuardian, error: lookupError } = await admin
    .from("guardians")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("[admin/players/.../guardians POST] guardian lookup failed:", lookupError);
    return fail(500, "Guardian lookup failed.");
  }

  let guardian_id: string;
  let guardian_existed = false;
  if (existingGuardian) {
    guardian_id = existingGuardian.id;
    guardian_existed = true;
  } else {
    const { data: newGuardian, error: guardianError } = await admin
      .from("guardians")
      .insert({
        first_name,
        last_name,
        email,
        phone,
        relationship: relationship ?? "parent",
      })
      .select("id")
      .single();

    if (guardianError) {
      // 23505 race: concurrent insert won; re-fetch.
      const code = (guardianError as { code?: string }).code;
      if (code === "23505") {
        const { data: race } = await admin
          .from("guardians")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!race) {
          console.error("[admin/players/.../guardians POST] race re-fetch empty:", guardianError);
          return fail(500, "Failed to create guardian.");
        }
        guardian_id = race.id;
        guardian_existed = true;
      } else {
        console.error("[admin/players/.../guardians POST] insert failed:", guardianError);
        return fail(500, guardianError.message ?? "Failed to create guardian.");
      }
    } else if (!newGuardian) {
      return fail(500, "Failed to create guardian.");
    } else {
      guardian_id = newGuardian.id;
    }
  }

  // ── Demote other primaries BEFORE writing the new link ─────────────────
  // Two-write sequence; if the second write fails the demotion stands but
  // the player has no primary. The DELETE route's re-election logic and
  // the UI re-render together make this recoverable; full atomicity would
  // require an RPC and is on the Sprint 5 backlog.
  if (is_primary) {
    const { error: demoteErr } = await admin
      .from("player_guardians")
      .update({ is_primary: false })
      .eq("player_id", player_id)
      .neq("guardian_id", guardian_id);
    if (demoteErr) {
      console.error("[admin/players/.../guardians POST] demote failed:", demoteErr);
      // Continue — leaving the existing primary alone is preferable to
      // a partially-completed state.
    }
  }

  // ── Insert or update the player_guardians row ──────────────────────────
  const { data: existingLink } = await admin
    .from("player_guardians")
    .select("player_id, guardian_id, is_primary")
    .eq("player_id", player_id)
    .eq("guardian_id", guardian_id)
    .maybeSingle();

  let link_updated = false;
  if (existingLink) {
    // Already linked. If the request asked to flip is_primary, do it; else
    // it's effectively a no-op the UI can treat as "promoted to primary".
    const { error: updateLinkErr } = await admin
      .from("player_guardians")
      .update({ is_primary })
      .eq("player_id", player_id)
      .eq("guardian_id", guardian_id);
    if (updateLinkErr) {
      console.error("[admin/players/.../guardians POST] link update failed:", updateLinkErr);
      return fail(500, updateLinkErr.message ?? "Failed to update guardian link.");
    }
    link_updated = true;
  } else {
    const { error: linkErr } = await admin
      .from("player_guardians")
      .insert({ player_id, guardian_id, is_primary });
    if (linkErr) {
      console.error("[admin/players/.../guardians POST] link insert failed:", linkErr);
      return fail(500, linkErr.message ?? "Failed to link guardian.");
    }
  }

  return NextResponse.json({
    success: true,
    guardian_id,
    guardian_existed,
    is_primary,
    link_updated,
  });
}
