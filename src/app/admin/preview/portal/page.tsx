import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PlayerHeader from "@/components/portal/PlayerHeader";
import BalanceQuestion from "@/components/portal/BalanceQuestion";
import PlayerProfileCardPreview from "@/components/portal/PlayerProfileCardPreview";
import FeesPanel from "@/components/portal/FeesPanel";
import { PreviewProvider } from "@/components/portal/PortalPreviewContext";
import RailCalendar from "@/components/portal/RailCalendar";
import RailContacts from "@/components/portal/RailContacts";
import { getEvents } from "@/lib/calendar";
import { getPublishedContacts } from "@/lib/club-contacts";
import { getFeeds } from "@/lib/events";
import { getClassFees } from "@/lib/fee-schedule";
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

/** The next few dated events, formatted for the rail. */
function nextUpFrom(
  events: { id: string; title: string; startDate: string; startTime: string; isAllDay: boolean }[],
  limit = 3,
) {
  const todayKey = new Date().toISOString().slice(0, 10);
  return events
    .filter((e) => e.startDate >= todayKey)
    .slice(0, limit)
    .map((e) => {
      const d = new Date(`${e.startDate}T12:00:00`);
      return {
        id: e.id,
        title: e.title,
        when: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    });
}

export default async function PortalPreviewPage() {
  const [events, contacts, feeds, previewFees] = await Promise.all([
    getEvents().catch(() => []),
    getPublishedContacts().catch(() => []),
    getFeeds().catch(() => []),
    // Avery is a 2029 — her class's real published pricing, not invented.
    getClassFees(previewPlayer.graduation_year).catch(() => null),
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
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-10">
          <p className="section-label mb-5">Player Portal</p>

          <PreviewProvider value>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              <div className="lg:col-span-2 space-y-6 min-w-0">
                <PlayerHeader player={previewPlayer} />
                <FeesPanel
                  playerId={PREVIEW_PLAYER_ID}
                  balance={previewBalance}
                  payments={previewPayments}
                  charges={[]}
                  rosterPaidCents={20000}
                  rosterDueCents={20000}
                  fallTournamentCount={previewFees?.tournamentCount ?? null}
                  fallTournamentCents={previewFees?.tournamentCents ?? 30000}
                />
                <PlayerProfileCardPreview player={previewPlayer} />
              </div>

              <aside className="lg:col-span-1 space-y-5 min-w-0">
                <BalanceQuestion
                  playerId={PREVIEW_PLAYER_ID}
                  playerFirstName={previewPlayer.first_name}
                  contacts={contacts}
                />
                <RailCalendar
                  subscribeUrl={subscribeUrl}
                  nextUp={nextUpFrom(events)}
                />
                <RailContacts contacts={contacts} />
              </aside>
            </div>
          </PreviewProvider>
        </div>
      </main>

      <Footer />
    </>
  );
}
