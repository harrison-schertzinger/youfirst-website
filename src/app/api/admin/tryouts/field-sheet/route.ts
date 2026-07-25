import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { buildFieldSheetHtml, type FieldSheetAthlete } from "@/lib/tryouts/fieldSheet";

export const dynamic = "force-dynamic";

// ─── GET — download the offline field sheet ───────────────────────────────────
// One self-contained HTML file with the live roster embedded. The filename and
// the visible stamp inside the file carry the generation time so Harrison can
// tell today's sheet from yesterday's in a Downloads folder full of them.

export async function GET(): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Real registrants only — the 9 recruiting-pipeline rows in this table have
  // no grad year or contact info and never registered for a tryout.
  const { data, error } = await admin
    .from("tryout_registrations")
    .select("id, player_full_name, graduation_year, position")
    .eq("source", "tryout")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/tryouts/field-sheet GET]", error);
    return NextResponse.json({ error: "Failed to load the roster." }, { status: 500 });
  }

  const athletes: FieldSheetAthlete[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.player_full_name as string,
    gradYear: (r.graduation_year as number | null) ?? null,
    position: (r.position as string | null) ?? null,
  }));

  const now = new Date();
  const generatedAtIso = now.toISOString();
  const label =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(now) + " ET";

  const etDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);
  const etTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(":", "");
  const filename = `yf-field-sheet-${etDate}-${etTime}.html`;

  const html = buildFieldSheetHtml(athletes, generatedAtIso, label);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
