import Link from "next/link";
import { sourceLabels, type SourceLabel } from "@/lib/player-source";

export interface TileRow {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  source: SourceLabel;
  billed_cents: number;
  collected_cents: number;
  balance_cents: number;
  prior_balance_cents: number;
}

export interface TileYearBlock {
  year: number | null;
  rows: TileRow[];
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function PlayerRosterTiles({
  byYear,
}: {
  byYear: TileYearBlock[];
}) {
  return (
    <div className="space-y-8">
      {byYear.map((block) => (
        <section
          key={block.year ?? "unknown"}
          className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          <header className="flex items-center justify-between px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#0A0A0B]">
              {block.year != null ? `Class of ${block.year}` : "Class — Unknown"}
            </h2>
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#6B7280] tabular-nums">
              {block.rows.length} player{block.rows.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {block.rows.map((p) => (
              <PlayerTile key={p.id} player={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlayerTile({ player }: { player: TileRow }) {
  const source = sourceLabels[player.source];
  const outstanding = player.balance_cents > 0;
  return (
    <Link
      href={`/admin/players/${player.id}`}
      className="block rounded-xl border border-[#E5E7EB] bg-white p-4 hover:border-[#4A90D9]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-[#0A0A0B] truncate">
            {player.first_name} {player.last_name}
          </div>
          <div className="mt-0.5 text-[12px] text-[#6B7280]">
            {player.position ?? "—"}
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em]"
          style={{ color: source.color }}
          title={source.text}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: source.color }}
            aria-hidden
          />
          <span className="hidden sm:inline">{source.text}</span>
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <BalanceCell label="Billed 26–27" value={formatDollars(player.billed_cents)} />
        <BalanceCell
          label="Collected 26–27"
          value={formatDollars(player.collected_cents)}
        />
        <BalanceCell
          label="Balance"
          value={formatDollars(player.balance_cents)}
          tone={outstanding ? "negative" : "positive"}
        />
      </dl>
    </Link>
  );
}

function BalanceCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color =
    tone === "negative"
      ? "#EF4444"
      : tone === "positive"
        ? "#34D399"
        : "#0A0A0B";
  return (
    <div>
      <dt className="text-[#6B7280] uppercase tracking-[0.08em]">{label}</dt>
      <dd
        className="mt-0.5 font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </dd>
    </div>
  );
}
