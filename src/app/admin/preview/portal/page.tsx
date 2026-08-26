import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BalanceQuestion from "@/components/portal/BalanceQuestion";
import PreviewDashboard from "@/components/portal/PreviewDashboard";
import { PreviewProvider } from "@/components/portal/PortalPreviewContext";
import RailCalendar from "@/components/portal/RailCalendar";
import RailContacts from "@/components/portal/RailContacts";
import ResourceTiles from "@/components/portal/ResourceTiles";
import { getEvents } from "@/lib/calendar";
import { getPublishedContacts } from "@/lib/club-contacts";
import { getPublishedResources } from "@/lib/club-resources";
import { getFeeds } from "@/lib/events";
import { getClassFees } from "@/lib/fee-schedule";

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

// Two seasons, so the toggle is real on this screen: last year settled, this
// year still owed. Shaped exactly like player_season_balances() rows.
const previewSeasons = [
  {
    season: "2026-27",
    charged_cents: 185000,
    paid_cents: 0,
    adjustment_cents: 0,
    remaining_cents: 185000,
    overpaid_cents: 0,
    percent_paid: 0,
    is_settled: false,
  },
  {
    season: "2025-26",
    charged_cents: 185000,
    paid_cents: 185000,
    adjustment_cents: 0,
    remaining_cents: 0,
    overpaid_cents: 0,
    percent_paid: 100,
    is_settled: true,
  },
];

/**
 * The next couple of Saturdays for the rail — whole days, not a flat count, so
 * a four-hour block never arrives with half of itself missing.
 */
function nextUpFrom(
  events: {
    id: string;
    title: string;
    startDate: string;
    startTime: string;
    endTime: string;
    eventType: import("@/lib/calendar").EventType;
    isAllDay: boolean;
  }[],
  maxDays = 2,
) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.startDate >= todayKey);
  const days = [...new Set(upcoming.map((e) => e.startDate))].slice(0, maxDays);
  return upcoming
    .filter((e) => days.includes(e.startDate))
    .map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      startTime: e.startTime,
      endTime: e.endTime,
      eventType: e.eventType,
      isAllDay: e.isAllDay,
    }));
}

export default async function PortalPreviewPage() {
  const [events, contacts, resources, feeds, previewFees] = await Promise.all([
    getEvents().catch(() => []),
    getPublishedContacts().catch(() => []),
    getPublishedResources().catch(() => []),
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

      <main className="pt-[84px] pb-14 min-h-screen bg-background">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6">
          
          <PreviewProvider value>
            <PreviewDashboard
              playerId={PREVIEW_PLAYER_ID}
              player={previewPlayer}
              seasons={previewSeasons}
              payments={previewPayments}
              fallTournamentCount={previewFees?.tournamentCount ?? null}
              fallTournamentCents={previewFees?.tournamentCents ?? 30000}
              summerTournamentCount={previewFees?.summerTournamentCount ?? null}
              rail={
                <>
                  <BalanceQuestion
                    playerId={PREVIEW_PLAYER_ID}
                    playerFirstName={previewPlayer.first_name}
                    contacts={contacts}
                  />
                  <RailCalendar
                    subscribeUrl={subscribeUrl}
                    events={nextUpFrom(events)}
                  />
                  <RailContacts contacts={contacts} />
                </>
              }
            />
          </PreviewProvider>

          <div className="mt-8">
            <ResourceTiles resources={resources} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
