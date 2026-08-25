import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import { cookies } from "next/headers";
import PortalContent from "@/components/portal/PortalContent";
import PaymentBanner from "@/components/portal/PaymentBanner";
import { PORTAL_COOKIE_NAME, verifyPortalToken } from "@/lib/portal-session";
import PortalSchedule from "@/components/portal/PortalSchedule";
import PortalContacts from "@/components/portal/PortalContacts";
import { getEvents, getUnconfirmedEvents } from "@/lib/calendar";
import { getPublishedContacts } from "@/lib/club-contacts";
import { getFeeds, getTeams } from "@/lib/events";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.youfirstlacrosse.com";

export const metadata: Metadata = {
  title: "Player Portal | YOU. FIRST Elite Lacrosse",
  description: "View your player's profile, payment history, and account details.",
};

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
  const [events, undated, contacts, feeds, teams] = await Promise.all([
    getEvents().catch(() => []),
    getUnconfirmedEvents().catch(() => []),
    getPublishedContacts().catch(() => []),
    getFeeds().catch(() => []),
    getTeams().catch(() => []),
  ]);

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
        <PortalContent>
          <PortalSchedule
            events={events}
            undated={undated}
            subscribeUrl={subscribeUrl}
            teamCount={teams.length}
          />
          <PortalContacts contacts={contacts} />
        </PortalContent>
      </main>
      <Footer />
    </>
  );
}
