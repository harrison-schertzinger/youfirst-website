import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import JourneyArc from "@/components/graphics/JourneyArc";
import { JumpstartIcon, LaunchIcon, EliteIcon } from "@/components/graphics/TierIcons";
import { TIERS, FEES_NOTE } from "@/lib/program";
import { SITE_CONFIG } from "@/lib/constants";

// Real game photography + custom iconography per stage.
const TIER_ART: Record<string, { photo: string; alt: string; pos: string; Icon: typeof JumpstartIcon }> = {
  jumpstart: {
    photo: "/images/game/game-defense-5.jpg",
    alt: "Young You First player in the Carolina blue jersey defending on turf",
    pos: "object-[center_18%]",
    Icon: JumpstartIcon,
  },
  launch: {
    photo: "/images/game/game-sprint-12.jpg",
    alt: "You First player #12 sprinting upfield in the black game uniform",
    pos: "object-[center_62%]",
    Icon: LaunchIcon,
  },
  elite: {
    photo: "/images/game/game-lockdown-6.jpg",
    alt: "You First defender #6 locked in against an attacker",
    pos: "object-[center_30%]",
    Icon: EliteIcon,
  },
};

export default function ProgramTiers() {
  return (
    <section className="py-24 sm:py-32 bg-white scroll-mt-20" id="programs">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <p className="section-label mb-5">The Path — Programs &amp; Pricing</p>
            <h2 className="text-[2rem] sm:text-[2.6rem] lg:text-[3rem] font-extrabold tracking-[-0.02em] leading-[1.08] text-text-primary text-balance">
              Jumpstart. Launch. Elite.
            </h2>
            <p className="mt-6 text-lg text-text-secondary leading-[1.75]">
              A player&apos;s journey through the club has three stages. Each one
              builds on the last — and every family knows what the next step
              looks like before they get there.
            </p>
          </div>
        </ScrollReveal>

        {/* The player's arc through the club */}
        <ScrollReveal className="mb-14 sm:mb-16 hidden sm:block">
          <JourneyArc />
        </ScrollReveal>

        <div className="grid lg:grid-cols-3 gap-5 items-stretch">
          {TIERS.map((tier, i) => {
            const art = TIER_ART[tier.id];
            return (
              <ScrollReveal key={tier.id} delay={i * 120} className="h-full">
                <div className="card h-full flex flex-col overflow-hidden">
                  {/* Photo header */}
                  <div className="relative h-44 sm:h-48">
                    <Image
                      src={art.photo}
                      alt={art.alt}
                      fill
                      className={`object-cover ${art.pos}`}
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent" />
                    <p className="absolute bottom-3 left-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/95">
                      {tier.kicker}
                    </p>
                  </div>

                  <div className="p-7 sm:p-8 pt-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-extrabold tracking-[-0.015em] text-text-primary">
                        {tier.name}
                      </h3>
                      <art.Icon className="w-10 h-10 text-accent-blue flex-shrink-0" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-accent-wash text-accent-blue-hover text-xs font-semibold">
                        {tier.classes}
                      </span>
                      <span className="inline-block px-3 py-1 rounded-full bg-section-alt text-text-secondary text-xs font-semibold">
                        {tier.grades}
                      </span>
                    </div>
                    <p className="mt-4 text-[15px] text-text-secondary leading-[1.7]">
                      {tier.summary}
                    </p>

                    {/* Published pricing */}
                    <div className="mt-6 space-y-4">
                      {tier.prices.map((price) => (
                        <div
                          key={price.group}
                          className="rounded-xl border border-border bg-section-alt/60 px-5 py-4"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <p className="text-sm font-semibold text-text-primary">
                              {price.group}
                              <span className="block text-xs font-medium text-text-muted mt-0.5">
                                {price.classes} · {price.grades}
                              </span>
                            </p>
                            <p className="text-2xl font-extrabold tracking-[-0.02em] text-text-primary whitespace-nowrap tabular-nums">
                              {price.price}
                            </p>
                          </div>
                          <p className="mt-2 text-[13px] text-text-secondary leading-[1.6]">
                            {price.note}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Highlights */}
                    <ul className="mt-6 space-y-2.5 flex-1">
                      {tier.highlights.map((h) => (
                        <li key={h} className="flex gap-3 text-[14px] text-text-secondary">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="text-accent-blue mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 10.5L8.5 15L16 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {h}
                        </li>
                      ))}
                    </ul>

                    {tier.id === "elite" && (
                      <a
                        href={`mailto:${SITE_CONFIG.email}?subject=Elite%20team%20fees`}
                        className="mt-6 inline-flex items-center justify-center px-6 py-3 border-[1.5px] border-[#D8DDE3] text-text-primary text-[12px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:border-accent-blue hover:text-accent-blue-hover transition-all duration-300"
                      >
                        Request Elite fees
                      </a>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* All-in note */}
        <ScrollReveal>
          <div className="mt-8 rounded-2xl bg-accent-wash border border-[#D4E6F5] px-6 sm:px-8 py-6 text-center">
            <p className="text-[15px] text-text-primary leading-[1.7] max-w-3xl mx-auto">
              <span className="font-bold">Every number above is all-in.</span>{" "}
              {FEES_NOTE}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mt-10 text-center">
            <Link
              href="/tryouts"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300"
            >
              Start with Tryouts — July 11
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
