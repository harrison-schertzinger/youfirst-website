import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/rosters/data";
import { splitName } from "@/lib/command-sheet/data";

export const dynamic = "force-dynamic";

// Inline field edits — Harrison types missing emails, phones, positions and
// grad years straight into the roster rows as he collects them. One field per
// request, whitelisted per table. For returning players, parent contact lives
// on the primary guardian; with no guardian on file the players fallback
// columns take the value instead, so nothing typed is ever dropped.

const FIELDS = [
  "name",
  "position",
  "school",
  "parentName",
  "parentEmail",
  "parentPhone",
  "gradYear",
  "status",
] as const;
type Field = (typeof FIELDS)[number];

const POSITIONS = ["Attack", "Midfield", "Defense", "Goalie"];

interface Body {
  table?: string;
  id?: string;
  field?: string;
  value?: string | null;
}

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  const admin = getServiceClient();
  if (!admin) return fail(500, "Service-role env vars not configured.");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail(400, "Invalid JSON body.");
  }

  const { table, id } = body;
  if (table !== "players" && table !== "tryout_registrations") {
    return fail(400, "Unknown table.");
  }
  if (!id || typeof id !== "string") return fail(400, "Missing id.");
  if (!body.field || !(FIELDS as readonly string[]).includes(body.field)) {
    return fail(400, "Unknown field.");
  }
  const field = body.field as Field;
  const value = clean(typeof body.value === "string" ? body.value : null);

  if (value && value.length > 200) return fail(400, "Value is too long.");

  // ── Shared validations ──────────────────────────────────────────────────
  if (field === "position" && value && !POSITIONS.includes(value)) {
    return fail(400, `Position must be one of ${POSITIONS.join(", ")}.`);
  }
  let gradYear: number | null = null;
  if (field === "gradYear") {
    if (value != null) {
      gradYear = parseInt(value, 10);
      if (!Number.isInteger(gradYear) || gradYear < 2027 || gradYear > 2038) {
        return fail(400, "Graduation year must be between 2027 and 2038.");
      }
    }
  }

  if (table === "tryout_registrations") {
    if (field === "status") {
      return fail(400, "Registrations don't carry an active/inactive status.");
    }
    if (field === "name" && !value) return fail(400, "Name can't be empty.");
    const column: Record<Exclude<Field, "status">, string> = {
      name: "player_full_name",
      position: "position",
      school: "school",
      parentName: "parent_name",
      parentEmail: "email",
      parentPhone: "phone",
      gradYear: "graduation_year",
    };
    const update: Record<string, string | number | null> =
      field === "gradYear" ? { graduation_year: gradYear } : { [column[field]]: value };
    const { error } = await admin
      .from("tryout_registrations")
      .update(update)
      .eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);
    return NextResponse.json({ ok: true });
  }

  // ── players ─────────────────────────────────────────────────────────────
  if (field === "name") {
    if (!value) return fail(400, "Name can't be empty.");
    const { first, last } = splitName(value);
    const { error } = await admin
      .from("players")
      .update({ first_name: first || value, last_name: last || "—" })
      .eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);
    return NextResponse.json({ ok: true });
  }

  if (field === "position" || field === "school") {
    const { error } = await admin
      .from("players")
      .update({ [field]: value })
      .eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);
    return NextResponse.json({ ok: true });
  }

  if (field === "gradYear") {
    if (gradYear == null) return fail(400, "A rostered player needs a graduation year.");
    const { error } = await admin
      .from("players")
      .update({ graduation_year: gradYear })
      .eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);
    return NextResponse.json({ ok: true });
  }

  if (field === "status") {
    if (value !== "active" && value !== "inactive") {
      return fail(400, "Status must be active or inactive.");
    }
    const { error } = await admin.from("players").update({ status: value }).eq("id", id);
    if (error) return fail(500, `Save failed: ${error.message}`);
    return NextResponse.json({ ok: true });
  }

  // Parent contact — primary guardian first, players fallback columns second.
  const { data: links, error: linkErr } = await admin
    .from("player_guardians")
    .select("guardian_id, is_primary")
    .eq("player_id", id);
  if (linkErr) return fail(500, `Read failed: ${linkErr.message}`);
  const primary =
    (links ?? []).find((l) => l.is_primary) ?? (links ?? [])[0] ?? null;

  if (!primary) {
    if (field === "parentEmail") {
      const { error } = await admin
        .from("players")
        .update({ fallback_email: value })
        .eq("id", id);
      if (error) return fail(500, `Save failed: ${error.message}`);
      return NextResponse.json({ ok: true });
    }
    if (field === "parentPhone") {
      const { error } = await admin
        .from("players")
        .update({ unverified_phone: value })
        .eq("id", id);
      if (error) return fail(500, `Save failed: ${error.message}`);
      return NextResponse.json({ ok: true });
    }
    return fail(
      400,
      "No guardian on file — add the parent's email first and a guardian record can be created from it.",
    );
  }

  if (field === "parentEmail" && !value) {
    return fail(400, "A guardian's email can't be cleared — it's her family's login.");
  }

  const guardianUpdate: Record<string, string | null> = {};
  if (field === "parentEmail") guardianUpdate.email = value!.toLowerCase();
  if (field === "parentPhone") guardianUpdate.phone = value;
  if (field === "parentName") {
    if (!value) return fail(400, "Parent name can't be empty.");
    const { first, last } = splitName(value);
    guardianUpdate.first_name = first || value;
    guardianUpdate.last_name = last || "—";
  }

  const { error } = await admin
    .from("guardians")
    .update(guardianUpdate)
    .eq("id", primary.guardian_id);
  if (error) return fail(500, `Save failed: ${error.message}`);
  return NextResponse.json({ ok: true });
}
