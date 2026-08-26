import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import { cookies } from "next/headers";
import PortalContent from "@/components/portal/PortalContent";
import PaymentBanner from "@/components/portal/PaymentBanner";
import { PORTAL_COOKIE_NAME, verifyPortalToken } from "@/lib/portal-session";
import RailCalendar from "@/components/portal/RailCalendar";
import RailContacts from "@/components/portal/RailContacts";
import { getEvents } from "@/lib/calendar";
import { getPublishedContacts } from "@/lib/club-contacts";
import { getFeeds } from "@/lib/events";
import { getClassFees, CURRENT_SEASON } from "@/lib/fee-schedule";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.youfirstlacrosse.com";

export const metadata: Metadata = {
  title: "Player Portal | YOU. FIRST Elite Lacrosse",
  description: "View your player's profile, payment history, and account details.",
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

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const store = await cookies();
  const session = verifyPortalToken(store.get(PORTAL_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/fees");
  }

  // Schedule, contacts, and the calendar feed. Each is independent of the
  // others and none of them is worth failing the portal over — a family who
  // came to check what she owes still gets that if the schedule query dies.
  const [events, contacts, feeds] = await Promise.all([
    getEvents().catch(() => []),
    getPublishedContacts().catch(() => []),
    getFeeds().catch(() => []),
  ]);

  // Season pricing for every class in the club. Cheap (one row per class) and
  // it means the portal never has to know which athlete it is about to render.
  const feeRows = await Promise.all(
    [2027, 2028, 2029, 2030, 2031, 2032, 2033].map((y) =>
      getClassFees(y, CURRENT_SEASON).catch(() => null),
    ),
  );
  const classFees = Object.fromEntries(
    feeRows
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((f) => [
        f.gradYear,
        { tournamentCount: f.tournamentCount, tournamentCents: f.tournamentCents },
      ]),
  );

  // The whole-club feed is the one with no team attached.
  const clubFeed = feeds.find((f) => f.teamId === null) ?? null;
  // webcal:// so a phone hands this to its calendar app instead of downloading
  // a file it has no idea what to do with.
  const subscribeUrl = clubFeed
    ? `webcal://${SITE_URL.replace(/^https?:\/\//, "")}/api/calendar/${clubFeed.token}.ics`
    : null;

  const params = await searchParams;
  const paidTicket = typeof params.paid === "string" ? params.paid : null;
  const canceledTicket = typeof params.canceled === "string" ? params.canceled : null;

  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main className="pt-20 pb-16 min-h-screen bg-background">
        {(paidTicket || canceledTicket) && (
          <PaymentBanner paid={paidTicket} canceled={canceledTicket} />
        )}
        <PortalContent contacts={contacts} classFees={classFees}>
          <RailCalendar subscribeUrl={subscribeUrl} nextUp={nextUpFrom(events)} />
          <RailContacts contacts={contacts} />
        </PortalContent>
      </main>
      <Footer />
    </>
  );
}
