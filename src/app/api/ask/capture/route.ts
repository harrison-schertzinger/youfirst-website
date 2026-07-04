import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ── Unanswered-question capture. When the AI helper can't answer confidently,
// the widget collects the parent's email + question and stores it here so a
// real person can follow up. Writes go through the service-role key; the
// table (qa_unanswered_questions) denies anon entirely.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_QUESTION_LENGTH = 600;

const isRateLimited = createRateLimiter(5);

export async function POST(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[api/ask/capture] Supabase env not configured");
    return NextResponse.json(
      { ok: false, error: "Not configured." },
      { status: 503 },
    );
  }

  let body: { email?: unknown; question?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const question =
    typeof body.question === "string" ? body.question.trim() : "";

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Please provide a valid email address." },
      { status: 400 },
    );
  }
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "Please include your question (up to 600 characters)." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("qa_unanswered_questions")
    .insert({ email, question, source: "website" });

  if (error) {
    console.error("[api/ask/capture] insert failed:", error.code, error.message);
    return NextResponse.json(
      { ok: false, error: "Could not save your question. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
