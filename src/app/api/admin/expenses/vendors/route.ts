import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

interface VendorAgg {
  name: string;
  last_used: string;
  usage_count: number;
}

interface ExpenseLite {
  vendor: string | null;
  created_at: string | null;
}

/**
 * GET /api/admin/expenses/vendors
 *
 * Returns the 50 most-recently-used vendors with usage count.
 * Used by the ExpenseForm vendor input's <datalist> for autocomplete.
 *
 * Aggregation runs in JS (no Postgres GROUP BY via the JS SDK). The
 * `expenses` table is small enough that pulling vendor+created_at and
 * bucketing here is cheap.
 */
export async function GET(): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pull only the two columns needed and filter out blanks in JS so the
  // server query stays simple. The DB has fewer than ~10k expense rows
  // for the foreseeable future; aggregation in JS is fine.
  const { data, error } = await admin
    .from("expenses")
    .select("vendor, created_at")
    .eq("status", "active")
    .not("vendor", "is", null);

  if (error) {
    console.error("[admin/expenses/vendors]", error);
    return fail(500, "Failed to load vendors.");
  }

  const buckets = new Map<string, VendorAgg>();
  for (const row of (data ?? []) as ExpenseLite[]) {
    const name = (row.vendor ?? "").trim();
    if (!name) continue;
    const createdAt = row.created_at ?? "";
    const prev = buckets.get(name);
    if (!prev) {
      buckets.set(name, { name, last_used: createdAt, usage_count: 1 });
    } else {
      prev.usage_count += 1;
      if (createdAt > prev.last_used) prev.last_used = createdAt;
    }
  }

  const vendors = [...buckets.values()]
    .sort((a, b) => b.last_used.localeCompare(a.last_used))
    .slice(0, 50);

  return NextResponse.json({ vendors });
}
