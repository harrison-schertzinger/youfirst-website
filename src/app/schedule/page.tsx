import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScheduleHero from "@/components/schedule/ScheduleHero";
import ScheduleContent from "@/components/schedule/ScheduleContent";
import { getEvents, getUnconfirmedEvents } from "@/lib/calendar";
import UndatedEvents from "@/components/schedule/UndatedEvents";

// Reads the events table on every request. The schedule changes and a stale
// page is a wrong page — a parent checking Saturday morning must see the
// cancellation the director entered an hour ago.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule | YOU. FIRST Elite Lacrosse",
  description:
    "Summer 2026 schedule for YOU. FIRST Elite Lacrosse — practices, tournaments, camps, showcases, and team events. Your single source of truth for the season.",
  openGraph: {
    title: "Schedule | YOU. FIRST Elite Lacrosse",
    description:
      "Summer 2026 schedule — practices, tournaments, camps, showcases, and team events.",
    images: [
      {
        url: "/images/og/youfirst-share.jpg",
        width: 1200,
        height: 630,
        alt: "You. First Elite Lacrosse — the team huddled arm-in-arm on the field",
      },
    ],
  },
};

export default async function SchedulePage() {
  // Dated and undated are fetched together but rendered apart: the grid can
  // only place something that has a date, and a committed tournament with no
  // date still has to be visible or the page reads as "no tournaments".
  const [events, undated] = await Promise.all([
    getEvents(),
    getUnconfirmedEvents().catch(() => []),
  ]);

  return (
    <>
      <Navbar />
      <main className="bw-site">
        <ScheduleHero />
        <ScheduleContent events={events} />
        <UndatedEvents events={undated} />
      </main>
      <Footer />
    </>
  );
}
