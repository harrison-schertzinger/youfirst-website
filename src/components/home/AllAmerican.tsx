import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

export default function AllAmerican() {
  return (
    <section className="relative py-24 bg-[#0A0A0B] overflow-hidden">
      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 flex flex-col items-center gap-8">
        {/* Section label */}
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Recognition
          </p>
        </ScrollReveal>

        {/* All-American graphic — finished asset with baked-in text */}
        <ScrollReveal delay={100}>
          <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
            <Image
              src="/images/players/ALL-AMERICAN.jpg"
              alt="Five You. First All-American players posing together — 5 of 8 regional All-Americans train with You. First"
              width={896}
              height={1120}
              className="w-full h-auto"
              sizes="(max-width: 768px) 90vw, 56rem"
            />
          </div>
        </ScrollReveal>

        {/* Supporting text */}
        <ScrollReveal delay={200}>
          <p className="text-lg font-light text-white text-center max-w-lg">
            Five of the eight regional All-Americans train with{" "}
            <span className="font-semibold">
              You<span className="text-accent-blue">.</span> First
            </span>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
