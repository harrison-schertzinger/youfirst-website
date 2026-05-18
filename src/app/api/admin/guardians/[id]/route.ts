import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface PatchBody {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
  relationship?: unknown;
}

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(
    field ? { error, field } : { error },
    { status },
  );
}

/** Accept string | null only. Empty / whitespace string becomes null.
 *  Returns `undefined` to flag "wrong type, reject the request". */
function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return fail(400, "Missing guardian id.");
  }

  // ── Auth: anon-key server client only for the gate ─────────────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  // Build updates one field at a time; bail on any non-string surprise.
  const updates: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    phone?: string | null;
    relationship?: string | null;
  } = {};

  if ("first_name" in body) {
    const v = asNullableString(body.first_name);
    if (v === undefined) return fail(400, "first_name must be a string or null.", "first_name");
    // guardians.first_name is NOT NULL — coerce null back to "" rather than fail.
    updates.first_name = v ?? "";
  }
  if ("last_name" in body) {
    const v = asNullableString(body.last_name);
    if (v === undefined) return fail(400, "last_name must be a string or null.", "last_name");
    updates.last_name = v ?? "";
  }
  if ("email" in body) {
    const v = asNullableString(body.email);
    if (v === undefined || v === null) {
      return fail(400, "email is required and must be a string.", "email");
    }
    const normalized = v.toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      return fail(400, "email is not a valid address.", "email");
    }
    updates.email = normalized;
  }
  if ("phone" in body) {
    const v = asNullableString(body.phone);
    if (v === undefined) return fail(400, "phone must be a string or null.", "phone");
    updates.phone = v;
  }
  if ("relationship" in body) {
    const v = asNullableString(body.relationship);
    if (v === undefined) return fail(400, "relationship must be a string or null.", "relationship");
    updates.relationship = v;
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

  // ── Service-role client for the write ──────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // If the admin is changing the email and the guardian had an
  // auth_user_id linked, the parent will need to re-claim the row at
  // the new address. Surface this as a flag, not an error — admin
  // override is intentional.
  let auth_relink_needed = false;
  if (updates.email !== undefined) {
    const { data: existing } = await admin
      .from("guardians")
      .select("auth_user_id, email")
      .eq("id", id)
      .maybeSingle();
    if (existing?.auth_user_id && existing.email !== updates.email) {
      auth_relink_needed = true;
    }
  }

  const { data: updated, error: updateError } = await admin
    .from("guardians")
    .update(updates)
    .eq("id", id)
    .select("id, first_name, last_name, email, phone, relationship, auth_user_id")
    .maybeSingle();

  if (updateError) {
    console.error("[admin/guardians PATCH] update failed:", updateError);
    return fail(500, updateError.message ?? "Update failed.");
  }
  if (!updated) {
    return fail(404, "Guardian not found.");
  }

  return NextResponse.json({
    success: true,
    guardian: updated,
    auth_relink_needed,
  });
}
