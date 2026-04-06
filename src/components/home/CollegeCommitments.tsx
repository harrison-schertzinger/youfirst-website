"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { COLLEGE_LOGO_FILES } from "@/lib/constants";
import ScrollReveal from "./ScrollReveal";

function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

export default function CollegeCommitments() {
  const row1 = COLLEGE_LOGO_FILES.slice(0, 10);
  const row2 = COLLEGE_LOGO_FILES.slice(10);

  const row1Doubled = [...row1, ...row1];
  const row2Doubled = [...row2, ...row2];

  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-section-alt" id="commitments">
      <ScrollReveal>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 text-center mb-12 lg:mb-16">
          <p className="section-label mb-4">Where Our Players Compete</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.02em] mb-5">
            <span className="gradient-text">Our Players. Their Dreams.</span>
            <br />
            <span className="gradient-text">Real Results.</span>
          </h2>
          <p className="text-[#6B7280] text-base sm:text-lg max-w-xl mx-auto">
            From Cincinnati fields to the nation&apos;s top programs — our athletes
            earn their spots at the highest level.
          </p>
        </div>
      </ScrollReveal>

      {/* Two-row logo carousel — full color on white tiles */}
      <div className="relative overflow-hidden py-4 space-y-4">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-section-alt to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-section-alt to-transparent z-10 pointer-events-none" />

        {/* Row 1 */}
        <div className="animate-marquee flex items-center gap-5 sm:gap-6 w-max">
          {row1Doubled.map((src, i) => (
            <div
              key={`r1-${i}`}
              className="flex-shrink-0 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center border border-[#E5E7EB] p-4 sm:p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300"
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

        {/* Row 2 — slightly different speed */}
        <div className="animate-marquee-slow flex items-center gap-5 sm:gap-6 w-max">
          {row2Doubled.map((src, i) => (
            <div
              key={`r2-${i}`}
              className="flex-shrink-0 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center border border-[#E5E7EB] p-4 sm:p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300"
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

      {/* Stats with animated counters */}
      <ScrollReveal>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 mt-14 lg:mt-20">
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                <AnimatedCounter end={30} suffix="+" />
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF] mt-2">
                Players Committed
              </p>
            </div>
            <div className="w-px h-12 bg-[#E5E7EB] hidden sm:block" />
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                <AnimatedCounter end={20} />
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF] mt-2">
                College Programs
              </p>
            </div>
            <div className="w-px h-12 bg-[#E5E7EB] hidden sm:block" />
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-[#1A1A1A] tracking-tight">
                D1 · D2 · D3
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF] mt-2">
                All Levels
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
