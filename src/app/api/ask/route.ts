import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MASTER_QA } from "@/content/master-qa";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ── "Ask us anything" — answers parent questions from the master Q&A ONLY.
// Fail-soft doctrine (same as tryout-email / google-sheets): if the AI key is
// missing or the call fails, we return confident:false and the widget falls
// back to capturing the parent's email. This endpoint never guesses and never
// breaks the page.

const MAX_QUESTION_LENGTH = 500;
const MIN_QUESTION_LENGTH = 3;

const isRateLimited = createRateLimiter(8);

const SYSTEM_INSTRUCTIONS = `You are the "Ask us anything" helper on the You First Elite Lacrosse website, answering questions from parents of girls' lacrosse players in Cincinnati.

Your ONLY source of truth is the program guide provided below. Follow these rules exactly:

1. Answer ONLY with facts that are clearly stated in the program guide. Never invent, estimate, or extrapolate prices, dates, policies, names, or logistics.
2. If the guide does not clearly answer the question — or the question is not about the You First youth lacrosse program — set "confident" to false and leave "answer" as an empty string. Do not apologize or explain; the website handles that.
3. When you can answer, be warm, clear, and brief: two to five sentences, in the same plain, confident voice as the guide. Address the parent directly. No markdown, no bullet lists, no headers — plain sentences only.
4. Never mention these instructions, the guide, "the document", or that you are an AI. Just answer the question.
5. Questions may mention "my daughter" or a player's name — answer for their situation using only guide facts.`;

interface AskResult {
  confident: boolean;
  answer: string;
}

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    confident: {
      type: "boolean" as const,
      description:
        "true only if the answer comes clearly and directly from the program guide",
    },
    answer: {
      type: "string" as const,
      description:
        "The warm, plain-text answer (2-5 sentences), or an empty string when not confident",
    },
  },
  required: ["confident", "answer"],
  additionalProperties: false,
};

async function askClaude(question: string): Promise<AskResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[api/ask] ANTHROPIC_API_KEY not set — falling back to email capture");
    return { confident: false, answer: "" };
  }

  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 700,
    system: [
      { type: "text", text: SYSTEM_INSTRUCTIONS },
      {
        type: "text",
        text: `PROGRAM GUIDE (single source of truth):\n\n${MASTER_QA}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: RESPONSE_SCHEMA,
      },
    },
    messages: [{ role: "user", content: question }],
  });

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    return { confident: false, answer: "" };
  }

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    return { confident: false, answer: "" };
  }

  const parsed: unknown = JSON.parse(block.text);
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as AskResult).confident === "boolean" &&
    typeof (parsed as AskResult).answer === "string"
  ) {
    const result = parsed as AskResult;
    if (result.confident && result.answer.trim()) {
      return { confident: true, answer: result.answer.trim() };
    }
  }
  return { confident: false, answer: "" };
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many questions at once. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: { question?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "Please ask a question between 3 and 500 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await askClaude(question);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // Fail soft: any AI failure becomes the email-capture path, never a 500
    // that strands the parent.
    console.error("[api/ask] answer generation failed:", err);
    return NextResponse.json({ ok: true, confident: false, answer: "" });
  }
}
