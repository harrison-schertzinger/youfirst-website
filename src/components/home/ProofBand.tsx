import ScrollReveal from "./ScrollReveal";
import { MISSION, PROOF_STATS } from "@/lib/program";

export default function ProofBand() {
  return (
    <section className="py-20 sm:py-28 bg-section-alt">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="section-label mb-5">The Proof</p>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
              We build players. The results are on the field.
            </h2>
            <p className="mt-5 text-lg text-text-secondary leading-[1.75]">{MISSION.body}</p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {PROOF_STATS.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 120}>
              <div className="card h-full p-8 text-center">
                <p className="text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] text-accent-blue">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.1em] text-text-primary">
                  {stat.label}
                </p>
                <p className="mt-3 text-[15px] text-text-secondary leading-[1.65]">{stat.detail}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
