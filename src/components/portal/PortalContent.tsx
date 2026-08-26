"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import PlayerProfileTile from "./PlayerProfileTile";
import { TICKET_AMOUNTS_CENTS } from "@/lib/feesData";
import type { ClubContact } from "@/lib/club-contacts";
import type { ProfileGuardian } from "./PlayerProfileTile";
import PortalSideNav from "./PortalSideNav";
import FeesPanel from "./FeesPanel";
import BalanceQuestion from "./BalanceQuestion";
import PlayerPicker from "./PlayerPicker";
import PlayerSwitcher from "./PlayerSwitcher";
import type { PlayerBalanceRow } from "@/lib/portal-balance";

interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  is_emergency_contact: boolean;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  position: string | null;
  jersey_number: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
}

interface Payment {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  payment_category: string | null;
  description: string | null;
  payment_date: string;
  season: string | null;
  status: string;
}

export interface PortalCharge {
  id: string;
  label: string;
  amount_cents: number;
  season: string | null;
  status: "open" | "paid" | "void";
  paid_at: string | null;
  created_at: string | null;
}

export interface SeasonBalance {
  season: string;
  charged_cents: number;
  paid_cents: number;
  adjustment_cents: number;
  remaining_cents: number;
  overpaid_cents: number;
  percent_paid: number;
  is_settled: boolean;
}

interface PlayerWithData extends Player {
  guardians: Guardian[];
  payments: Payment[];
  /** From player_balances() — the one balance function. Never recomputed here. */
  balance: PlayerBalanceRow | null;
  /** Every season this athlete has been part of, newest first. */
  seasons: SeasonBalance[];
  charges: PortalCharge[];
}

/** Roster money actually received. Never a counter — always the ledger. */
function rosterPaidCents(payments: { amount_cents: number; payment_category: string | null; status: string }[]): number {
  return payments
    .filter((p) => p.payment_category === "roster" && p.status === "completed")
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
}

