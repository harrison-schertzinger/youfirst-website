import type { Metadata } from "next";
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
              <p className="section-label mb-5">She Made It</p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h1 className="text-[2.5rem] md:text-[3.4rem] font-bold leading-[1.05] tracking-tight text-white mb-5">
                Lock Her <span className="gradient-text-blue">Spot.</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p className="text-lg text-white/60 leading-[1.7] max-w-[480px] mx-auto">
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
