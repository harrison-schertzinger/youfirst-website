import ScrollReveal from "./ScrollReveal";
import StatGraphic from "@/components/graphics/StatGraphic";
import { MISSION } from "@/lib/program";

const STATS = [
  {
    variant: "sevenOfEight" as const,
    value: "7 of 8",
    label: "Regional HS All-Americans trained here",
    detail: "Up from 5 of 8 the year before — plus 3 more from out of state.",
  },
  {
    variant: "commitments" as const,
    value: "30+ · 20+",
    label: "College commitments · programs",
    detail: "Across D1, D2, and D3 — earned on the field.",
  },
  {
    variant: "coaches" as const,
    value: "100%",
    label: "College-player coaches",
    detail: "Every coach is a current or former college player, and our college athletes mentor the girls.",
  },
];

export default function ProofBand() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-18">
            <p className="section-label mb-5">The Proof</p>
            <h2 className="text-[2rem] sm:text-[2.6rem] lg:text-[3rem] font-extrabold tracking-[-0.02em] leading-[1.08] text-text-primary text-balance">
              We build players. The results are on the field.
            </h2>
            <p className="mt-6 text-lg text-text-secondary leading-[1.75]">{MISSION.body}</p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {STATS.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 120} className="h-full">
              <div className="card h-full p-8 flex flex-col">
                <StatGraphic variant={stat.variant} className="h-[72px] w-auto self-start" />
                <p className="mt-6 text-[2.6rem] leading-none font-extrabold tracking-[-0.02em] text-text-primary tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.12em] text-accent-blue-hover">
                  {stat.label}
                </p>
                <p className="mt-3 text-[15px] text-text-secondary leading-[1.7]">{stat.detail}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
