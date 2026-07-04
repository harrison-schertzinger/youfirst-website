import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ScrollReveal from "@/components/home/ScrollReveal";
import ChatWidget from "@/components/getstarted/ChatWidget";
import ThreeDoors from "@/components/shared/ThreeDoors";
import GetStartedFaq from "@/components/getstarted/GetStartedFaq";

export const metadata: Metadata = {
  title: "Get Started | YOU. FIRST Elite Lacrosse",
  description:
    "There is always room for a great player. Tryouts are the front door, not the only door — here is how to find your place with You. First.",
};

export default function GetStartedPage() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main className="bw-site">
        {/* Hero — dark band, exact copy */}
        <section className="bg-[#0A0A0B] pt-40 pb-20 sm:pt-48 sm:pb-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
            <p className="section-label mb-5">Join You. First</p>
            <h1 className="text-[2.6rem] sm:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-[-0.025em] leading-[1.04] text-white">
              There is always room
              <span className="block">
                for <span className="gradient-text-blue">a great player.</span>
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/70 leading-[1.7] max-w-2xl mx-auto">
              Tryouts are the front door, not the only door. Wherever you are
              starting from, here is how to find your place with us.
            </p>
          </div>
        </section>

        {/* Ask us anything — chat */}
        <section className="py-20 sm:py-24 bg-surface scroll-mt-20" id="ask">
          <div className="mx-auto max-w-[880px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <p className="section-label mb-5">Ask Us Anything</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08]">
                  <span className="text-[#1A1A1A]">Straight answers,</span>{" "}
                  <span className="gradient-text-accent">instantly.</span>
                </h2>
                <p className="mt-5 text-[17px] sm:text-lg text-[#6B7280] leading-[1.8]">
                  Type a question and get a straight answer, instantly. Our
                  assistant knows the program, the levels, the season, and the
                  details.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <ChatWidget />
            </ScrollReveal>
          </div>
        </section>
        {/* Three doors — shared block (also on /tryouts) */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <ThreeDoors />
          </div>
        </section>

        <GetStartedFaq />

      </main>
      <Footer />
    </>
  );
}
