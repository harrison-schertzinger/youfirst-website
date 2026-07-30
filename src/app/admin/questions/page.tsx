import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import ResolveQuestionButton from "@/components/admin/ResolveQuestionButton";

export const dynamic = "force-dynamic";

// ─── Balance questions — the queue ───────────────────────────────────────────
// A notification email is not a queue. Every parent submission from the portal
// lands here: newest first, with the balance snapshot taken at submission so a
// question can be answered without opening anything else.

interface PlayerRef {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
}

interface QuestionRow {
  id: string;
  message: string;
  guardian_email: string;
  charged_cents: number | null;
  paid_cents: number | null;
  adjustment_cents: number | null;
  remaining_cents: number | null;
  status: "new" | "resolved";
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  players: PlayerRef | null;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function money(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export default async function AdminQuestionsPage() {
  const supabase = getServiceClient();

  if (!supabase) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center">
        <p className="text-sm text-[#9CA3AF]">
          Service-role env vars not configured.
        </p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("balance_questions")
    .select(
      `id, message, guardian_email, charged_cents, paid_cents,
       adjustment_cents, remaining_cents, status, resolved_at, resolved_by,
       resolution_note, created_at,
       players ( id, first_name, last_name, graduation_year )`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/questions]", error);
  }

  const rows = (data ?? []) as unknown as QuestionRow[];
  const open = rows.filter((r) => r.status === "new");
  const resolved = rows.filter((r) => r.status === "resolved");

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-[#4B9CD3]" />
          <h1 className="text-[1.75rem] font-bold tracking-tight text-[#1A1A1A]">
            Balance Questions
          </h1>
        </div>
        <p className="mt-2 text-sm text-[#6B7280]">
          Parent submissions from the portal.{" "}
          <span className="font-semibold text-[#1A1A1A]">
            {open.length} waiting
          </span>
          {resolved.length > 0 && ` · ${resolved.length} resolved`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center">
          <p className="text-sm text-[#9CA3AF]">
            No questions yet. When a parent submits one from her portal, it lands
            here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                Waiting
              </h2>
              <ul className="space-y-4">
                {open.map((q) => (
                  <QuestionCard key={q.id} q={q} />
                ))}
              </ul>
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                Resolved
              </h2>
              <ul className="space-y-4">
                {resolved.map((q) => (
                  <QuestionCard key={q.id} q={q} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q }: { q: QuestionRow }) {
  const player = q.players;
  const playerName = player
    ? `${player.first_name} ${player.last_name}`
    : "Unknown player";
  const isResolved = q.status === "resolved";

  return (
    <li
      className={[
        "rounded-xl border bg-white p-5",
        isResolved ? "border-[#E5E7EB] opacity-70" : "border-[#4B9CD3]/30",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {player ? (
              <Link
                href={`/admin/players/${player.id}`}
                className="text-[15px] font-bold text-[#1A1A1A] hover:text-[#4B9CD3] hover:underline"
              >
                {playerName}
              </Link>
            ) : (
              <span className="text-[15px] font-bold text-[#1A1A1A]">
                {playerName}
              </span>
            )}
            {player?.graduation_year && (
              <span className="text-[12px] text-[#9CA3AF]">
                {player.graduation_year}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-[#6B7280]">
            <a
              href={`mailto:${q.guardian_email}`}
              className="hover:text-[#4B9CD3] hover:underline"
            >
              {q.guardian_email}
            </a>{" "}
            · {fmtDateTime(q.created_at)}
          </p>
        </div>
        <ResolveQuestionButton questionId={q.id} status={q.status} />
      </div>

      {/* Balance at submission */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] tabular-nums">
        <span className="text-[#6B7280]">
          Charged{" "}
          <span className="font-semibold text-[#1A1A1A]">
            {money(q.charged_cents)}
          </span>
        </span>
        <span className="text-[#6B7280]">
          Paid{" "}
          <span className="font-semibold text-[#1A1A1A]">
            {money(q.paid_cents)}
          </span>
        </span>
        {q.adjustment_cents != null && q.adjustment_cents > 0 && (
          <span className="text-[#6B7280]">
            Adjustment{" "}
            <span className="font-semibold text-[#1A1A1A]">
              −{money(q.adjustment_cents)}
            </span>
          </span>
        )}
        <span className="text-[#6B7280]">
          Remaining{" "}
          <span className="font-bold text-[#1A1A1A]">
            {money(q.remaining_cents)}
          </span>
        </span>
      </div>

      {/* The message. Parent-supplied text — rendered as text, never markup.
          JSX escapes this by construction. */}
      <div className="mt-3 rounded-lg border-l-[3px] border-[#4B9CD3] bg-[#F6F8FA] px-4 py-3">
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#1A1A1A]">
          {q.message}
        </p>
      </div>

      {isResolved && q.resolved_by && (
        <p className="mt-3 text-[11px] text-[#9CA3AF]">
          Resolved by {q.resolved_by}
          {q.resolved_at && ` · ${fmtDateTime(q.resolved_at)}`}
        </p>
      )}
    </li>
  );
}
