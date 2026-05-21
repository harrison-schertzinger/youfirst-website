import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Plus, UserPlus } from "lucide-react";
import {
  PROSPECT_STAGES,
  stageLabel,
  type ProspectStage,
} from "@/lib/prospects";

export const dynamic = "force-dynamic";

interface ProspectListRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  source: string | null;
  stage: ProspectStage;
  last_contacted_at: string | null;
  status: string;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Days since a timestamp. Returns null if no value or unparseable.
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Visible stages by default — converted + declined are archive-style.
const VISIBLE_STAGES: ProspectStage[] = [
  "interested",
  "contacted",
  "parent_confirmed",
  "ready_to_onboard",
];
const ARCHIVE_STAGES: ProspectStage[] = ["converted", "declined"];

export default async function ProspectsListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === "true" || params.archived === "1";

  const admin = getAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Supabase service-role env vars not configured.
      </div>
    );
  }

  const { data: rowsData, error } = await admin
    .from("prospects")
    .select(
      "id, first_name, last_name, graduation_year, position, parent_first_name, parent_last_name, source, stage, last_contacted_at, status",
    )
    .eq("status", "active")
    .order("last_contacted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/prospects] fetch failed:", error);
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Failed to load prospects: {error.message}
      </div>
    );
  }

  const rows = (rowsData ?? []) as ProspectListRow[];

  const byStage = new Map<ProspectStage, ProspectListRow[]>();
  for (const s of PROSPECT_STAGES) byStage.set(s, []);
  for (const r of rows) {
    byStage.get(r.stage)?.push(r);
  }

  const totalInPipeline = VISIBLE_STAGES.reduce(
    (n, s) => n + (byStage.get(s)?.length ?? 0),
    0,
  );
  const readyToConvert = byStage.get("ready_to_onboard")?.length ?? 0;

  const stagesToRender: ProspectStage[] = showArchived
    ? [...VISIBLE_STAGES, ...ARCHIVE_STAGES]
    : VISIBLE_STAGES;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Recruiting
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            Prospects
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {totalInPipeline} in pipeline · {readyToConvert} ready to convert
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={
              showArchived ? "/admin/prospects" : "/admin/prospects?archived=true"
            }
            className="text-[12px] text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
          <Link
            href="/admin/prospects/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Prospect
          </Link>
        </div>
      </header>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stagesToRender.slice(0, 4).map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            rows={byStage.get(stage) ?? []}
          />
        ))}
      </div>

      {showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARCHIVE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              rows={byStage.get(stage) ?? []}
              archived
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StageColumn({
  stage,
  rows,
  archived,
}: {
  stage: ProspectStage;
  rows: ProspectListRow[];
  archived?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 min-h-[180px]">
      <header className="px-1 pb-3 flex items-center justify-between border-b border-[#E5E7EB] mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0A0A0B]">
          {stageLabel[stage]}
        </h2>
        <span className="text-[11px] tabular-nums text-[#6B7280]">
          {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <div className="text-[12px] text-[#9CA3AF] italic px-1 py-3">
          No prospects in this stage
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/prospects/${r.id}`}
                className={[
                  "block rounded-lg border p-3 transition-all",
                  archived
                    ? "border-[#E5E7EB] bg-[#F8F9FA] hover:bg-white"
                    : "border-[#E5E7EB] bg-white hover:border-[#4A90D9]/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-[13px] text-[#0A0A0B]">
                    {r.first_name} {r.last_name}
                  </div>
                  {r.source && (
                    <span className="text-[10px] uppercase tracking-[0.08em] text-[#6B7280] shrink-0">
                      {r.source}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-[#6B7280]">
                  {r.graduation_year ? `Class of ${r.graduation_year}` : "Class —"}
                  {r.position ? ` · ${r.position}` : ""}
                </div>
                {(r.parent_first_name || r.parent_last_name) && (
                  <div className="mt-1 text-[11px] text-[#6B7280]">
                    Parent: {r.parent_first_name ?? ""}{" "}
                    {r.parent_last_name ?? ""}
                  </div>
                )}
                {r.last_contacted_at && (
                  <div className="mt-1.5 text-[10px] text-[#9CA3AF]">
                    <UserPlus className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                    Last contacted{" "}
                    {(() => {
                      const d = daysSince(r.last_contacted_at);
                      if (d === null) return "—";
                      if (d === 0) return "today";
                      if (d === 1) return "yesterday";
                      return `${d} days ago`;
                    })()}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
