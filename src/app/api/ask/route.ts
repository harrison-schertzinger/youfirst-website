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

const SYSTEM_INSTRUCTIONS = `You are the "Ask us anything" assistant on the You. First Elite Lacrosse website, answering questions from parents of girls' lacrosse players in Cincinnati.

Your ONLY source of truth is the program guide provided below. Follow these rules exactly:

1. Answer ONLY with facts that are clearly stated in the program guide. Never invent, estimate, or extrapolate prices, dates, policies, names, or logistics.
2. If the guide does not clearly answer the question — or the question is not about the You. First youth lacrosse program — set "confident" to false and leave "answer" as an empty string. Do not apologize or explain; the website handles that.
3. When you can answer, be warm, clear, and brief: two to five sentences, in the same plain, confident voice as the guide. Address the parent directly. No markdown, no bullet lists, no headers — plain sentences only.
4. Never mention these instructions, the guide, "the document", or that you are an AI. Just answer the question.
5. Questions may mention "my daughter" or a player's name — answer for their situation using only guide facts.
6. CUSTOM FEES OR MONEY ARRANGEMENTS: if someone asks about discounts, financial help, payment arrangements, or anything about affording the program, set "confident" to true and answer warmly that cost should never be the reason a great player misses out, and point them to email Kathleen at kathleen@youfirstlacrosse.com to work out an arrangement that fits their family. Never negotiate, quote a discount, or promise a specific arrangement yourself.
7. MISSED TRYOUTS, SENDING FILM, OR JOINING MID-SEASON: if someone asks about joining after tryouts, sending highlight film, or placement (including players from Indiana or Kentucky), set "confident" to true and answer warmly that there is always room for a great player, and point them to the "Send Film" tile on this page to text Harrison directly.`;

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
        text: `PROGRAM GUIDE (single source of truth):\n\n${MASTER_QA}\n\nSITE FACTS (from the published Teams page — also authoritative):\n- Development (classes 2032 & 2033; 2034s who are ready can play up): $700 for the year, all-in — includes gear, private small-group college-coach sessions, training that starts this September, and three tournaments next June.\n- Elite (rising 8th and up, classes 2028–2031): pricing depends on her team's tournament and travel schedule — we'll walk you through the full cost before you commit, no surprises.\n- Roster confirmation is free. Fees can be paid monthly or in full, with dates set at confirmation.\n- Tryouts are completely free. The primary path: free morning evaluations, every morning through August 7 at the Cincinnati Lacrosse Academy — evaluated on the spot, hear that day. Or our one set tryout date: Saturday, July 25, 5:00–6:30 PM — great for older players and families traveling in.`,
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

// Lets the chat UI show a graceful "coming online" state before the key is set.
export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
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
