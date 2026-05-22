import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  PROSPECT_STAGES,
  type ProspectStage,
} from "@/lib/prospects";
import ProspectsSpreadsheet, {
  type ProspectRow,
} from "@/components/admin/ProspectsSpreadsheet";

export const dynamic = "force-dynamic";

type ProspectListRow = ProspectRow;

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const VISIBLE_PIPELINE: ReadonlySet<ProspectStage> = new Set<ProspectStage>([
  "interested",
  "contacted",
  "parent_confirmed",
  "ready_to_onboard",
]);

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

  // Load everything in one shot — filtering happens client-side so the
  // search + sort interactions don't round-trip. With prospects measured
  // in the low hundreds, this is fine; revisit if the count grows past
  // ~1000.
  const { data, error } = await admin
    .from("prospects")
    .select(
      "id, first_name, last_name, graduation_year, parent_first_name, parent_last_name, parent_email, parent_phone, source, stage, last_contacted_at, converted_player_id, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/prospects] fetch failed:", error);
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Failed to load prospects: {error.message}
      </div>
    );
  }

  const rows = ((data ?? []) as ProspectListRow[]).filter((r) =>
    PROSPECT_STAGES.includes(r.stage),
  );

  const inPipeline = rows.filter(
    (r) => r.status === "active" && VISIBLE_PIPELINE.has(r.stage),
  ).length;
  const readyToConvert = rows.filter(
    (r) => r.status === "active" && r.stage === "ready_to_onboard",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Recruiting
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            Prospects
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {inPipeline} in pipeline · {readyToConvert} ready to convert
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={
              showArchived
                ? "/admin/prospects"
                : "/admin/prospects?archived=true"
            }
            className="text-[12px] text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
        </div>
      </header>

      <ProspectsSpreadsheet rows={rows} showArchived={showArchived} />
    </div>
  );
}
