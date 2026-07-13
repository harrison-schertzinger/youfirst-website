import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ScrollReveal from "@/components/home/ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";
import ThreeResources from "@/components/home/ThreeResources";

export const metadata: Metadata = {
  title: "Teams | YOU. FIRST Elite Lacrosse",
  description:
    "Built to develop and compete. Development (classes 2032 & 2033 — 2034s who are ready can play up) and Elite (classes 2028–2031) — every price published.",
};

interface PriceOption {
  label?: string;
  monthly: string;
  /** Small word beside the big number, e.g. "all-in". */
  suffix?: string;
  detail: string;
}

interface Team {
  name: string;
  grades: string;
  /** Optional prominent start line, styled like the grades line. */
  startLine?: string;
  slot: string;
  who: string;
  /** Paragraph form (Elite). */
  included?: string;
  /** Blunt, scannable list form (Development). */
  logistics?: { label: string; items: string[]; footnote: string };
  prices: PriceOption[] | null;
  priceNote?: string;
}

const TEAMS: Team[] = [
  {
    name: "Development",
    grades: "Classes 2032 & 2033 · 2034s who are ready can play up.",
    startLine:
      "First tournaments next June. Training starts this September at the Cincinnati Lacrosse Academy and builds all the way to summer.",
    slot: "levels-jumpstart.jpg",
    who: "Players building their foundation and falling in love with the game, whether she is brand new or already has a few seasons in. We want as many young players as want to come. This is where the area's lacrosse gets built.",
    logistics: {
      label: "Logistics to Start",
      items: [
        "Three tournaments in June",
        "Two practices a week",
        "Evening small-group sessions with our college coaches and players",
      ],
      footnote:
        "The focus is development. For players in fall and winter sports, the weekend practice blocks and training times are optional — purely for development, never required.",
    },
    prices: [
      {
        monthly: "$700",
        suffix: "all-in",
        detail:
          "Includes gear, private small-group college-coach sessions, training that starts this September, and three tournaments next June.",
      },
    ],
  },
  {
    name: "Elite",
    grades: "Rising 8th grade and up · Classes 2028–2031",
    slot: "levels-elite.jpg",
    who: "Players building toward college lacrosse and ready for the full competitive experience.",
    included:
      "The complete competitive team on the national circuit, development aimed squarely at the college path, our college-player coaches every step of the way.",
    prices: null,
    priceNote:
      "Team price is set individually and shared before you commit. Just ask.",
  },
];

const ROSTER_STEPS = [
  {
    title: "Tryouts & evaluations.",
    body: "Free evaluations at the Cincinnati Lacrosse Academy, every morning through August 7 — evaluated on the spot, hear that day. Or our one set tryout date: Saturday, July 25. It's about placement, finding each player her right team so she can develop and play.",
  },
  {
    title: "Notification.",
    body: "Evaluations hear the same day. July 25 tryout families hear from us within two to three days.",
  },
  {
    title: "Roster confirmation.",
    body: "Once she's in, you'll get a roster confirmation link to lock her spot — quick and free. Fees can be paid monthly or in full, with dates set at confirmation so you always know what is due.",
  },
  {
    title: "The season begins.",
    body: "Elite practice opportunities start in mid-August. Development's optional training starts this September and builds all the way to the June tournaments.",
  },
];

