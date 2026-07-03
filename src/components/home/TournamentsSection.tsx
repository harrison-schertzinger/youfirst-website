import ScrollReveal from "./ScrollReveal";
import { TOURNAMENTS } from "@/lib/program";

export default function TournamentsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white scroll-mt-20" id="tournaments">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="section-label mb-5">Tournaments &amp; Travel</p>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
              Reps, reps, reps — published by stage.
            </h2>
            <p className="mt-5 text-lg text-text-secondary leading-[1.75]">{TOURNAMENTS.intro}</p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOURNAMENTS.slate.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100} className="h-full">
              <div className="card h-full p-7 flex flex-col">
                <span className="self-start inline-block px-3 py-1 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-bold uppercase tracking-[0.08em]">
                  {item.appliesTo}
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-[-0.01em] text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[15px] text-text-secondary leading-[1.7]">
                  {item.detail}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <p className="mt-8 text-center text-sm text-text-muted">{TOURNAMENTS.note}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
