import ScrollReveal from "./ScrollReveal";
import SeasonBandSvg from "@/components/graphics/SeasonBandSvg";
import { SEASON } from "@/lib/program";

export default function SeasonSection() {
  return (
    <section className="py-20 sm:py-28 bg-section-alt scroll-mt-20" id="season">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="section-label mb-5">The Season</p>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
              June through February. There is no off-season.
            </h2>
            <p className="mt-5 text-lg text-text-secondary leading-[1.75]">{SEASON.intro}</p>
          </div>
        </ScrollReveal>

        {/* Season calendar band — custom SVG */}
        <ScrollReveal>
          <div className="card p-6 sm:p-8">
            <SeasonBandSvg />
            <p className="mt-6 text-[15px] text-text-secondary leading-[1.75] text-center max-w-3xl mx-auto">
              <span className="font-bold text-text-primary">
                Opportunities, not mandates.
              </span>{" "}
              {SEASON.promise}
            </p>
          </div>
        </ScrollReveal>

        {/* Practice facts */}
        <div className="mt-5 grid sm:grid-cols-3 gap-5">
          {SEASON.practices.map((fact, i) => (
            <ScrollReveal key={fact.label} delay={i * 120}>
              <div className="card h-full p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-blue">
                  {fact.label}
                </p>
                <p className="mt-3 text-[15px] text-text-primary font-medium leading-[1.65]">
                  {fact.value}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
