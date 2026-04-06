"use client";

import Image from "next/image";
import { COLLEGE_LOGO_FILES } from "@/lib/constants";
import ScrollReveal from "./ScrollReveal";

export default function CollegeCommitments() {
  // Split logos into two rows for density
  const row1 = COLLEGE_LOGO_FILES.slice(0, 10);
  const row2 = COLLEGE_LOGO_FILES.slice(10);

  // Double each row for seamless infinite scroll
  const row1Doubled = [...row1, ...row1];
  const row2Doubled = [...row2, ...row2];

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

      {/* Two-row logo carousel */}
      <div className="relative overflow-hidden py-4 space-y-4">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-section-alt to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-section-alt to-transparent z-10 pointer-events-none" />

        {/* Row 1 — scrolls left */}
        <div className="animate-marquee flex items-center gap-6 sm:gap-8 w-max">
          {row1Doubled.map((src, i) => (
            <div
              key={`r1-${i}`}
              className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white shadow-sm flex items-center justify-center border border-black/[0.04] p-3 sm:p-4 grayscale hover:grayscale-0 transition-all duration-300 hover:shadow-md"
            >
              <Image
                src={src}
                alt="College program logo"
                width={200}
                height={200}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>

        {/* Row 2 — scrolls left at different speed */}
        <div
          className="flex items-center gap-6 sm:gap-8 w-max"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {row2Doubled.map((src, i) => (
            <div
              key={`r2-${i}`}
              className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white shadow-sm flex items-center justify-center border border-black/[0.04] p-3 sm:p-4 grayscale hover:grayscale-0 transition-all duration-300 hover:shadow-md"
            >
              <Image
                src={src}
                alt="College program logo"
                width={200}
                height={200}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <ScrollReveal>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 mt-12 lg:mt-16">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-text-primary">30+</p>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted mt-1">
                Players Committed
              </p>
            </div>
            <div className="w-px h-10 bg-black/10 hidden sm:block" />
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-text-primary">20</p>
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
