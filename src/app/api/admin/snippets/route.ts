import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface PatchBody {
  key?: unknown;
  content?: unknown;
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

  const { data, error } = await admin
    .from("email_snippets")
    .select("id, key, label, content, updated_at, created_at")
    .order("label", { ascending: true });
  if (error) {
    console.error("[admin/snippets GET]", error);
    return fail(500, "Failed to load snippets.");
  }
  return NextResponse.json({ snippets: data ?? [] });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return fail(403, "Not authorized.");
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return fail(400, "Invalid JSON.");
  }

  // key identifies the row; content is the replacement text. Both required —
  // there's no "blank out the snippet" workflow yet, so an empty content
  // value is treated as a typo.
  const snippetKey = asTrimmedString(body.key);
  if (!snippetKey) return fail(400, "key is required.", "key");

  if (typeof body.content !== "string") {
    return fail(400, "content must be a string.", "content");
  }
  // Preserve the user's whitespace exactly — multi-line snippets rely on
  // line breaks. Only reject if the string is literally empty.
  if (body.content.length === 0) {
    return fail(400, "content cannot be empty.", "content");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: updated, error } = await admin
    .from("email_snippets")
    .update({
      content: body.content,
      updated_at: new Date().toISOString(),
    })
    .eq("key", snippetKey)
    .select("id, key, label, content, updated_at, created_at")
    .maybeSingle();

  if (error) {
    console.error("[admin/snippets PATCH]", error);
    return fail(500, error.message ?? "Update failed.");
  }
  if (!updated) return fail(404, `Snippet "${snippetKey}" not found.`);

  return NextResponse.json({ success: true, snippet: updated });
}
