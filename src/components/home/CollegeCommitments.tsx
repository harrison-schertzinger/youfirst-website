"use client";

import { COLLEGE_LOGOS } from "@/lib/constants";
import ScrollReveal from "./ScrollReveal";

export default function CollegeCommitments() {
  // Double the logos for seamless infinite scroll
  const doubled = [...COLLEGE_LOGOS, ...COLLEGE_LOGOS];

  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-section-alt" id="commitments">
      <ScrollReveal>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 text-center mb-12 lg:mb-16">
          <p className="section-label mb-4">Where Our Players Compete</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Our Players. Their Dreams. Real Results.
          </h2>
          <p className="text-text-secondary text-base max-w-xl mx-auto">
            From Cincinnati fields to the nation&apos;s top programs — our athletes
            earn their spots at the highest level.
          </p>
        </div>
      </ScrollReveal>

      {/* Logo carousel */}
      <div className="relative overflow-hidden py-8">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-section-alt to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-section-alt to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex items-center gap-8 sm:gap-12 w-max">
          {doubled.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex-shrink-0 w-28 h-20 sm:w-36 sm:h-24 rounded-xl bg-white shadow-sm flex items-center justify-center border border-black/[0.04] hover:shadow-md transition-shadow"
            >
              <span className="text-xs sm:text-sm font-bold text-text-muted tracking-wide">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <ScrollReveal>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 mt-12 lg:mt-16">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-text-primary">50+</p>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted mt-1">
                Players Committed
              </p>
            </div>
            <div className="w-px h-10 bg-black/10 hidden sm:block" />
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-text-primary">30+</p>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted mt-1">
                College Programs
              </p>
            </div>
            <div className="w-px h-10 bg-black/10 hidden sm:block" />
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-text-primary">D1 · D2 · D3</p>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted mt-1">
                All Levels
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
