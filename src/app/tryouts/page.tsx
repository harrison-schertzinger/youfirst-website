import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import TryoutsHero from "@/components/tryouts/TryoutsHero";
import TryoutDates from "@/components/tryouts/TryoutDates";
import TryoutMakeup from "@/components/tryouts/TryoutMakeup";
import TryoutBand from "@/components/tryouts/TryoutBand";
import TryoutForm from "@/components/tryouts/TryoutForm";

export const metadata: Metadata = {
  title: "2026 Tryouts | YOU. FIRST Elite Lacrosse",
  description:
    "Register for 2026 YOU. FIRST Elite Lacrosse tryouts at the Cincinnati Lacrosse Academy. Two dates — Youth (Saturday, July 11) and Older (Saturday, July 25), 5:00–6:30 PM — plus make-up tryouts through August 7. $50 secures your athlete's spot.",
  openGraph: {
    title: "2026 Tryouts | YOU. FIRST Elite Lacrosse",
    description:
      "Register for 2026 YOU. FIRST Elite Lacrosse tryouts. Scheduled dates by graduation year, plus make-up tryouts through August 7. $50 to secure her spot.",
    url: "https://youfirstlacrosse.com/tryouts",
  },
  alternates: { canonical: "/tryouts" },
};

export default async function TryoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === "1";

  return (
    <>
      <ScrollProgressBar />
      {/* Dark hero ⇒ default (white-text) navbar that flips dark on scroll */}
      <Navbar />
      <main>
        <TryoutsHero />
        <TryoutDates />
        <TryoutMakeup />
        <TryoutBand />
        <TryoutForm canceled={canceled} />
      </main>
      <Footer />
    </>
  );
}