export default function LevelsPage() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main className="bw-site">
        {/* The teams — the page opens right here */}
        <section className="pt-32 sm:pt-40 pb-20 sm:pb-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8 space-y-8">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto">
                <p className="section-label mb-5">The Teams · Classes 2028–2034</p>
                <h1 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                  Built to <span className="gradient-text-accent">develop and compete.</span>
                </h1>
                <p className="mt-5 text-lg text-[#6B7280] leading-[1.75]">
                  One team per age group — 34s who are ready can play up.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {["6v6", "Stick skills", "Fundamentals", "Learning to love to compete"].map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-2.5 rounded-xl bg-white border border-[#E5E8EC] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-5 py-3 text-[15px] font-semibold text-[#1A1A1A]"
                    >
                      <span className="w-2 h-2 rounded-full bg-accent-blue" aria-hidden="true" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            {TEAMS.map((team, i) => (
              <ScrollReveal key={team.name} delay={i * 100}>
                <div className="card overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-5 lg:min-h-[594px]">
                    <div className="relative h-56 sm:h-64 lg:h-auto lg:col-span-2 keep-color">
                      <PhotoSlot
                        name={team.slot}
                        alt={`${team.name} — ${team.grades}`}
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                    </div>
                    <div className="lg:col-span-3 p-7 sm:p-10">
                      <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.015em]">
                        <span className="gradient-text-accent">{team.name}</span>
                      </h2>
                      <p className="mt-2 text-sm font-medium text-[#6B7280]">{team.grades}</p>
                      {team.startLine && (
                        <p className="mt-1.5 text-sm font-medium text-[#1A1A1A]">
                          {team.startLine}
                        </p>
                      )}

                      <div className="mt-6 space-y-5">
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5">
                            Who it&apos;s for
                          </p>
                          <p className="text-[15px] text-[#6B7280] leading-[1.75]">{team.who}</p>
                        </div>
                        {team.included && (
                          <div>
                            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5">
                              What&apos;s included
                            </p>
                            <p className="text-[15px] text-[#6B7280] leading-[1.75]">
                              {team.included}
                            </p>
                          </div>
                        )}
                        {team.logistics && (
                          <div>
                            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5">
                              {team.logistics.label}
                            </p>
                            <ul className="space-y-2">
                              {team.logistics.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2.5 text-[15px] font-medium text-[#1A1A1A] leading-[1.6]"
                                >
                                  <span
                                    className="flex-shrink-0 w-2 h-2 rounded-full bg-accent-blue mt-[7px]"
                                    aria-hidden="true"
                                  />
                                  {item}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-[15px] text-[#6B7280] leading-[1.75]">
                              {team.logistics.footnote}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Pricing — the all-in number is the hero */}
                      <div className="mt-7 pt-6 border-t border-[#E5E8EC]">
                        {team.prices ? (
                          <div className={`grid gap-5 ${team.prices.length > 1 ? "sm:grid-cols-2" : ""}`}>
                            {team.prices.map((p) => (
                              <div key={p.monthly}>
                                {p.label && (
                                  <p className="text-[13px] font-semibold text-[#1A1A1A] mb-1">
                                    {p.label}
                                  </p>
                                )}
                                <p className="text-4xl sm:text-[2.75rem] leading-none font-extrabold tracking-[-0.02em] text-accent-blue tabular-nums">
                                  {p.monthly}
                                  {p.suffix && (
                                    <span className="text-xl font-bold text-[#6B7280]">
                                      {" "}
                                      {p.suffix}
                                    </span>
                                  )}
                                </p>
                                <p className="mt-2 text-[13px] text-[#9CA3AF] leading-[1.6]">
                                  {p.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[15px] text-[#6B7280]">{team.priceNote}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* The proof — credibility, infographic treatment */}
        <section
          className="py-24 sm:py-28 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0A0A0B 0%, #0E1C28 45%, #1F4E75 100%)" }}
        >
          <div className="mx-auto max-w-[1080px] px-6 lg:px-8 text-center">
            <ScrollReveal>
              <p className="section-label mb-5">The Proof</p>
              <h2 className="text-[2.25rem] sm:text-[3rem] lg:text-[3.5rem] font-bold tracking-tight leading-[1.06] text-white max-w-4xl mx-auto">
                We trained 7 of the region&apos;s 8{" "}
                <span className="gradient-text-blue">High School All-Americans.</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <div className="mt-10 flex justify-center gap-3 sm:gap-4" aria-label="7 of 8 All-Americans">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center ${
                      i < 7 ? "" : "border-2 border-white/20"
                    }`}
                    style={
                      i < 7
                        ? { background: "linear-gradient(135deg, #4B9CD3 0%, #9CC5EF 70%, #FFFFFF 130%)" }
                        : undefined
                    }
                  >
                    {i < 7 ? (
                      <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8" fill="none" aria-hidden="true">
                        <path d="M5 13l5 5 9-11" stroke="#0A0A0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white/25" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[15px] sm:text-base text-white/65 leading-[1.7]">
                Up from 5 of 8 the year before, plus 3 more from out of state.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={220}>
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="rounded-2xl bg-white/[0.07] border border-white/12 px-6 py-7">
                  <p className="text-4xl font-extrabold tracking-tight text-white [font-feature-settings:'tnum']">30+</p>
                  <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">College commitments</p>
                </div>
                <div className="rounded-2xl bg-white/[0.07] border border-white/12 px-6 py-7">
                  <p className="text-4xl font-extrabold tracking-tight text-white [font-feature-settings:'tnum']">20+</p>
                  <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">College programs</p>
                </div>
                <div className="rounded-2xl bg-white/[0.07] border border-white/12 px-6 py-7">
                  <p className="text-4xl font-extrabold tracking-tight gradient-text-blue">Every coach</p>
                  <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">Is a college player</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* The resources — we build these */}
        <ThreeResources
          eyebrow="The Resources"
          headingStart="We build"
          headingFade="the resources."
          sub="We're the team behind the Cincinnati Lacrosse Academy and the creators of YOU.PRJCT+. Our focus is building the very resources that develop great players and well-developed people."
        />

        <section className="py-20 sm:py-24 bg-surface">
          <div className="mx-auto max-w-[880px] px-6 lg:px-8 text-center">
            <ScrollReveal>
              <p className="section-label mb-5">The Season · June Through February</p>
              <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                Year round, <span className="gradient-text-accent">on her terms.</span>
              </h2>
              <p className="mt-6 text-[17px] sm:text-lg text-[#6B7280] leading-[1.85]">
                Our season runs year round, from summer into winter, so players
                always have the chance to train and compete. We publish
                practice time blocks and treat them as opportunities, not
                requirements. The schedule is built to work around other
                sports, and we want her to keep playing them. Send us the
                conflicts and we get ahead of them together. Outside of holiday
                weekends there is typically practice every weekend, with two to
                three sessions a week through the summer, all at the Cincinnati
                Lacrosse Academy.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* From tryout to roster */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[880px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="section-label mb-5">From Tryout to Roster</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                  Four steps, <span className="gradient-text-accent">no surprises.</span>
                </h2>
              </div>
            </ScrollReveal>
            <div className="space-y-4">
              {ROSTER_STEPS.map((step, i) => (
                <ScrollReveal key={step.title} delay={i * 100}>
                  <div className="card p-6 sm:p-7 flex items-start gap-5">
                    <span className="flex-shrink-0 w-11 h-11 rounded-full border-2 border-accent-blue text-accent-blue font-bold text-base flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="pt-1">
                      <h3 className="text-lg font-bold text-[#1A1A1A]">{step.title}</h3>
                      <p className="mt-1.5 text-[15px] text-[#6B7280] leading-[1.75]">{step.body}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <ScrollReveal>
              <div className="mt-11 flex flex-wrap justify-center gap-4">
                <Link
                  href="/tryouts"
                  className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300"
                >
                  Register for Tryouts — Free
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-accent-blue text-accent-blue text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-accent-wash hover:-translate-y-0.5 transition-all duration-300"
                >
                  Visit Our Website
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
