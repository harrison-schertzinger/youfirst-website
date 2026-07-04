import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ScrollReveal from "@/components/home/ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";

export const metadata: Metadata = {
  title: "Levels | YOU. FIRST Elite Lacrosse",
  description:
    "One path. Every level. Jumpstart, Launch, and Elite — from her first season to the national stage, with every price published.",
};

// ── Clean Carolina progression mark: JUMPSTART → LAUNCH → ELITE ──
function LevelsPath() {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <svg
        viewBox="0 0 1100 190"
        className="w-full min-w-[640px] h-auto"
        role="img"
        aria-label="The path: Jumpstart, then Launch, then Elite"
      >
        <path
          d="M60 150 H360 L440 95 H700 L780 40 H1040"
          stroke="#4B9CD3"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        {[
          { x: 210, y: 150, name: "JUMPSTART", sub: "Rising 3rd–6th" },
          { x: 570, y: 95, name: "LAUNCH", sub: "Rising 7th" },
          { x: 910, y: 40, name: "ELITE", sub: "Rising 8th+" },
        ].map((s) => (
          <g key={s.name}>
            <circle cx={s.x} cy={s.y} r="10" fill="#FFFFFF" stroke="#4B9CD3" strokeWidth="3" />
            <circle cx={s.x} cy={s.y} r="3.5" fill="#4B9CD3" />
            <text
              x={s.x}
              y={s.y - 24}
              textAnchor="middle"
              fontSize="19"
              fontWeight="800"
              letterSpacing="2"
              fill="#1A1A1A"
              fontFamily="inherit"
            >
              {s.name}
            </text>
            <text
              x={s.x}
              y={s.y + 34}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="500"
              fill="#6B7280"
              fontFamily="inherit"
            >
              {s.sub}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

interface PriceOption {
  label?: string;
  monthly: string;
  detail: string;
}

interface Level {
  eyebrow: string;
  name: string;
  grades: string;
  slot: string;
  who: string;
  included: string;
  prices: PriceOption[] | null;
  priceNote?: string;
}

const LEVELS: Level[] = [
  {
    eyebrow: "Level 1",
    name: "Jumpstart",
    grades: "Rising 3rd through 6th grade · Classes 2033 to 2036",
    slot: "levels-jumpstart.jpg",
    who: "Players building their foundation and falling in love with the game, whether she is brand new or already has a few seasons in. We want as many young players as want to come. This is where the area's lacrosse gets built.",
    included:
      "Fundamentals-first coaching from our college-player staff, maximum touches, and 6v6 on the weekends, all at the Cincinnati Lacrosse Academy. Develop, compete, and have a lot of fun.",
    prices: [
      {
        label: "Rising 3rd–4th (2035–2036)",
        monthly: "$135/mo",
        detail: "$200 to reserve her spot · $1,000 for the year, all-in",
      },
      {
        label: "Rising 5th–6th (2033–2034)",
        monthly: "$167/mo",
        detail:
          "$200 to reserve her spot · $1,200 for the year, all-in · adds the local tournament slate",
      },
    ],
  },
  {
    eyebrow: "Level 2",
    name: "Launch",
    grades: "Rising 7th grade · Class 2032",
    slot: "levels-launch.jpg",
    who: "Players ready to take off. The bridge between building her game and competing on a bigger stage.",
    included:
      "Everything Jumpstart does, plus her first travel tournament out East. Coaching, practices at the Academy, weekend 6v6, and the full tournament slate.",
    prices: [
      {
        monthly: "$175/mo",
        detail:
          "$200 to reserve her spot · $1,250 for the year, all-in · plus about $300 for the July travel weekend out East (Maryland Cup or Mid-Atlantic)",
      },
    ],
  },
  {
    eyebrow: "Level 3",
    name: "Elite",
    grades: "Rising 8th grade and up · Classes 2031 and older",
    slot: "levels-elite.jpg",
    who: "Players building toward college lacrosse and ready for the full competitive experience.",
    included:
      "The complete competitive team on the national circuit, development aimed squarely at the college path, our college-player coaches every step of the way.",
    prices: null,
    priceNote: "Set individually and shared before you commit. Just ask.",
  },
];

const ROSTER_STEPS = [
  {
    title: "Tryouts.",
    body: "Saturday, July 11 at the Cincinnati Lacrosse Academy. Tryouts are about placement, finding each player her right level so she can develop and play.",
  },
  {
    title: "Notification.",
    body: "Families hear from us within two to three days.",
  },
  {
    title: "Reserve her spot.",
    body: "A $200 confirmation secures her place. The rest is all-in and can be paid monthly or in full, with dates set at confirmation so you always know what is due.",
  },
  {
    title: "The season begins.",
    body: "Practice opportunities start in mid-August and run through February.",
  },
];

export default function LevelsPage() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main className="bw-site">
        {/* Hero — dark, matching the site's premium bands */}
        <section className="bg-[#0A0A0B] pt-40 pb-20 sm:pt-48 sm:pb-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
            <h1 className="text-[2.75rem] sm:text-[4rem] lg:text-[5rem] font-extrabold tracking-[-0.025em] leading-[1.02] text-white">
              One path. <span className="gradient-text-blue">Every level.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/70 leading-[1.7] max-w-2xl mx-auto">
              From her first season to the national stage, You. First is built
              to develop her fully, wherever she is starting from.
            </p>
          </div>
        </section>

        {/* Intro + progression mark */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[1080px] px-6 lg:px-8">
            <ScrollReveal>
              <p className="text-[17px] sm:text-lg text-[#6B7280] leading-[1.85] max-w-3xl mx-auto text-center">
                Our commitment is to build the best players, compete at the
                biggest events, and permanently transform the culture of
                lacrosse in this area. This is for players who want to be
                great. Wherever she is starting from, if she is willing to
                work, there is a place for her here.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="mt-14">
                <LevelsPath />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* The three levels */}
        <section className="pb-20 sm:pb-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8 space-y-8">
            {LEVELS.map((level, i) => (
              <ScrollReveal key={level.name} delay={i * 100}>
                <div className="card overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-5 lg:min-h-[594px]">
                    <div className="relative h-56 sm:h-64 lg:h-auto lg:col-span-2 keep-color">
                      <PhotoSlot
                        name={level.slot}
                        alt={`${level.name} — ${level.grades}`}
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                    </div>
                    <div className="lg:col-span-3 p-7 sm:p-10">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent-blue">
                        {level.eyebrow}
                      </p>
                      <h2 className="mt-1.5 text-3xl sm:text-4xl font-bold tracking-[-0.015em]">
                        <span className="gradient-text-accent">{level.name}</span>
                      </h2>
                      <p className="mt-2 text-sm font-medium text-[#6B7280]">{level.grades}</p>

                      <div className="mt-6 space-y-5">
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5">
                            Who it&apos;s for
                          </p>
                          <p className="text-[15px] text-[#6B7280] leading-[1.75]">{level.who}</p>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-1.5">
                            What&apos;s included
                          </p>
                          <p className="text-[15px] text-[#6B7280] leading-[1.75]">
                            {level.included}
                          </p>
                        </div>
                      </div>

                      {/* Pricing — monthly is the hero number */}
                      <div className="mt-7 pt-6 border-t border-[#E5E8EC]">
                        {level.prices ? (
                          <div className={`grid gap-5 ${level.prices.length > 1 ? "sm:grid-cols-2" : ""}`}>
                            {level.prices.map((p) => (
                              <div key={p.monthly}>
                                {p.label && (
                                  <p className="text-[13px] font-semibold text-[#1A1A1A] mb-1">
                                    {p.label}
                                  </p>
                                )}
                                <p className="text-4xl sm:text-[2.75rem] leading-none font-extrabold tracking-[-0.02em] text-accent-blue tabular-nums">
                                  {p.monthly}
                                </p>
                                <p className="mt-2 text-[13px] text-[#9CA3AF] leading-[1.6]">
                                  {p.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[15px] text-[#6B7280]">{level.priceNote}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* The Season */}
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

        {/* Tournaments by level */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[880px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center mb-10">
                <p className="section-label mb-5">Tournaments by Level</p>
                <p className="text-[17px] sm:text-lg text-[#6B7280] leading-[1.8] max-w-2xl mx-auto">
                  The whole point at this level is reps, so players play as
                  much as possible.
                </p>
              </div>
            </ScrollReveal>
            <div className="space-y-3.5">
              {[
                ["All levels", "6v6 on the weekends through the summer and fall."],
                ["Summer", "At least three tournaments, local or nearby."],
                ["Fall", "One to two tournaments on weekends, local or nearby."],
                [
                  "Launch",
                  "One weekend in July, the team travels out East with our older teams to the Maryland Cup or the Mid-Atlantic.",
                ],
              ].map(([label, body], i) => (
                <ScrollReveal key={label} delay={i * 80}>
                  <div className="card px-6 sm:px-7 py-5 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-6">
                    <span className="sm:w-28 flex-shrink-0 text-[13px] font-bold uppercase tracking-[0.12em] text-accent-blue">
                      {label}
                    </span>
                    <span className="text-[15px] text-[#6B7280] leading-[1.7]">{body}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <ScrollReveal>
              <p className="mt-7 text-center text-sm text-[#9CA3AF]">
                Specific tournament names and dates are shared closer to the season.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* From tryout to roster */}
        <section className="py-20 sm:py-24 bg-surface">
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
              <div className="mt-11 text-center">
                <Link
                  href="/tryouts"
                  className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300"
                >
                  Register for Tryouts — July 11
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
