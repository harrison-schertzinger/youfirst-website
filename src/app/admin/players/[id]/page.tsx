import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import {
  inferPlayerSource,
  sourceLabels,
  type PaymentSourceInput,
  type PlayerSourceInput,
} from "@/lib/player-source";
import PlayerArchiveButton from "@/components/admin/PlayerArchiveButton";
import PlayerInfoEditable from "@/components/admin/PlayerInfoEditable";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  jersey_number: string | null;
  school: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
  created_at: string | null;
}

interface LinkRow {
  guardian_id: string;
  is_primary: boolean | null;
}

interface GuardianRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  relationship: string | null;
}

interface PaymentRow {
  id: string;
  amount_cents: number | null;
  payment_method: string | null;
  payment_category: string | null;
  season: string | null;
  status: string | null;
  payment_date: string | null;
  stripe_session_id: string | null;
  created_at: string | null;
}

interface PlanRow {
  id: string;
  plan_type: string;
  total_amount_cents: number | null;
  amount_paid_cents: number | null;
  installments_total: number | null;
  installments_paid: number | null;
  next_due_date: string | null;
  created_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDollarsExact(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function planTypeLabel(planType: string | null | undefined): string {
  switch (planType) {
    case "lump_sum":
      return "Lump Sum";
    case "monthly":
      return "2 Payments";
    case "quarterly":
      return "4 Payments";
    default:
      return planType ?? "—";
  }
}

function shortHash(s: string | null): string {
  if (!s) return "—";
  return s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = getAdminClient();
  if (!admin) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 text-center text-sm text-[#EF4444]">
          Supabase service-role env vars not configured. Player profile
          unavailable.
        </div>
      </div>
    );
  }

  const { data: player, error: playerErr } = await admin
    .from("players")
    .select(
      "id, first_name, last_name, graduation_year, position, jersey_number, school, photo_url, team_name, status, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (playerErr) {
    console.error("[admin/players/[id]] player fetch failed:", playerErr);
    redirect("/admin/players");
  }

  // No row, or already archived → hand back to the roster.
  if (!player) {
    redirect("/admin/players");
  }
  const p = player as PlayerRow;
  if (p.status !== "active") {
    redirect(
      `/admin/players?archived=${encodeURIComponent(`${p.first_name} ${p.last_name}`)}`,
    );
  }

  // Parallel: guardians (via player_guardians), payments, and the most-recent plan.
  const [linksRes, paymentsRes, planRes] = await Promise.all([
    admin
      .from("player_guardians")
      .select("guardian_id, is_primary")
      .eq("player_id", id),
    admin
      .from("payments")
      .select(
        "id, amount_cents, payment_method, payment_category, season, status, payment_date, stripe_session_id, created_at",
      )
      .eq("player_id", id),
    admin
      .from("payment_plans")
      .select(
        "id, plan_type, total_amount_cents, amount_paid_cents, installments_total, installments_paid, next_due_date, created_at",
      )
      .eq("player_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const links: LinkRow[] = (linksRes.data ?? []) as LinkRow[];
  const guardianIds = [...new Set(links.map((l) => l.guardian_id))];

  let guardians: GuardianRow[] = [];
  if (guardianIds.length > 0) {
    const { data: gData } = await admin
      .from("guardians")
      .select("id, email, first_name, last_name, phone, relationship")
      .in("id", guardianIds);
    guardians = (gData ?? []) as GuardianRow[];
  }
  const guardianById = new Map<string, GuardianRow>(
    guardians.map((g) => [g.id, g]),
  );

  const payments: PaymentRow[] = (paymentsRes.data ?? []) as PaymentRow[];
  const plan: PlanRow | null = (planRes.data ?? null) as PlanRow | null;

  // ── Source inference ──────────────────────────────────────────────────
  const sourceInput: PlayerSourceInput = {
    created_at: p.created_at,
    photo_url: p.photo_url,
    status: p.status,
  };
  const paymentInputs: PaymentSourceInput[] = payments.map((pay) => ({
    payment_method: pay.payment_method,
    created_at: pay.created_at,
  }));
  const sourceKey = inferPlayerSource(sourceInput, paymentInputs);
  const source = sourceLabels[sourceKey];

  // ── Financial summary numbers ─────────────────────────────────────────
  const billedCents = plan?.total_amount_cents ?? 0;
  const collectedCents = plan?.amount_paid_cents ?? 0;
  const balanceCents = Math.max(0, billedCents - collectedCents);

  // ── Payment history ordering ──────────────────────────────────────────
  const paymentsSorted = [...payments].sort((a, b) => {
    const ad = a.payment_date ?? a.created_at ?? "";
    const bd = b.payment_date ?? b.created_at ?? "";
    return bd.localeCompare(ad);
  });

  const fullName = `${p.first_name} ${p.last_name}`;

  return (
    <div className="space-y-8">
      <Breadcrumb name={fullName} />

      {/* Page header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Player Profile
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px] font-bold tracking-tight text-[#0A0A0B]">
            {fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-[#6B7280]">
            <span>Class of {p.graduation_year ?? "—"}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span>{p.position ?? "No position"}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span
              className="inline-flex items-center gap-1.5"
              title={source.text}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: source.color }}
                aria-hidden
              />
              <span style={{ color: source.color }}>{source.text}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PlayerArchiveButton playerId={p.id} playerName={fullName} />
        </div>
      </header>

      {/* Row 1: Info + Guardians */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit button lives on this card (not the page header) — contextual
            to the editable surface, avoids hoisting state into a page-wide
            client wrapper. Deliberate deviation from the Sprint 3 PES. */}
        <PlayerInfoEditable
          playerId={p.id}
          initial={{
            position: p.position,
            jersey_number: p.jersey_number,
            school: p.school,
            team_name: p.team_name,
            created_at: p.created_at,
            status: p.status,
          }}
        />
        <GuardiansCard
          links={links}
          guardianById={guardianById}
        />
      </section>

      {/* Row 2: Financial Summary */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          Financial Summary
        </div>
        <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
          {plan ? planTypeLabel(plan.plan_type) : "No plan on file"}
        </h2>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat
            label="Total Billed"
            value={formatDollars(billedCents)}
          />
          <Stat
            label="Total Collected"
            value={formatDollars(collectedCents)}
          />
          <Stat
            label="Outstanding Balance"
            value={formatDollars(balanceCents)}
            tone={balanceCents > 0 ? "negative" : "positive"}
          />
        </div>
        {plan && (
          <div className="mt-4 text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">
            {plan.installments_paid ?? 0} of {plan.installments_total ?? 0} installments paid
          </div>
        )}
      </section>

      {/* Row 3: Payment History */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Payment History
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            {paymentsSorted.length} payment{paymentsSorted.length === 1 ? "" : "s"} on file
          </h2>
        </div>
        {paymentsSorted.length === 0 ? (
          <div className="px-6 md:px-7 py-10 text-center text-sm text-[#6B7280]">
            No payments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Method</Th>
                  <Th>Stripe</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {paymentsSorted.map((pay) => (
                  <tr
                    key={pay.id}
                    className="border-b border-[#E5E7EB] last:border-0"
                  >
                    <td className="px-5 py-3 text-[#6B7280] tabular-nums">
                      {fmtDate(pay.payment_date ?? pay.created_at)}
                    </td>
                    <td className="px-5 py-3 text-[#0A0A0B]">
                      {pay.payment_category ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#0A0A0B]">
                      {formatDollarsExact(pay.amount_cents ?? 0)}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280]">
                      {pay.payment_method ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280] font-mono text-[12px]">
                      {shortHash(pay.stripe_session_id)}
                    </td>
                    <td className="px-5 py-3 text-[#6B7280]">
                      {pay.status ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-[12px] text-[#6B7280]"
    >
      <Link
        href="/admin/players"
        className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Roster
      </Link>
      {name && (
        <>
          <span className="opacity-50">/</span>
          <span className="text-[#0A0A0B] font-medium">{name}</span>
        </>
      )}
    </nav>
  );
}

function GuardiansCard({
  links,
  guardianById,
}: {
  links: LinkRow[];
  guardianById: Map<string, GuardianRow>;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
        Guardians
      </div>
      <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
        {links.length === 0
          ? "No guardian linked"
          : `${links.length} guardian${links.length === 1 ? "" : "s"} on file`}
      </h2>

      {links.length === 0 ? (
        <p className="mt-4 text-sm text-[#6B7280]">
          This player has no guardian record yet. Ask the parent to register, or
          re-create the player via Add Player.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-[#E5E7EB]">
          {links.map((l) => {
            const g = guardianById.get(l.guardian_id);
            return (
              <li
                key={l.guardian_id}
                className="py-4 first:pt-0 last:pb-0"
              >
                {!g ? (
                  <div className="text-sm text-[#EF4444]">
                    guardian_id {l.guardian_id} — record not found
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[14px] font-semibold text-[#0A0A0B]">
                        {g.first_name ?? "—"} {g.last_name ?? "—"}
                      </div>
                      {l.is_primary && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A90D9]">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-[#6B7280] flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{g.email}</span>
                      {g.phone && <span>· {g.phone}</span>}
                      {g.relationship && <span>· {g.relationship}</span>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({
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
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
        {label}
      </div>
      <div
        className="mt-1.5 text-[24px] font-bold tabular-nums tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
