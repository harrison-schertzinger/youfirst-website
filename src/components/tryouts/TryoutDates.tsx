import ScrollReveal from "@/components/home/ScrollReveal";
import { TRYOUT_DATE_LIST } from "@/lib/tryouts";

export default function TryoutDates() {
  return (
    <section className="py-24 sm:py-32 bg-background" id="dates">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <ScrollReveal>
            <p className="section-label mb-5">Two Tryout Dates</p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.0] mb-6 tracking-tight text-[#1A1A1A]">
              Find Her <span className="gradient-text-accent">Date.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-lg text-[#6B7280] leading-[1.75]">
              Her graduation year decides which session she belongs at. Not sure?
              The form below tells you the moment you pick her year.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {TRYOUT_DATE_LIST.map((t, i) => (
            <ScrollReveal key={t.id} delay={i * 120}>
              <div className="card h-full p-8 sm:p-10 flex flex-col">
                {/* Group tag */}
                <div className="flex items-center gap-3 mb-8">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold uppercase tracking-[0.15em]">
                    {t.group}
                  </span>
                  <span className="h-px flex-1 bg-[#E5E8EC]" />
                </div>

                {/* Weekday + date */}
                <p className="text-[13px] uppercase tracking-[0.2em] text-[#9CA3AF] font-semibold mb-2">
                  {t.weekday}
                </p>
                <p className="text-[2.75rem] sm:text-[3.25rem] font-extrabold leading-[0.95] tracking-tight text-[#1A1A1A] mb-4">
                  {t.dateLabel}
                </p>

                {/* Time + location */}
                <p className="text-[15px] text-[#6B7280] font-medium leading-snug mb-6">
                  {t.time}
                  <span className="text-[#C4CBD4]"> · </span>
                  {t.location}
                </p>

                {/* Grad years covered */}
                <div className="mt-auto pt-6 border-t border-[#E5E8EC]">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-[#9CA3AF] font-semibold mb-2">
                    Who belongs here
                  </p>
                  <p className="text-base text-[#1A1A1A] font-medium leading-[1.6]">
                    {t.audience}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
