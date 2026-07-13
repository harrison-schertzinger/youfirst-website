import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScheduleHero from "@/components/schedule/ScheduleHero";
import ScheduleContent from "@/components/schedule/ScheduleContent";
import { getEvents } from "@/lib/calendar";

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
  const events = await getEvents();

  return (
    <>
      <Navbar />
      <main className="bw-site">
        <ScheduleHero />
        <ScheduleContent events={events} />
      </main>
      <Footer />
    </>
  );
}
