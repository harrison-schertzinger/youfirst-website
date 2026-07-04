import { createClient } from "@supabase/supabase-js";
import { ClipboardCheck } from "lucide-react";
import TryoutCsvButton, { type TryoutCsvRow } from "@/components/admin/TryoutCsvButton";

export const dynamic = "force-dynamic";

// ─── Tryout Signups — read-only roster of tryout_registrations ───────────────
// Addition only: this page just READS the table the registration form writes.

interface RegRow {
  id: string;
  player_full_name: string;
  parent_name: string;
  email: string;
  phone: string;
  graduation_year: number | null;
  position: string | null;
  tryout_type: string | null;
  tryout_date: string | null;
  tryout_group: string | null;
  payment_status: string;
  created_at: string;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function groupLabel(r: RegRow): string {
  if (r.tryout_type === "makeup") return "Make-up Tryouts · August 3–7";
  if (r.tryout_date === "2026-07-11") return "Saturday, July 11 · Youth";
  if (r.tryout_date === "2026-07-25") return "Saturday, July 25 · Older";
  return "Other";
}

const GROUP_ORDER = [
  "Saturday, July 11 · Youth",
  "Saturday, July 25 · Older",
  "Make-up Tryouts · August 3–7",
  "Other",
];

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
      "id, player_full_name, parent_name, email, phone, graduation_year, position, tryout_type, tryout_date, tryout_group, payment_status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-sm text-red-600">
        Couldn&apos;t load signups: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as RegRow[];
  const paid = rows.filter((r) => r.payment_status === "paid");
  const pending = rows.filter((r) => r.payment_status !== "paid");

  const groups = new Map<string, RegRow[]>();
  for (const r of rows) {
    const label = groupLabel(r);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(r);
  }

  const csvRows: TryoutCsvRow[] = rows.map((r) => ({
    player: r.player_full_name,
    parent: r.parent_name,
    email: r.email,
    phone: r.phone,
    gradYear: r.graduation_year ? String(r.graduation_year) : "",
    position: r.position ?? "",
    tryout: groupLabel(r),
    status: r.payment_status === "paid" ? "Paid" : "Pending (no payment taken)",
    signedUp: fmtDate(r.created_at),
  }));

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
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
        <TryoutCsvButton rows={csvRows} />
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-2xl border border-[#E5E8EC] bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-1">
            Paid registrations
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
            {paid.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E8EC] bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-1">
            Started, not paid
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-[#9CA3AF]">
            {pending.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E8EC] bg-white p-5 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-1">
            Collected
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-[#1A1A1A]">
            ${paid.length * 50}
          </p>
        </div>
      </div>

      {/* Groups */}
      {GROUP_ORDER.filter((g) => groups.has(g)).map((label) => {
        const list = groups.get(label)!;
        const paidCount = list.filter((r) => r.payment_status === "paid").length;
        return (
          <section key={label} className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-bold text-[#1A1A1A]">{label}</h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold">
                {paidCount} paid{list.length > paidCount ? ` · ${list.length - paidCount} pending` : ""}
              </span>
            </div>
            <div className="rounded-2xl border border-[#E5E8EC] bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#9CA3AF] border-b border-[#E5E8EC]">
                    <th className="px-5 py-3 font-semibold">Player</th>
                    <th className="px-5 py-3 font-semibold">Parent</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Grad</th>
                    <th className="px-5 py-3 font-semibold">Position</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const isPaid = r.payment_status === "paid";
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-[#F1F3F6] last:border-0 ${
                          isPaid ? "text-[#1A1A1A]" : "text-[#B7BEC9]"
                        }`}
                      >
                        <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                          {r.player_full_name}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{r.parent_name}</td>
                        <td className="px-5 py-3.5">{r.email}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{r.phone}</td>
                        <td className="px-5 py-3.5">{r.graduation_year ?? "—"}</td>
                        <td className="px-5 py-3.5 capitalize">{r.position ?? "—"}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[#177245] text-[11px] font-semibold">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F1F3F6] text-[#9CA3AF] text-[11px] font-semibold">
                              Pending — no payment taken
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{fmtDate(r.created_at)}</td>
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
    </div>
  );
}