export default function PortalContent({
  children,
  contacts = [],
  resources = null,
  classFees = {},
}: {
  /** Server-rendered rail sections (schedule, contacts). */
  children?: React.ReactNode;
  /** Published club contacts — who a family can send a question to. */
  contacts?: ClubContact[];
  /** Full-width resource tiles, rendered below the dashboard. */
  resources?: React.ReactNode;
  /** Season pricing by graduation year. Missing = not published for that class. */
  classFees?: Record<
    number,
    { tournamentCount: number; tournamentCents: number; summerTournamentCount: number | null }
  >;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [players, setPlayers] = useState<PlayerWithData[]>([]);
  const [guardian, setGuardian] = useState<ProfileGuardian | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // Sibling households only — which child's portal is on screen.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which season's money is on screen. Null = the newest one this athlete has.
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/data", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/fees");
          return;
        }
        if (!res.ok) {
          setLoadError("We couldn’t load your portal. Please refresh.");
          setStatus("error");
          return;
        }
        const data = (await res.json()) as {
          players: PlayerWithData[];
          guardian: ProfileGuardian | null;
        };
        if (cancelled) return;
        setPlayers(data.players ?? []);
        setGuardian(data.guardian ?? null);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setLoadError("Network error. Please refresh.");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, router]);

  // Bump to re-pull the portal after linking a new player.
  const reload = () => setReloadKey((k) => k + 1);

  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => {});
    router.replace("/fees");
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-sm text-[#9CA3AF]">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
            Something Went Wrong
          </h2>
          <p className="text-[#6B7280] mb-8 leading-relaxed">{loadError}</p>
          <a
            href={`mailto:${SITE_CONFIG.email}`}
            className="inline-block px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] transition-all duration-300 break-all"
          >
            Email {SITE_CONFIG.email}
          </a>
        </div>
      </div>
    );
  }

  // Signed in but not linked to any player yet → find-your-athlete picker.
  if (players.length === 0) {
    return (
      <>
        <PlayerPicker onLinked={reload} />
        <div className="text-center pb-12">
          <button
            onClick={signOut}
            className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-200 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </>
    );
  }

  // Prefer active athletes. If a household's only athlete has been retired we
  // still show her rather than dropping the family onto the "find your athlete"
  // picker.
  const activePlayers = players.filter((p) => p.status === "active");
  const shownPlayers = activePlayers.length > 0 ? activePlayers : players;
  const selectedPlayer =
    shownPlayers.find((p) => p.id === selectedId) ?? shownPlayers[0];

  const seasons = selectedPlayer.seasons ?? [];
  const activeSeason =
    seasons.find((s) => s.season === selectedSeason) ?? seasons[0] ?? null;

  // FeesPanel speaks player_balances()' shape. A season row carries the same
  // money fields, so it is adapted rather than duplicated — one set of numbers,
  // whichever season is on screen.
  const activeBalance: PlayerBalanceRow | null = activeSeason
    ? {
        player_id: selectedPlayer.id,
        plan_id: null,
        season: activeSeason.season,
        charged_cents: activeSeason.charged_cents,
        paid_cents: activeSeason.paid_cents,
        adjustment_cents: activeSeason.adjustment_cents,
        adjustment_reason: null,
        remaining_cents: activeSeason.remaining_cents,
        overpaid_cents: activeSeason.overpaid_cents,
        percent_paid: activeSeason.percent_paid,
        is_settled: activeSeason.is_settled,
        quarter_cents: 0,
        quarter_eligible: false,
      }
    : selectedPlayer.balance;

  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-10">
      <p className="section-label mb-5">Player Portal</p>

      {/* Sibling switcher — renders only when this session links to more than
          one athlete. Single-player families see no switcher and no change. */}
      <PlayerSwitcher
        players={shownPlayers}
        selectedId={selectedPlayer.id}
        onSelect={setSelectedId}
      />

      {/* THE DASHBOARD — three columns.
          LEFT   season switcher and section links. Season is a view control,
                 not content: putting it between the profile and the fees put a
                 band of chrome through the middle of the page and split the two
                 things a parent reads together.
          CENTRE who she is, then what she owes.
          RIGHT  the things she acts on once — flag a wrong number, subscribe,
                 find who to email.
          Resources run full width underneath, where a link to somewhere worth
          going has room to look like it.
          One column on a phone: nav, content, rail, resources. */}
      <div
        key={selectedPlayer.id}
        className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_320px] gap-6 lg:gap-8 items-start"
      >
        <PortalSideNav
          seasons={seasons}
          activeSeason={activeSeason?.season ?? null}
          onSelectSeason={setSelectedSeason}
          playerName={selectedPlayer.first_name}
        />

        <div className="space-y-6 min-w-0">
          <div id="profile" className="scroll-mt-24">
            <PlayerProfileTile
              player={selectedPlayer}
              guardian={guardian}
              coGuardians={selectedPlayer.guardians ?? []}
              onPlayerUpdated={(next) =>
                setPlayers((prev) =>
                  prev.map((p) => (p.id === next.id ? { ...p, ...next } : p))
                )
              }
              onGuardianUpdated={setGuardian}
              onCoGuardianAdded={reload}
            />
          </div>

          <div id="fees" className="scroll-mt-24">
            <FeesPanel
              playerId={selectedPlayer.id}
              balance={activeBalance}
              payments={selectedPlayer.payments}
              charges={selectedPlayer.charges}
              rosterPaidCents={rosterPaidCents(selectedPlayer.payments)}
              rosterDueCents={TICKET_AMOUNTS_CENTS.roster}
              fallTournamentCount={
                classFees[selectedPlayer.graduation_year]?.tournamentCount ?? null
              }
              fallTournamentCents={
                classFees[selectedPlayer.graduation_year]?.tournamentCents ?? 30000
              }
              summerTournamentCount={
                classFees[selectedPlayer.graduation_year]?.summerTournamentCount ?? null
              }
            />
          </div>
        </div>

        <aside className="space-y-5 min-w-0">
          <BalanceQuestion
            playerId={selectedPlayer.id}
            playerFirstName={selectedPlayer.first_name}
            contacts={contacts}
          />
          {children}
        </aside>
      </div>

      {resources}

      {/* Sign out */}
      <div className="text-center pt-12 mt-4 border-t border-[#E5E7EB]">
        <button
          onClick={signOut}
          className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-200 underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
