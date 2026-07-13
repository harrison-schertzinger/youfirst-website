import ThreeDoors from "@/components/shared/ThreeDoors";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import TryoutsHero from "@/components/tryouts/TryoutsHero";
import TryoutDates from "@/components/tryouts/TryoutDates";
import TryoutTeams from "@/components/tryouts/TryoutTeams";
import TryoutMakeup from "@/components/tryouts/TryoutMakeup";
import TryoutBand from "@/components/tryouts/TryoutBand";
import TryoutForm from "@/components/tryouts/TryoutForm";

export const metadata: Metadata = {
  title: "2026 Tryouts | YOU. FIRST Elite Lacrosse",
  description:
    "2026 YOU. FIRST Elite Lacrosse tryouts are completely free. The set tryout: Saturday, July 25, 5:00–6:30 PM at the Cincinnati Lacrosse Academy — all ages. Or free evaluations any morning through August 7.",
  openGraph: {
    title: "2026 Tryouts | YOU. FIRST Elite Lacrosse",
    description:
      "2026 YOU. FIRST Elite Lacrosse tryouts are completely free. Set tryout Saturday, July 25 (all ages), or free evaluations any morning through August 7.",
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
      <main className="bw-site">
        <TryoutsHero />
        <TryoutDates />
        <TryoutTeams />


        {/* More ways in — shared tiles (edit once in components/shared/ThreeDoors) */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <ThreeDoors />
          </div>
        </section>

        <TryoutMakeup />
        <TryoutBand />
        <TryoutForm canceled={canceled} />
      </main>
      <Footer />
    </>
  );
}
