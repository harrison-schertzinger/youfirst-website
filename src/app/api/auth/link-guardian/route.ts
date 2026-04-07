import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * Links the authenticated user's auth_user_id onto the guardian record
 * whose email matches their authenticated email. Server-side email match
 * is the only trust boundary — the client cannot specify which guardian
 * to claim. Idempotent: won't overwrite an existing auth_user_id link.
 */
export async function POST(request: NextRequest) {
  // Read the authenticated user from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op — this route doesn't refresh cookies
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userEmail = user.email.trim().toLowerCase();

  // Service-role admin client for the lookup + update
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up guardian by email — server-side, never trust the client
  const { data: guardian, error: lookupError } = await admin
    .from("guardians")
    .select("id, auth_user_id")
    .eq("email", userEmail)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (!guardian) {
    return NextResponse.json(
      { error: "No guardian record found for this email." },
      { status: 404 }
    );
  }

  // Already linked to this user — nothing to do
  if (guardian.auth_user_id === user.id) {
    return NextResponse.json({ ok: true, alreadyLinked: true });
  }

  // Already linked to a different user — refuse to overwrite
  if (guardian.auth_user_id && guardian.auth_user_id !== user.id) {
    return NextResponse.json(
      { error: "Guardian record is linked to another account." },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("guardians")
    .update({ auth_user_id: user.id })
    .eq("id", guardian.id)
    .is("auth_user_id", null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
