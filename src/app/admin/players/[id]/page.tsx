import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { isOnRoster } from "@/lib/player-status";
import {
  inferPlayerSource,
  sourceLabels,
  type PaymentSourceInput,
  type PlayerSourceInput,
} from "@/lib/player-source";
import PlayerArchiveButton from "@/components/admin/PlayerArchiveButton";
import type { PlayerBalanceRow } from "@/lib/portal-balance";
import PlayerInfoEditable from "@/components/admin/PlayerInfoEditable";
import GuardiansEditableCard, {
  type GuardianWithLink,
} from "@/components/admin/GuardiansEditableCard";
import PaymentLinksSection from "@/components/admin/PaymentLinksSection";
import ChargesSection, {
  type AdminCharge,
} from "@/components/admin/ChargesSection";
import SendReminderTrigger from "@/components/admin/SendReminderTrigger";
import type { ReminderGuardian } from "@/components/admin/SendReminderModal";

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
  season: string | null;
  total_amount_cents: number | null;
  amount_paid_cents: number | null;
  installments_total: number | null;
  installments_paid: number | null;
  adjustment_cents: number | null;
  adjustment_reason: string | null;
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
  // Injured and on-hold athletes are ON the roster — only genuinely departed
  // players get bounced back with the "archived" notice.
  if (!isOnRoster(p.status)) {
    redirect(
      `/admin/players?archived=${encodeURIComponent(`${p.first_name} ${p.last_name}`)}`,
    );
  }

  // Parallel: guardians (via player_guardians), payments, plan, charges, and
  // THE balance — player_balances(), the same function the portal, checkout
  // and collections email read.
  const [linksRes, paymentsRes, planRes, chargesRes, balanceRes] = await Promise.all([
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
        "id, plan_type, season, total_amount_cents, amount_paid_cents, installments_total, installments_paid, adjustment_cents, adjustment_reason, next_due_date, created_at",
      )
      .eq("player_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("player_charges")
      .select("id, label, amount_cents, season, status, paid_at, created_at")
      .eq("player_id", id)
      .order("created_at", { ascending: false }),
    admin.rpc("player_balances", { p_player_id: id }),
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

  // Shape the data for the editable card: one row per link, joined with
  // the guardian record. Filter out any orphan link whose guardian row
  // disappeared (shouldn't happen with FK constraints, but defensive).
  const guardiansWithLinks: GuardianWithLink[] = links
    .map((link) => {
      const g = guardianById.get(link.guardian_id);
      if (!g) return null;
      return {
        id: g.id,
        first_name: g.first_name,
        last_name: g.last_name,
        email: g.email,
        phone: g.phone,
        relationship: g.relationship,
        is_primary: link.is_primary ?? false,
      };
    })
    .filter((x): x is GuardianWithLink => x !== null);

  const payments: PaymentRow[] = (paymentsRes.data ?? []) as PaymentRow[];
  const plan: PlanRow | null = (planRes.data ?? null) as PlanRow | null;
  const charges: AdminCharge[] = (chargesRes.data ?? []) as AdminCharge[];

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
  // Every figure comes from player_balances() — the same function the portal,
  // checkout and collections email read. The previous derivation read
  // plan.amount_paid_cents, a counter only the Stripe webhook maintains: a
  // check or Zelle payment logged straight into `payments` would have made
  // this page show a stale Collected and a wrong balance on the one screen
  // Kathleen bills from. Collected is the summer ledger (roster/fall money
  // never nets against the season plan).
  const balanceRow =
    ((balanceRes.data ?? null) as PlayerBalanceRow[] | null)?.[0] ?? null;
  const billedCents = balanceRow?.charged_cents ?? plan?.total_amount_cents ?? 0;
  const collectedCents = balanceRow?.paid_cents ?? 0;
  const adjustmentCents = balanceRow?.adjustment_cents ?? 0;
  const balanceCents = balanceRow?.remaining_cents ?? 0;

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
        <GuardiansEditableCard
          playerId={p.id}
          guardians={guardiansWithLinks}
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
        {/* Any released amount, with its reason. The installment counters are
            deliberately NOT shown: the April 2026 import set them to 1 for
            everyone who had paid anything, so "1 of 1 installments paid"
            appeared beside a real outstanding balance. Money is the truth. */}
        {plan && adjustmentCents > 0 && (
          <div className="mt-4 rounded-lg border border-[#4A90D9]/25 bg-[#4A90D9]/5 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4A90D9]">
              Adjustment −{formatDollars(adjustmentCents)}
            </div>
            <p className="mt-0.5 text-[12px] text-[#1A1A1A]">
              {plan.adjustment_reason}
            </p>
          </div>
        )}
      </section>

      {/* One-off charges — always available, even with no plan balance, so a
          player can be charged for something extra (missed tournaments, etc.). */}
      <ChargesSection
        playerId={p.id}
        playerName={fullName}
        initialCharges={charges}
      />

      {/* Payment Management — visible only when there's an outstanding balance. */}
      {balanceCents > 0 && (
        <>
          <PaymentLinksSection
            playerId={p.id}
            playerName={fullName}
            plan={
              plan
                ? {
                    total_amount_cents: plan.total_amount_cents,
                    amount_paid_cents: plan.amount_paid_cents,
                    installments_total: plan.installments_total,
                    installments_paid: plan.installments_paid,
                  }
                : null
            }
          />
          {/* Send-reminder trigger lives next to the payment-link surface
              so the two actions an operator takes on an outstanding balance
              sit together. Modal owns its own fetches. */}
          <div className="flex items-center justify-end -mt-2">
            <SendReminderTrigger
              playerId={p.id}
              playerName={fullName}
              parentFirstName={
                guardiansWithLinks.find((g) => g.is_primary)?.first_name ?? null
              }
              parentLastName={
                guardiansWithLinks.find((g) => g.is_primary)?.last_name ?? null
              }
              guardians={guardiansWithLinks
                .map<ReminderGuardian>((g) => ({
                  id: g.id,
                  first_name: g.first_name,
                  last_name: g.last_name,
                  email: g.email,
                  is_primary: g.is_primary,
                }))
                // Primary first.
                .sort((a, b) =>
                  a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1,
                )}
              outstandingCents={balanceCents}
              season={plan?.season ?? null}
            />
          </div>
        </>
      )}

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
