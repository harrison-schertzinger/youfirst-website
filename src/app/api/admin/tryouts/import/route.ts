import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import {
  computeImportPlan,
  parseFieldResults,
  type DbTryoutRow,
  type ImportPlan,
} from "@/lib/tryouts/fieldResults";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PostBody {
  payload?: unknown;
  confirm?: unknown;
}

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

const IMPORT_COLUMNS =
  "id, player_full_name, graduation_year, checked_in_at, field_notes, field_sheet_uid";

// ─── POST — preview (default) or commit (confirm: true) a field-sheet export ─
// The commit path recomputes the plan server-side from the raw payload — the
// preview the client displayed is never trusted or replayed. Both paths are
// idempotent: importing the same file twice changes nothing the second time.

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  const parsed = parseFieldResults(body.payload);
  if (!parsed.ok) return fail(400, parsed.error);
  const results = parsed.results;
  const confirm = body.confirm === true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await admin
    .from("tryout_registrations")
    .select(IMPORT_COLUMNS)
    .eq("source", "tryout");

  if (error) {
    // 42703 = undefined column — the check-in migration hasn't been applied.
    if (error.code === "42703") {
      return NextResponse.json(
        {
          migrationRequired: true,
          error:
            "The tryout check-in migration has not been applied to the database yet. " +
            "Nothing was imported — apply the migration, then run this import again.",
        },
        { status: 409 },
      );
    }
    console.error("[admin/tryouts/import POST] load", error);
    return fail(500, "Failed to load current registrations.");
  }

  const plan: ImportPlan = computeImportPlan(results, (rows ?? []) as DbTryoutRow[]);

  if (!confirm) {
    return NextResponse.json({ ok: true, plan });
  }

  // ── commit ──────────────────────────────────────────────────────────────
  const errors: string[] = [];
  let updated = 0;
  let created = 0;
  let merged = 0;

  for (const item of plan.registrants) {
    if (item.action !== "update") continue;
    const { error: upErr } = await admin
      .from("tryout_registrations")
      .update(item.set)
      .eq("id", item.id);
    if (upErr) {
      console.error("[admin/tryouts/import POST] update", item.id, upErr);
      errors.push(`${item.name}: update failed.`);
    } else {
      updated++;
    }
  }

  for (const item of plan.walkUps) {
    if (item.action === "merge" && item.mergeTargetId && item.set) {
      const { error: mergeErr } = await admin
        .from("tryout_registrations")
        .update(item.set)
        .eq("id", item.mergeTargetId);
      if (mergeErr) {
        console.error("[admin/tryouts/import POST] merge", item.uid, mergeErr);
        errors.push(`${item.name}: merge failed.`);
      } else {
        merged++;
      }
      continue;
    }
    if (item.action === "create" && item.insert) {
      const { error: insErr } = await admin
        .from("tryout_registrations")
        .insert(item.insert);
      if (insErr) {
        // 23505 = unique violation on field_sheet_uid — a concurrent import of
        // the same file already created her. That is the idempotency guard
        // doing its job, not a failure.
        if (insErr.code === "23505") continue;
        console.error("[admin/tryouts/import POST] insert", item.uid, insErr);
        errors.push(`${item.name}: create failed.`);
      } else {
        created++;
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    applied: { updated, created, merged },
    errors,
    plan,
  });
}
