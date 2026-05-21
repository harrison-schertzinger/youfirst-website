import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { isTemplateType } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

interface PatchBody {
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

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) return fail(400, "Missing template id.");

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
    .from("email_templates")
    .select(
      "id, name, type, subject, body, description, is_default, status, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[admin/templates GET id]", error);
    return fail(500, "Failed to load template.");
  }
  if (!data) return fail(404, "Template not found.");
  return NextResponse.json({ template: data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) return fail(400, "Missing template id.");

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

  const updates: Record<string, unknown> = {};

  if ("name" in body) {
    const v = asNullableString(body.name);
    if (v === undefined || v === null) {
      return fail(400, "Name is required.", "name");
    }
    updates.name = v;
  }

  if ("type" in body) {
    if (!isTemplateType(body.type)) {
      return fail(400, "Type is not valid.", "type");
    }
    updates.type = body.type;
  }

  if ("subject" in body) {
    if (typeof body.subject !== "string") {
      return fail(400, "Subject must be a string.", "subject");
    }
    if (body.subject.trim() === "") {
      return fail(400, "Subject is required.", "subject");
    }
    updates.subject = body.subject;
  }

  if ("body" in body) {
    if (typeof body.body !== "string") {
      return fail(400, "Body must be a string.", "body");
    }
    updates.body = body.body;
  }

  if ("description" in body) {
    const v = asNullableString(body.description);
    if (v === undefined) {
      return fail(400, "description must be a string or null.", "description");
    }
    updates.description = v;
  }

  if (Object.keys(updates).length === 0) {
    return fail(400, "No editable fields provided.");
  }

  updates.updated_at = new Date().toISOString();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail(500, "Service-role env vars not configured.");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: updated, error } = await admin
    .from("email_templates")
    .update(updates)
    .eq("id", id)
    .select(
      "id, name, type, subject, body, description, is_default, status, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    console.error("[admin/templates PATCH]", error);
    return fail(500, error.message ?? "Update failed.");
  }
  if (!updated) return fail(404, "Template not found.");

  return NextResponse.json({ success: true, template: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) return fail(400, "Missing template id.");

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

  const { error } = await admin
    .from("email_templates")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[admin/templates DELETE]", error);
    return fail(500, error.message ?? "Archive failed.");
  }
  return NextResponse.json({ success: true });
}
