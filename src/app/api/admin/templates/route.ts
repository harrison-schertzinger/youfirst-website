import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { isTemplateType } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

interface PostBody {
  name?: unknown;
  type?: unknown;
  subject?: unknown;
  body?: unknown;
  description?: unknown;
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

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const params = request.nextUrl.searchParams;
  const type = params.get("type");

  let q = admin
    .from("email_templates")
    .select(
      "id, name, type, subject, body, description, is_default, status, created_at, updated_at",
    )
    .eq("status", "active")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (type && isTemplateType(type)) q = q.eq("type", type);

  const { data: rows, error } = await q;
  if (error) {
    console.error("[admin/templates GET]", error);
    return fail(500, "Failed to load templates.");
  }
  return NextResponse.json({ templates: rows ?? [] });
}

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

  const name = asTrimmedString(body.name);
  if (!name) return fail(400, "Name is required.", "name");

  if (!isTemplateType(body.type)) {
    return fail(400, "Type is not valid.", "type");
  }
  const type = body.type;

  // Subject + body: required (NOT NULL), but allow empty strings so
  // admins can save a draft. Validation surface lives in the UI.
  const subject = typeof body.subject === "string" ? body.subject : "";
  if (subject.trim() === "") {
    return fail(400, "Subject is required.", "subject");
  }
  const bodyText = typeof body.body === "string" ? body.body : "";

  const description = asTrimmedString(body.description);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inserted, error: insertError } = await admin
    .from("email_templates")
    .insert({
      name,
      type,
      subject,
      body: bodyText,
      description,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[admin/templates POST]", insertError);
    return fail(500, insertError?.message ?? "Failed to create template.");
  }

  return NextResponse.json({ success: true, template_id: inserted.id });
}
