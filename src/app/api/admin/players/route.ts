import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type PlanType = "lump_sum" | "monthly" | "quarterly";

// The enum names are inverted from natural meaning — this table is the
// canonical mapping, do not infer from the name.
const INSTALLMENTS_BY_PLAN: Record<PlanType, number> = {
  lump_sum: 1,
  monthly: 2,
  quarterly: 4,
};

interface CreatePlayerBody {
  first_name?: unknown;
  last_name?: unknown;
  graduation_year?: unknown;
  position?: unknown;
  jersey_number?: unknown;
  school?: unknown;
  guardian_first_name?: unknown;
  guardian_last_name?: unknown;
  guardian_email?: unknown;
  guardian_phone?: unknown;
  plan_type?: unknown;
  total_amount_cents?: unknown;
  season?: unknown;
  notes?: unknown;
}

function fail(
  status: number,
  error: string,
  field?: string,
): NextResponse {
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

export async function POST(request: NextRequest) {
  // ── Auth: read the session via the anon-key server client ───────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  // ── Parse + validate body ───────────────────────────────────────────────
  let body: CreatePlayerBody;
  try {
    body = (await request.json()) as CreatePlayerBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const first_name = asTrimmedString(body.first_name);
  if (!first_name) return fail(400, "First name is required.", "first_name");

  const last_name = asTrimmedString(body.last_name);
  if (!last_name) return fail(400, "Last name is required.", "last_name");

  const graduation_year = Number(body.graduation_year);
  if (!Number.isFinite(graduation_year) || !Number.isInteger(graduation_year)) {
    return fail(400, "Graduation year is required.", "graduation_year");
  }
  if (graduation_year < 2024 || graduation_year > 2035) {
    return fail(400, "Invalid graduation year", "graduation_year");
  }

  const position = asTrimmedString(body.position);
  // jersey_number is TEXT in Supabase — never coerce to int.
  const jersey_number = asTrimmedString(body.jersey_number);
  const school = asTrimmedString(body.school);

  const guardian_first_name = asTrimmedString(body.guardian_first_name);
  if (!guardian_first_name) {
    return fail(400, "Guardian first name is required.", "guardian_first_name");
  }

  const guardian_last_name = asTrimmedString(body.guardian_last_name);
  if (!guardian_last_name) {
    return fail(400, "Guardian last name is required.", "guardian_last_name");
  }

  const rawEmail = asTrimmedString(body.guardian_email);
  if (!rawEmail) {
    return fail(400, "Guardian email is required.", "guardian_email");
  }
  const guardian_email = rawEmail.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian_email)) {
    return fail(400, "Guardian email is not valid.", "guardian_email");
  }

  const guardian_phone = asTrimmedString(body.guardian_phone);

  const planTypeRaw = asTrimmedString(body.plan_type);
  if (
    planTypeRaw !== "lump_sum" &&
    planTypeRaw !== "monthly" &&
    planTypeRaw !== "quarterly"
  ) {
    return fail(400, "Plan type is required.", "plan_type");
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
      "Total amount is required (in cents).",
      "total_amount_cents",
    );
  }
  // Sanity cap: anything over $100k is almost certainly a typo and
  // protects against int8 overflow / accidental scientific-notation input.
  if (total_amount_cents > 10_000_000) {
    return fail(
      400,
      "Total amount cannot exceed $100,000.",
      "total_amount_cents",
    );
  }

  const season = asTrimmedString(body.season);
  if (!season) return fail(400, "Season is required.", "season");

  // Notes: payment_plans has no notes/description column in the live schema,
  // so we discard the value rather than run a migration. Surfaced in the
  // response as `notes_discarded` so the form can warn the admin.
  const notes = asTrimmedString(body.notes);
  const notesDiscarded = notes !== null;

  // ── Service-role client for all writes ──────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return fail(500, "Service-role env vars not configured.");
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Find-or-create guardian FIRST (no orphan-player on guardian fail).
  const { data: existingGuardian, error: lookupError } = await admin
    .from("guardians")
    .select("id, email")
    .eq("email", guardian_email)
    .maybeSingle();

  if (lookupError) {
    console.error("[admin/players] guardian lookup failed:", lookupError);
    return fail(500, "Guardian lookup failed.");
  }

  let guardian_id: string;
  // True when the guardian row was already on file (either found directly,
  // or discovered via the 23505 race-retry path). The form uses this to
  // warn the admin that their typed name/phone were NOT applied.
  let guardian_existed = false;
  if (existingGuardian) {
    guardian_id = existingGuardian.id;
    guardian_existed = true;
  } else {
    const { data: newGuardian, error: guardianError } = await admin
      .from("guardians")
      .insert({
        first_name: guardian_first_name,
        last_name: guardian_last_name,
        email: guardian_email,
        phone: guardian_phone,
        relationship: "parent",
      })
      .select("id")
      .single();

    if (guardianError) {
      // 23505 = unique_violation. Concurrent POST won the race between our
      // lookup and our insert. Re-fetch and use that row.
      const code = (guardianError as { code?: string }).code;
      if (code === "23505") {
        const { data: raceGuardian } = await admin
          .from("guardians")
          .select("id")
          .eq("email", guardian_email)
          .maybeSingle();
        if (!raceGuardian) {
          console.error(
            "[admin/players] guardian unique-violation but re-fetch empty:",
            guardianError,
          );
          return fail(500, "Failed to create guardian.");
        }
        guardian_id = raceGuardian.id;
        guardian_existed = true;
      } else {
        console.error(
          "[admin/players] guardian insert failed:",
          guardianError,
        );
        return fail(500, guardianError.message ?? "Failed to create guardian.");
      }
    } else if (!newGuardian) {
      return fail(500, "Failed to create guardian.");
    } else {
      guardian_id = newGuardian.id;
    }
  }

  // ── 2. Insert player (guardian known to exist; no orphan risk here). ────
  const { data: player, error: playerError } = await admin
    .from("players")
    .insert({
      first_name,
      last_name,
      graduation_year,
      position,
      jersey_number,
      school,
      team_name: "You. First Elite",
      status: "active",
    })
    .select("id")
    .single();

  if (playerError || !player) {
    console.error("[admin/players] player insert failed:", playerError);
    return fail(500, playerError?.message ?? "Failed to create player.");
  }
  const player_id = player.id;

  // ── 3. Link player ↔ guardian as primary ────────────────────────────────
  const { error: linkError } = await admin
    .from("player_guardians")
    .insert({
      player_id,
      guardian_id,
      is_primary: true,
    });

  if (linkError) {
    console.error("[admin/players] player_guardians insert failed:", linkError);
    return fail(500, linkError.message ?? "Failed to link guardian to player.");
  }

  // ── 4. Insert payment plan ──────────────────────────────────────────────
  const installments_total = INSTALLMENTS_BY_PLAN[plan_type];

  const { error: planError } = await admin.from("payment_plans").insert({
    player_id,
    season,
    plan_type,
    total_amount_cents,
    amount_paid_cents: 0,
    installments_total,
    installments_paid: 0,
    next_due_date: null,
  });

  if (planError) {
    console.error("[admin/players] payment_plans insert failed:", planError);
    return fail(500, planError.message ?? "Failed to create payment plan.");
  }

  // ── 5. Send invite (non-fatal) ──────────────────────────────────────────
  // Magic-link lands at the parent portal's /api/auth/callback — same flow
  // the existing seed parents use, and the same flow the public /register
  // route triggers. The admin lives at /api/admin/auth/callback; that's a
  // separate URL, used only by Harrison and Kathleen when they sign in.
  let invite_sent = false;
  try {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      guardian_email,
      { redirectTo: `${request.nextUrl.origin}/fees` },
    );
    if (inviteError) {
      console.error(
        "[admin/players] invite failed (player created OK):",
        inviteError,
      );
    } else {
      invite_sent = true;
    }
  } catch (err) {
    console.error(
      "[admin/players] invite threw (player created OK):",
      err,
    );
  }

  return NextResponse.json({
    success: true,
    player_id,
    guardian_id,
    invite_sent,
    guardian_existed,
    notes_discarded: notesDiscarded,
  });
}
