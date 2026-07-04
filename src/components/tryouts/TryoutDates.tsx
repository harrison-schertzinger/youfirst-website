import Image from "next/image";
import ScrollReveal from "@/components/home/ScrollReveal";
import { TRYOUT_DATE_LIST, TRYOUT_PHOTOS } from "@/lib/tryouts";

export default function TryoutDates() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40" id="dates">
      {/* Darkened photo backdrop — swap via TRYOUT_PHOTOS.datesBackground */}
      <div className="absolute inset-0">
        <Image
          src={TRYOUT_PHOTOS.datesBackground}
          alt=""
          aria-hidden="true"
          fill
          className="object-cover object-[center_30%]"
          sizes="100vw"
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(10,10,11,0.94) 0%, rgba(10,10,11,0.90) 45%, rgba(10,10,11,0.95) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(74,144,217,0.10), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <ScrollReveal>
            <p className="section-label mb-5">Two Tryout Dates</p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.0] mb-6 tracking-tight text-white">
              Find Her <span className="gradient-text-blue">Date.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-lg text-white/60 leading-[1.75]">
              Her graduation year decides which session she belongs at. Not sure?
              The form below tells you the moment you pick her year.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {TRYOUT_DATE_LIST.map((t, i) => (
            <ScrollReveal key={t.id} delay={i * 120}>
              <div className="group h-full rounded-2xl border border-white/12 bg-white/[0.05] backdrop-blur-md p-8 sm:p-10 flex flex-col transition-all duration-300 hover:border-accent-blue/40 hover:bg-white/[0.07]">
                {/* Group tag */}
                <div className="flex items-center gap-3 mb-8">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent-blue/15 text-accent-blue text-[11px] font-semibold uppercase tracking-[0.15em]">
                    {t.group}
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                {/* Weekday + date */}
                <p className="text-[13px] uppercase tracking-[0.2em] text-white/45 font-semibold mb-2">
                  {t.weekday}
                </p>
                <p className="text-[2.75rem] sm:text-[3.25rem] font-extrabold leading-[0.95] tracking-tight text-white mb-4">
                  {t.dateLabel}
                </p>

                {/* Time + location */}
                <p className="text-[15px] text-white/80 font-medium leading-snug mb-6">
                  {t.time}
                  <span className="text-white/40"> · </span>
                  {t.location}
                </p>

                {/* Grad years covered */}
                <div className="mt-auto pt-6 border-t border-white/10">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-white/45 font-semibold mb-2">
                    Who belongs here
                  </p>
                  <p className="text-base text-white font-medium leading-[1.6]">
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
