import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

export default function AllAmerican() {
  return (
    <section className="relative py-24 sm:py-32 lg:py-40 bg-[#0A0A0B] overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(74,144,217,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Photo */}
          <ScrollReveal>
            <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_60px_rgba(0,0,0,0.5)] aspect-[4/5] max-h-[640px] w-full mx-auto max-w-[480px] lg:max-w-none">
              <Image
                src="/images/players/ALL-AMERICAN.jpg"
                alt="Five You. First All-American players posing together — 5 of 8 regional All-Americans train with You. First"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 45vw"
              />
            </div>
          </ScrollReveal>

          {/* Stat */}
          <div className="text-center lg:text-left">
            <ScrollReveal>
              <p className="section-label mb-6">The Proof</p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <p className="text-[7rem] sm:text-[9rem] lg:text-[11rem] font-extrabold leading-[0.85] tracking-[-0.04em] text-white mb-6">
                5
                <span className="text-accent-blue">/</span>
                8
              </p>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-xl sm:text-2xl lg:text-3xl font-light text-white/70 leading-[1.4] max-w-md mx-auto lg:mx-0">
                of the region&apos;s All-Americans train with{" "}
                <span className="text-white font-semibold">
                  You<span className="text-accent-blue">.</span> First
                </span>
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="mt-8 h-px w-16 bg-accent-blue/40 mx-auto lg:mx-0" />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
