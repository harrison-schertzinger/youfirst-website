import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ClipboardCheck, FileDown, Upload } from "lucide-react";
import TryoutCsvButton, { type TryoutCsvRow } from "@/components/admin/TryoutCsvButton";
import SheetSyncButton from "@/components/admin/SheetSyncButton";
import { describeTryout, isTryoutType } from "@/lib/tryouts";
import { lastNameSortKey } from "@/lib/tryouts/fieldSheet";

export const dynamic = "force-dynamic";

// ─── Tryouts — every registered prospect, grouped by class ───────────────────
// Grouped by graduation year (newest class first) with breathing room between
// classes. "Download Field Sheet" produces the fully-offline check-in file for
// tryout day; "Import Field Results" brings that day's data back into the DB.

interface RegRow {
  id: string;
  player_full_name: string;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  graduation_year: number | null;
  position: string | null;
  tryout_type: string | null;
  tryout_date: string | null;
  tryout_group: string | null;
  payment_status: string;
  source: string;
  created_at: string;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function tryoutLabel(r: RegRow): string {
  const type = isTryoutType(r.tryout_type) ? r.tryout_type : "scheduled";
  const d = describeTryout({ type, isoDate: r.tryout_date, group: r.tryout_group });
  return `${d.typeLabel} · ${d.dateLine}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function TryoutSignupsPage() {
  const supabase = getServiceClient();
  if (!supabase) {
    return (
      <div className="p-8 text-sm text-red-600">
        Server is missing its database keys — signups can&apos;t load.
      </div>
    );
  }

  const { data, error } = await supabase
    .from("tryout_registrations")
    .select(
      "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, tryout_group, payment_status, source, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-sm text-red-600">
        Couldn&apos;t load signups: {error.message}
      </div>
    );
  }

  const allRows = (data ?? []) as RegRow[];
  // Real registrants only — recruiting-pipeline rows never signed up.
  const rows = allRows.filter((r) => r.source === "tryout");
  const recruitingCount = allRows.length - rows.length;

  const paid = rows.filter((r) => r.payment_status === "paid");
  const confirmed = rows.filter(
    (r) => r.payment_status === "paid" || r.payment_status === "free",
  );
  const pending = rows.filter(
    (r) => r.payment_status !== "paid" && r.payment_status !== "free",
  );

  // Group by graduation year, newest class (highest year) first; the rare
  // year-less row gets its own trailing group instead of vanishing.
  const byYear = new Map<number | "none", RegRow[]>();
  for (const r of rows) {
    const k = r.graduation_year ?? "none";
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k)!.push(r);
  }
  const yearKeys = Array.from(byYear.keys()).sort((a, b) => {
    if (a === "none") return 1;
    if (b === "none") return -1;
    return b - a;
  });
  for (const k of yearKeys) {
    byYear.get(k)!.sort((a, b) =>
      lastNameSortKey(a.player_full_name).localeCompare(
        lastNameSortKey(b.player_full_name),
      ),
    );
  }

  const csvRows: TryoutCsvRow[] = rows.map((r) => ({
    player: r.player_full_name,
    parent: r.parent_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    gradYear: r.graduation_year ? String(r.graduation_year) : "",
    position: r.position ?? "",
    tryout: tryoutLabel(r),
    status:
      r.payment_status === "paid"
        ? "Paid"
        : r.payment_status === "free"
          ? "Registered (free)"
          : "Pending (no payment taken)",
    signedUp: fmtDate(r.created_at),
  }));

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2.5 text-accent-blue mb-1.5">
            <ClipboardCheck size={18} strokeWidth={2.5} />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
              2026 Tryouts
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
            Tryout Signups
          </h1>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <a
            href="/api/admin/tryouts/field-sheet"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B0E12] text-white text-[13px] font-semibold uppercase tracking-[0.08em] rounded-xl hover:bg-[#1c2027] transition-colors"
          >
            <FileDown size={15} strokeWidth={2.5} />
            Download Field Sheet
          </a>
          <Link
            href="/admin/tryouts/import"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#D6DBE1] bg-white text-[#1A1A1A] text-[13px] font-semibold uppercase tracking-[0.08em] rounded-xl hover:bg-[#F1F3F6] transition-colors"
          >
            <Upload size={15} strokeWidth={2.5} />
            Import Field Results
          </Link>
          <TryoutCsvButton rows={csvRows} />
          <SheetSyncButton />
        </div>
      </div>
      <p className="text-[13px] text-[#6B7280] mb-8">
        The field sheet is one file that works fully offline — download it on
        wifi, AirDrop it to the iPad, and import the results file it exports
        when you&apos;re back.
      </p>

      {/* Count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        <div className="rounded-2xl border border-[#E5E8EC] bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-1">
            Confirmed registrations
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
            {confirmed.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E8EC] bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-1">
            Started, not finished
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-[#9CA3AF]">
            {pending.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E8EC] bg-white p-5 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-1">
            Collected (past $50 fees)
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
            ${paid.length * 50}
          </p>
        </div>
      </div>

      {/* Class groups — newest class first, clear air between groups */}
      {yearKeys.map((yearKey) => {
        const list = byYear.get(yearKey)!;
        return (
          <section key={String(yearKey)} className="mb-14">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-bold tracking-tight text-[#1A1A1A]">
                {yearKey === "none" ? "No grad year on file" : `Class of ${yearKey}`}
              </h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold">
                {list.length} {list.length === 1 ? "athlete" : "athletes"}
              </span>
            </div>
            <div className="rounded-2xl border border-[#E5E8EC] bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#9CA3AF] border-b border-[#E5E8EC]">
                    <th className="px-5 py-3 font-semibold">Player</th>
                    <th className="px-5 py-3 font-semibold">Position</th>
                    <th className="px-5 py-3 font-semibold">Parent</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Tryout</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const isPaid = r.payment_status === "paid";
                    const isFree = r.payment_status === "free";
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-[#F1F3F6] last:border-0 ${
                          isPaid || isFree ? "text-[#1A1A1A]" : "text-[#B7BEC9]"
                        }`}
                      >
                        <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                          {r.player_full_name}
                        </td>
                        <td className="px-5 py-3.5">{r.position ?? "—"}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {r.parent_name ?? "—"}
                        </td>
                        <td className="px-5 py-3.5">{r.email ?? "—"}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{r.phone ?? "—"}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{tryoutLabel(r)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[#177245] text-[11px] font-semibold">
                              Paid
                            </span>
                          ) : isFree ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold">
                              Free
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F1F3F6] text-[#9CA3AF] text-[11px] font-semibold">
                              Pending — no payment taken
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {fmtDate(r.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {rows.length === 0 && (
        <p className="text-sm text-[#9CA3AF]">No registrations yet.</p>
      )}

      {recruitingCount > 0 && (
        <p className="text-[12px] text-[#9CA3AF] mt-2">
          {recruitingCount} recruiting-pipeline{" "}
          {recruitingCount === 1 ? "row" : "rows"} (not tryout signups) not shown
          here.
        </p>
      )}
    </div>
  );
}
