import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * The balance-question queue. A notification email is not a queue — this is.
 * Newest first, with the balance snapshot taken at submission so an admin can
 * answer without opening anything else.
 */
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

  const { data, error } = await admin
    .from("balance_questions")
    .select(
      `id, message, guardian_email, charged_cents, paid_cents,
       adjustment_cents, remaining_cents, status, resolved_at, resolved_by,
       resolution_note, created_at, notify_status, notify_error,
       players ( id, first_name, last_name, graduation_year )`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/balance-questions GET]", error);
    return NextResponse.json(
      { error: "Failed to load questions." },
      { status: 500 },
    );
  }

  return NextResponse.json({ questions: data ?? [] });
}
