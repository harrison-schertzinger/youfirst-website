"use client";

import { useState } from "react";
import SeasonTabs from "./SeasonTabs";
import FeesPanel from "./FeesPanel";
import type { SeasonBalance } from "./PortalContent";
import type { PlayerBalanceRow } from "@/lib/portal-balance";
import type { PortalPayment } from "@/lib/portal-tickets";

/**
 * The season toggle plus the fees panel, for the admin preview.
 *
 * Mirrors what PortalContent does for a real family — the tabs own the season,
 * the panel renders whichever one is selected — so the preview shows the real
 * behaviour and not a screenshot of it. Checkout stays disabled by the preview
 * context supplied further up the page.
 */
export default function PreviewFees({
  playerId,
  seasons,
  payments,
  fallTournamentCount,
  fallTournamentCents,
}: {
  playerId: string;
  seasons: SeasonBalance[];
  payments: PortalPayment[];
  fallTournamentCount: number | null;
  fallTournamentCents: number;
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
    <>
      <SeasonTabs
        seasons={seasons}
        activeSeason={active.season}
        onSelect={setSelected}
      />
      <FeesPanel
        playerId={playerId}
        balance={balance}
        payments={payments.filter((p) => p.season === active.season)}
        charges={[]}
        rosterPaidCents={active.season === "2025-26" ? 20000 : 0}
        rosterDueCents={20000}
        fallTournamentCount={fallTournamentCount}
        fallTournamentCents={fallTournamentCents}
      />
    </>
  );
}
