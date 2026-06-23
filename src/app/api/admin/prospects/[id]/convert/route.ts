import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type PlanType = "lump_sum" | "monthly" | "quarterly";

const INSTALLMENTS_BY_PLAN: Record<PlanType, number> = {
  lump_sum: 1,
  monthly: 2,
  quarterly: 4,
};

interface PostBody {
  plan_type?: unknown;
  total_amount_cents?: unknown;
  season?: unknown;
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) return fail(400, "Missing prospect id.");

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

  const planTypeRaw = asTrimmedString(body.plan_type);
  if (
    planTypeRaw !== "lump_sum" &&
    planTypeRaw !== "monthly" &&
    planTypeRaw !== "quarterly"
  ) {
    return fail(400, "plan_type is required.", "plan_type");
  }
  const plan_type: PlanType = planTypeRaw;

  const total_amount_cents = Number(body.total_amount_cents);
  if (
    !Number.isFinite(total_amount_cents) ||
    !Number.isInteger(total_amount_cents) ||
    total_amount_cents < 0
  ) {
    return fail(
      400,
      "total_amount_cents must be a non-negative integer.",
      "total_amount_cents",
    );
  }
  if (total_amount_cents > 10_000_000) {
    return fail(
      400,
      "total_amount_cents cannot exceed $100,000.",
      "total_amount_cents",
    );
  }

  const season = asTrimmedString(body.season);
  if (!season) return fail(400, "season is required.", "season");

  // ── Service-role client ────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Read prospect ───────────────────────────────────────────────────
  const { data: prospect, error: prospectErr } = await admin
    .from("prospects")
    .select(
      "id, first_name, last_name, graduation_year, position, school, parent_first_name, parent_last_name, parent_email, parent_phone, stage, converted_player_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (prospectErr) {
    console.error("[prospects/convert] read", prospectErr);
    return fail(500, "Prospect lookup failed.");
  }
  if (!prospect) return fail(404, "Prospect not found.");
  if (prospect.stage === "converted") {
    return fail(400, "Prospect is already converted.");
  }
  if (!prospect.parent_email) {
    return fail(
      400,
      "Prospect has no parent email — add one before converting.",
      "parent_email",
    );
  }
  if (!prospect.parent_first_name || !prospect.parent_last_name) {
    return fail(
      400,
      "Parent first and last name required before converting.",
      "parent_name",
    );
  }

  const parent_email = prospect.parent_email.toLowerCase();

  // ── 2. Find-or-create guardian (matches /api/admin/players POST) ───────
  const { data: existingGuardian, error: gLookupErr } = await admin
    .from("guardians")
    .select("id, email")
    .eq("email", parent_email)
    .maybeSingle();
  if (gLookupErr) {
    console.error("[prospects/convert] guardian lookup", gLookupErr);
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
        first_name: prospect.parent_first_name,
        last_name: prospect.parent_last_name,
        email: parent_email,
        phone: prospect.parent_phone,
        relationship: "parent",
      })
      .select("id")
      .single();

    if (guardianError) {
      const code = (guardianError as { code?: string }).code;
      if (code === "23505") {
        const { data: race } = await admin
          .from("guardians")
          .select("id")
          .eq("email", parent_email)
          .maybeSingle();
        if (!race) {
          console.error("[prospects/convert] guardian race re-fetch empty");
          return fail(500, "Failed to create guardian.");
        }
        guardian_id = race.id;
        guardian_existed = true;
      } else {
        console.error("[prospects/convert] guardian insert", guardianError);
        return fail(
          500,
          guardianError.message ?? "Failed to create guardian.",
        );
      }
    } else if (!newGuardian) {
      return fail(500, "Failed to create guardian.");
    } else {
      guardian_id = newGuardian.id;
    }
  }

  // ── 3. Insert player ───────────────────────────────────────────────────
  const { data: player, error: playerErr } = await admin
    .from("players")
    .insert({
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      graduation_year: prospect.graduation_year,
      position: prospect.position,
      school: prospect.school,
      team_name: "You. First Elite",
      status: "active",
    })
    .select("id")
    .single();

  if (playerErr || !player) {
    console.error("[prospects/convert] player insert", playerErr);
    return fail(500, playerErr?.message ?? "Failed to create player.");
  }
  const player_id = player.id;

  // ── 4. Link player ↔ guardian (primary) ────────────────────────────────
  const { error: linkErr } = await admin
    .from("player_guardians")
    .insert({ player_id, guardian_id, is_primary: true });
  if (linkErr) {
    console.error("[prospects/convert] player_guardians", linkErr);
    return fail(500, linkErr.message ?? "Failed to link guardian.");
  }

  // ── 5. Payment plan ────────────────────────────────────────────────────
  const installments_total = INSTALLMENTS_BY_PLAN[plan_type];
  const { error: planErr } = await admin.from("payment_plans").insert({
    player_id,
    season,
    plan_type,
    total_amount_cents,
    amount_paid_cents: 0,
    installments_total,
    installments_paid: 0,
    next_due_date: null,
  });
  if (planErr) {
    console.error("[prospects/convert] payment_plans", planErr);
    return fail(500, planErr.message ?? "Failed to create payment plan.");
  }

  // ── 6. Stamp prospect as converted ─────────────────────────────────────
  const { error: prospectUpdateErr } = await admin
    .from("prospects")
    .update({
      stage: "converted",
      converted_player_id: player_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (prospectUpdateErr) {
    console.error("[prospects/convert] prospect update", prospectUpdateErr);
    // Player + plan are already written. Don't roll back — log and continue
    // so the caller can finish; admin can patch the prospect manually.
  }

  // ── 7. Invite (non-fatal) ──────────────────────────────────────────────
  let invite_sent = false;
  try {
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      parent_email,
      { redirectTo: `${request.nextUrl.origin}/fees` },
    );
    if (inviteErr) {
      console.error("[prospects/convert] invite failed:", inviteErr);
    } else {
      invite_sent = true;
    }
  } catch (err) {
    console.error("[prospects/convert] invite threw:", err);
  }

  return NextResponse.json({
    success: true,
    player_id,
    guardian_id,
    guardian_existed,
    invite_sent,
  });
}
