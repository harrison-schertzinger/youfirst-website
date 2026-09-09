import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { CONTACT_FOR_MAX, NAME_MAX, NOTES_MAX } from "@/lib/ops-contacts";

export const dynamic = "force-dynamic";

const CONTACT_COLUMNS = "id, name, contact_for, notes, added_by, created_at";

function fail(status: number, error: string, field?: string): NextResponse {
  return NextResponse.json(field ? { error, field } : { error }, { status });
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(): Promise<string | null> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) return null;
  return user.email;
}

// ─── PATCH — edit a contact in place ─────────────────────────────────────────
// The seeded rows that read "Needs detail" are meant to be edited here — that
// is how Gary Potterbaum's line and the league app's name get filled in without
// a deploy.

interface PatchBody {
  name?: unknown;
  contact_for?: unknown;
  notes?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await requireAdmin())) return fail(403, "Not authorized.");
  const { id } = await context.params;

  let payload: PatchBody;
  try {
    payload = (await request.json()) as PatchBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const patch: Record<string, string | null> = {};

  if (payload.name !== undefined) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (name.length === 0) return fail(400, "A contact needs a name.", "name");
    if (name.length > NAME_MAX) {
      return fail(400, `Name must be ${NAME_MAX} characters or fewer.`, "name");
    }
    patch.name = name;
  }

  if (payload.contact_for !== undefined) {
    const cf =
      typeof payload.contact_for === "string" ? payload.contact_for.trim() : "";
    if (cf.length === 0) {
      return fail(400, "Say what they're the contact for.", "contact_for");
    }
    if (cf.length > CONTACT_FOR_MAX) {
      return fail(
        400,
        `That must be ${CONTACT_FOR_MAX} characters or fewer.`,
        "contact_for",
      );
    }
    patch.contact_for = cf;
  }

  if (payload.notes !== undefined) {
    const raw = typeof payload.notes === "string" ? payload.notes.trim() : "";
    if (raw.length > NOTES_MAX) {
      return fail(400, `Notes must be ${NOTES_MAX} characters or fewer.`, "notes");
    }
    patch.notes = raw.length === 0 ? null : raw;
  }

  if (Object.keys(patch).length === 0) return fail(400, "Nothing to update.");
  patch.updated_at = new Date().toISOString();

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("ops_contacts")
    .update(patch)
    .eq("id", id)
    .is("archived_at", null)
    .select(CONTACT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[admin/ops-contacts PATCH]", error);
    return fail(500, error.message);
  }
  if (!data) return fail(404, "That contact no longer exists.");

  return NextResponse.json({ success: true, contact: data });
}

// ─── DELETE — archive a contact ──────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await requireAdmin())) return fail(403, "Not authorized.");
  const { id } = await context.params;

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("ops_contacts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/ops-contacts DELETE]", error);
    return fail(500, error.message);
  }
  if (!data) return fail(404, "That contact no longer exists.");

  return NextResponse.json({ success: true });
}
