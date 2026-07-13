import type { Metadata } from "next";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ScrollReveal from "@/components/home/ScrollReveal";
import RosterConfirmForm from "@/components/roster/RosterConfirmForm";

// Families land here from the "she's in" text/email — not from site nav.
// Kept out of search results on purpose.
export const metadata: Metadata = {
  title: "Roster Confirmation | YOU. FIRST Elite Lacrosse",
  description:
    "She made the team — one quick step to lock her onto the You. First Elite Lacrosse roster.",
  robots: { index: false, follow: false },
};

export default function RosterPage() {
  return (
    <>
      <ScrollProgressBar />
      {/* Dark page ⇒ default (white-text) navbar that flips dark on scroll */}
      <Navbar />
      <main className="relative min-h-screen overflow-hidden bg-[#0A0A0B] pb-28 sm:pb-36">
        {/* B&W huddle photo — the homepage hero shot — dissolving into page
            black with no visible edge (same treatment as the tryout success
            top). Grayscale is pure CSS; the file is shared, not duplicated. */}
        <div className="absolute inset-x-0 top-0 h-[480px] sm:h-[640px]">
          <Image
            src="/images/team/DSC09932_Original.JPG"
            alt=""
            aria-hidden="true"
            fill
            priority
            className="object-cover object-[center_62%] grayscale"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,11,0.62) 0%, rgba(10,10,11,0.58) 14%, rgba(10,10,11,0.84) 36%, rgba(10,10,11,0.97) 56%, #0A0A0B 74%)",
            }}
          />
        </div>

        {/* Carolina glow — same atmosphere as the tryout register section */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 50% 14%, rgba(74,144,217,0.12), transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-[680px] px-6 pt-36 sm:pt-44">
          {/* ── Hero — she just made the team ─────────────────────────── */}
          <div className="text-center mb-12 sm:mb-14">
            <ScrollReveal>
              <p
                className="section-label mb-5"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
              >
                Welcome to the You. First Family
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h1 className="text-[2.5rem] md:text-[3.4rem] font-bold leading-[1.05] tracking-tight text-white mb-5">
                Lock Her <span className="gradient-text-blue">Spot.</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p
                className="text-lg text-white/60 leading-[1.7] max-w-[480px] mx-auto"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
              >
                Congratulations — she&apos;s in. One quick step to lock her onto
                the roster.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={150}>
            <RosterConfirmForm />
          </ScrollReveal>

          <p className="text-center text-[13px] text-white/35 mt-8">
            Questions? Email{" "}
            <a
              href="mailto:kathleen@youfirstlacrosse.com"
              className="text-white/55 hover:text-accent-blue transition-colors"
            >
              kathleen@youfirstlacrosse.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
