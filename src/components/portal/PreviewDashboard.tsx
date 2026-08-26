"use client";

import { useState } from "react";
import PortalSideNav from "./PortalSideNav";
import PlayerProfileTile, {
  type ProfilePlayer,
} from "./PlayerProfileTile";
import FeesPanel from "./FeesPanel";
import type { SeasonBalance } from "./PortalContent";
import type { PlayerBalanceRow } from "@/lib/portal-balance";
import type { PortalPayment } from "@/lib/portal-tickets";

/**
 * The dashboard's three columns, for the admin preview.
 *
 * Mirrors what PortalContent renders for a real family — left rail owns the
 * season, centre shows who she is and what she owes — so this screen shows the
 * real behaviour rather than a picture of it. Every write is disabled by
 * `preview`, which is threaded down and also supplied as context further up the
 * page for the components in the right rail.
 */
export default function PreviewDashboard({
  playerId,
  player,
  seasons,
  payments,
  fallTournamentCount,
  fallTournamentCents,
  summerTournamentCount,
  rail,
}: {
  playerId: string;
  player: ProfilePlayer;
  seasons: SeasonBalance[];
  payments: PortalPayment[];
  fallTournamentCount: number | null;
  fallTournamentCents: number;
  summerTournamentCount: number | null;
  rail: React.ReactNode;
}) {
  const [selected, setSelected] = useState(seasons[0]?.season ?? "");
  const active = seasons.find((s) => s.season === selected) ?? seasons[0];

  const balance: PlayerBalanceRow = {
    player_id: playerId,
    plan_id: null,
    season: active.season,
    charged_cents: active.charged_cents,
    paid_cents: active.paid_cents,
    adjustment_cents: active.adjustment_cents,
    adjustment_reason: null,
    remaining_cents: active.remaining_cents,
    overpaid_cents: active.overpaid_cents,
    percent_paid: active.percent_paid,
    is_settled: active.is_settled,
    quarter_cents: 0,
    quarter_eligible: false,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_320px] gap-6 lg:gap-8 items-start">
      <PortalSideNav
        seasons={seasons}
        activeSeason={active.season}
        onSelectSeason={setSelected}
        playerName={player.first_name}
      />

      <div className="space-y-6 min-w-0">
        <div id="profile" className="scroll-mt-24">
          <PlayerProfileTile
            player={player}
            guardian={{
              id: "preview",
              first_name: "Dana",
              last_name: "Sample",
              email: "dana.sample@example.com",
              phone: null,
              relationship: "Mother",
            }}
            coGuardians={[
              {
                id: "preview-1",
                first_name: "Dana",
                last_name: "Sample",
                relationship: "Mother",
              },
            ]}
            onPlayerUpdated={() => {}}
            onGuardianUpdated={() => {}}
            preview
          />
        </div>

        <div id="fees" className="scroll-mt-24">
          <FeesPanel
            playerId={playerId}
            balance={balance}
            payments={payments.filter((p) => p.season === active.season)}
            charges={[]}
            rosterPaidCents={active.season === "2025-26" ? 20000 : 0}
            rosterDueCents={20000}
            fallTournamentCount={fallTournamentCount}
            fallTournamentCents={fallTournamentCents}
            summerTournamentCount={summerTournamentCount}
          />
        </div>
      </div>

      <aside className="space-y-5 min-w-0">{rail}</aside>
    </div>
  );
}
