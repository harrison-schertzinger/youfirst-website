"use client";

import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

export default function Philosophy() {
  return (
    <section className="relative py-32 sm:py-40 lg:py-52 overflow-hidden" id="philosophy">
      {/* Full-bleed background with CSS parallax */}
      <div
        className="absolute inset-0"
        style={{
          transform: "translateZ(-1px) scale(1.5)",
          transformOrigin: "center center",
        }}
      >
        <Image
          src="/images/players/DSC00480.jpeg"
          alt="Silhouettes of players walking across a field at night toward a single light"
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Multi-layer dark overlay — heavier at top and bottom, softer in the middle */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(0,0,0,0.65) 0%,
              rgba(0,0,0,0.45) 40%,
              rgba(0,0,0,0.45) 60%,
              rgba(0,0,0,0.7) 100%
            )
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 lg:px-8 text-center">
        <ScrollReveal>
          <p className="section-label text-white/40 mb-10">
            The Philosophy
          </p>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white/95 mb-12 leading-[1.1] tracking-[-0.02em]">
            Why is the{" "}
            <span className="text-accent-blue">You.</span>{" "}
            backwards?
          </h2>
        </ScrollReveal>

        <div className="space-y-8">
          <ScrollReveal delay={300}>
            <p className="text-xl sm:text-2xl text-white/80 leading-relaxed font-light">
              So it can only be read in the mirror — because that is what we care
              about.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={450}>
            <p className="text-2xl sm:text-3xl text-white/95 leading-relaxed font-medium tracking-[-0.01em]">
              Who do <em className="not-italic text-white">you</em>{" "}
              see staring back at you?
            </p>
          </ScrollReveal>

          <ScrollReveal delay={600}>
            <p className="text-xl sm:text-2xl text-white/70 leading-relaxed font-light">
              Are you proud of that person? Do you love that person? Are you
              oriented towards the best for yourself?
            </p>
          </ScrollReveal>
        </div>

        {/* Closing statement — the emotional peak */}
        <ScrollReveal delay={750}>
          <div className="mt-16 pt-12 border-t border-white/10">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug tracking-[-0.01em]">
              This club is about{" "}
              <span className="text-accent-blue">You.</span>
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-light text-white/60 mt-3">
              Build the best You. — with us.
            </p>
          </div>
        </ScrollReveal>

        {/* Mirrored .uoY watermark */}
        <ScrollReveal delay={900}>
          <div
            className="mt-20 text-7xl sm:text-8xl font-bold text-white/[0.04] select-none"
            aria-hidden="true"
            style={{ transform: "scaleX(-1)" }}
          >
            You.
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
