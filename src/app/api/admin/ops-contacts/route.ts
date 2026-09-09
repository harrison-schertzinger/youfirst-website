import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { CONTACT_FOR_MAX, NAME_MAX, NOTES_MAX } from "@/lib/ops-contacts";

export const dynamic = "force-dynamic";

/**
 * Luke's operations contact book.
 *
 * NOT club_contacts. That table is the club's PUBLISHED front desk — who a
 * family emails — and everything in it renders on the parent portal. This one
 * is internal: a tournament director's friend, a uniform rep, a league contact.
 * The two must never be merged, because the merge would put a vendor rep one
 * boolean away from every parent in the club.
 */

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

export async function GET(): Promise<NextResponse> {
  if (!(await requireAdmin())) return fail(403, "Not authorized.");

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("ops_contacts")
    .select(CONTACT_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/ops-contacts GET]", error);
    return fail(500, "Failed to load contacts.");
  }
  return NextResponse.json({ contacts: data ?? [] });
}

interface PostBody {
  name?: unknown;
  contact_for?: unknown;
  notes?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const email = await requireAdmin();
  if (!email) return fail(403, "Not authorized.");

  let payload: PostBody;
  try {
    payload = (await request.json()) as PostBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length === 0) return fail(400, "A contact needs a name.", "name");
  if (name.length > NAME_MAX) {
    return fail(400, `Name must be ${NAME_MAX} characters or fewer.`, "name");
  }

  const contactFor =
    typeof payload.contact_for === "string" ? payload.contact_for.trim() : "";
  if (contactFor.length === 0) {
    return fail(400, "Say what they're the contact for.", "contact_for");
  }
  if (contactFor.length > CONTACT_FOR_MAX) {
    return fail(
      400,
      `That must be ${CONTACT_FOR_MAX} characters or fewer.`,
      "contact_for",
    );
  }

  const rawNotes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  if (rawNotes.length > NOTES_MAX) {
    return fail(400, `Notes must be ${NOTES_MAX} characters or fewer.`, "notes");
  }

  const admin = getAdmin();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  const { data, error } = await admin
    .from("ops_contacts")
    .insert({
      name,
      contact_for: contactFor,
      notes: rawNotes.length === 0 ? null : rawNotes,
      added_by: email,
    })
    .select(CONTACT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[admin/ops-contacts POST]", error);
    return fail(500, error?.message ?? "Failed to add the contact.");
  }
  return NextResponse.json({ success: true, contact: data });
}
