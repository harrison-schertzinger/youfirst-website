import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PlayerCard from "@/components/portal/PlayerCard";
import PlayerProfileCardPreview from "@/components/portal/PlayerProfileCardPreview";
import PaymentDashboard from "@/components/portal/PaymentDashboard";
import PortalSchedule from "@/components/portal/PortalSchedule";
import PortalContacts from "@/components/portal/PortalContacts";
import { getEvents, getUnconfirmedEvents } from "@/lib/calendar";
import { getPublishedContacts } from "@/lib/club-contacts";
import { getFeeds, getTeams } from "@/lib/events";
import type { PlayerBalanceRow } from "@/lib/portal-balance";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.youfirstlacrosse.com";

/**
 * What a parent sees — with a made-up athlete.
 *
 * Admin-gated (src/app/admin/layout.tsx checks the allowlist before this
 * renders) and rendered WITHOUT the admin sidebar, because a portal squeezed
 * into an admin shell is not a preview of anything.
 *
 * THE ATHLETE AND THE MONEY BELOW ARE INVENTED. No real family appears here.
 * Every button that would spend money or write to the database is disabled by
 * the `preview` prop — a click cannot reach Stripe with an id that does not
 * exist. The schedule and contacts ARE live, because those are the same for
 * every family and seeing the real ones is the point.
 *
 * Across real families only two things differ from this: the graduation year
 * and the fee amounts.
 */

const PREVIEW_PLAYER_ID = "00000000-0000-0000-0000-000000000000";

const previewPlayer = {
  id: PREVIEW_PLAYER_ID,
  first_name: "Avery",
  last_name: "Sample",
  graduation_year: 2029,
  position: "Midfield",
  jersey_number: "17",
  photo_url: null,
  team_name: "You. First Elite",
  status: "active",
  shirt_size: "M",
  short_size: "M",
  sweatshirt_size: "L",
  shooting_shirt_size: "M",
};

const previewPayments = [
  {
    id: "prev-1",
    amount_cents: 20000,
    payment_method: "card",
    payment_category: "roster",
    description: "Roster fee",
    payment_date: "2026-06-02",
    season: "2025-26",
    status: "completed",
  },
  {
    id: "prev-2",
    amount_cents: 92500,
    payment_method: "card",
    payment_category: "summer",
    description: "Summer tuition — first payment",
    payment_date: "2026-06-02",
    season: "2025-26",
    status: "completed",
  },
];

// Shaped exactly like a player_balances() row so the dashboard renders the same
// arithmetic it would for a real family: $1,850 charged, $925 paid, $925 left.
const previewBalance: PlayerBalanceRow = {
  player_id: PREVIEW_PLAYER_ID,
  plan_id: "prev-plan",
  season: "2025-26",
  charged_cents: 185000,
  paid_cents: 92500,
  adjustment_cents: 0,
  adjustment_reason: null,
  remaining_cents: 92500,
  overpaid_cents: 0,
  percent_paid: 50,
  is_settled: false,
  quarter_cents: 46250,
  quarter_eligible: true,
};

export default async function PortalPreviewPage() {
  const [events, undated, contacts, feeds, teams] = await Promise.all([
    getEvents().catch(() => []),
    getUnconfirmedEvents().catch(() => []),
    getPublishedContacts().catch(() => []),
    getFeeds().catch(() => []),
    getTeams().catch(() => []),
  ]);

  const clubFeed = feeds.find((f) => f.teamId === null) ?? null;
  const subscribeUrl = clubFeed
    ? `webcal://${SITE_URL.replace(/^https?:\/\//, "")}/api/calendar/${clubFeed.token}.ics`
    : null;

  return (
    <>
      <div className="sticky top-0 z-50 bg-[#0A0A0B] text-white px-6 py-3">
        <div className="mx-auto max-w-[1280px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="font-semibold uppercase tracking-[0.12em] text-[#4B9CD3]">
            Preview
          </span>
          <span className="text-white/80">
            Avery Sample is invented. Payments and saving are disabled.
          </span>
          <a
            href="/admin"
            className="ml-auto underline underline-offset-2 text-white/70 hover:text-white transition-colors"
          >
            Back to the Command Center
          </a>
        </div>
      </div>

      <Navbar initialTheme="light" />

      <main className="pt-20 pb-16 min-h-screen bg-background">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-12">
          <div className="mb-12">
            <p className="section-label mb-3">Player Portal</p>
            <h1 className="text-[2rem] md:text-[2.5rem] font-bold tracking-tight leading-[1.1] text-[#1A1A1A]">
              Welcome back
            </h1>
          </div>

          <div className="mb-16">
            <PlayerCard player={previewPlayer} />
            <PlayerProfileCardPreview player={previewPlayer} />
            <PaymentDashboard
              playerId={PREVIEW_PLAYER_ID}
              playerFirstName={previewPlayer.first_name}
              payments={previewPayments}
              balance={previewBalance}
              charges={[]}
              preview
            />
          </div>

          <PortalSchedule
            events={events}
            undated={undated}
            subscribeUrl={subscribeUrl}
            teamCount={teams.length}
          />
          <PortalContacts contacts={contacts} />
        </div>
      </main>

      <Footer />
    </>
  );
}
