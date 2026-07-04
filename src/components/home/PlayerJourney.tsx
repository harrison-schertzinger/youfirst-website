"use client";

import { useEffect, useRef, useState } from "react";
import ScrollReveal from "./ScrollReveal";

const STAGES = [
  {
    number: "01",
    title: "Tryout",
    description: "Show us what you've got. We're looking for coachability, work ethic, and hunger.",
    color: "#4B9CD3",
  },
  {
    number: "02",
    title: "Training",
    description: "Year-round elite development — stick skills, conditioning, film, and lacrosse IQ.",
    color: "#4B9CD3",
  },
  {
    number: "03",
    title: "Showcase",
    description: "Compete at the nation's biggest events. Get seen by the coaches who matter.",
    color: "#4B9CD3",
  },
  {
    number: "04",
    title: "Commitment",
    description: "Earn your spot. 30+ players have committed to 20 college programs — and counting.",
    color: "#4B9CD3",
  },
];

function AnimatedPath({ visible }: { visible: boolean }) {
  return (
    <div className="hidden lg:block absolute top-[60px] left-0 right-0 h-[2px] z-0">
      <div
        className="h-full bg-gradient-to-r from-[#4B9CD3] to-white rounded-full transition-all duration-[1.5s] ease-out origin-left"
        style={{
          transform: visible ? "scaleX(1)" : "scaleX(0)",
          opacity: visible ? 0.3 : 0,
        }}
      />
    </div>
  );
}

export default function PlayerJourney() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-[#0A0A0B] overflow-hidden" id="journey">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-5">The Player Development Path</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.0]">
              <span className="text-white">From Tryout to </span>
              <span className="gradient-text-blue">College Commitment</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Journey path — desktop: horizontal, mobile: vertical */}
        <div ref={ref} className="relative">
          <AnimatedPath visible={visible} />

          {/* Desktop: 4-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative z-10">
            {STAGES.map((stage, i) => (
              <div
                key={stage.number}
                className="transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transitionDelay: `${i * 200 + 300}ms`,
                }}
              >
                {/* Dot + connector */}
                <div className="flex items-center gap-4 mb-6 lg:flex-col lg:items-start lg:gap-3">
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center border-2 transition-all duration-700"
                    style={{
                      borderColor: stage.color,
                      boxShadow: visible ? `0 0 20px ${stage.color}30` : "none",
                      transitionDelay: `${i * 200 + 500}ms`,
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: stage.color }}
                    >
                      {stage.number}
                    </span>
                  </div>

                  {/* Mobile connector line */}
                  {i < STAGES.length - 1 && (
                    <div
                      className="sm:hidden flex-1 h-[2px] rounded-full transition-all duration-700"
                      style={{
                        background: stage.color,
                        opacity: visible ? 0.3 : 0,
                        transitionDelay: `${i * 200 + 600}ms`,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2 tracking-[-0.01em]">
                  {stage.title}
                </h3>
                <p className="text-[15px] text-white/50 leading-[1.7]">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
