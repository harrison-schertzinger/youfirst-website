import ScrollReveal from "@/components/home/ScrollReveal";
import { ELITE_TRYOUT, YOUTH_EVALUATION } from "@/lib/tryouts";

/**
 * The two options, both open to every age — free morning evaluations first and
 * visually prominent (full-width card; youth & development are the primary
 * audience), the July 25 set-date tryout below it. Everything is free.
 */
export default function TryoutDates() {
  return (
    <section className="py-24 sm:py-32 bg-background" id="dates">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <ScrollReveal>
            <p className="section-label mb-5">Two Options · Completely Free</p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.0] mb-6 tracking-tight text-[#1A1A1A]">
              Find Her <span className="gradient-text-accent">Date.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-lg text-[#6B7280] leading-[1.75]">
              The set tryout is Saturday, July 25 — open to all ages. Free
              morning evaluations run any morning, now through August 7. Either
              way, it&apos;s completely free.
            </p>
          </ScrollReveal>
        </div>

        {/* ── Free morning evaluations — the prominent option ───────────── */}
        <ScrollReveal>
          <div className="card max-w-4xl mx-auto p-8 sm:p-12" id="youth">
            <div className="flex items-center gap-3 mb-8">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold uppercase tracking-[0.15em]">
                Youth &amp; Development · Any Age Welcome
              </span>
              <span className="h-px flex-1 bg-[#E5E8EC]" />
            </div>

            <h3 className="text-[2rem] sm:text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-[#1A1A1A] mb-6">
              <span className="gradient-text-accent">{YOUTH_EVALUATION.headline}</span>
            </h3>

            <p className="text-[17px] sm:text-lg text-[#6B7280] leading-[1.8]">
              Can&apos;t make July 25, need to try out earlier, or just want a
              player evaluation? Come any morning to the Cincinnati Lacrosse
              Academy, get evaluated on the spot, and hear that day whether
              she&apos;s in or we&apos;d like to see her once more. Open now
              through August 7th — completely free.
            </p>

            <p className="mt-5 text-[17px] sm:text-lg text-[#1A1A1A] font-medium leading-[1.8]">
              We know the other offers are already out. Before you decide, come
              see what this community is about — the energy, the players, the
              standard we hold. We&apos;re the elite development and elite
              lacrosse program in the area, and we will have teams for these age
              groups. Come find out why.
            </p>

            <p className="mt-4 text-[15px] text-[#6B7280] leading-[1.7]">
              New teams begin competing next June — optional training starts in
              September.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] uppercase tracking-[0.12em] text-[#9CA3AF] font-semibold">
              <span>{YOUTH_EVALUATION.rangeLabel}</span>
              <span className="text-accent-blue">·</span>
              <span>{YOUTH_EVALUATION.time}</span>
              <span className="text-accent-blue">·</span>
              <span>{YOUTH_EVALUATION.location}</span>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5E8EC] flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
              <a
                href="#evaluation"
                className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300 self-start"
              >
                Register — Free
              </a>
              <p className="text-[14px] text-[#6B7280] leading-[1.7]">
                Already paid the $50 tryout fee? We&apos;ll refund it or credit
                it toward your team fees — your choice.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* ── The set date — Saturday, July 25, all ages ────────────────── */}
        <div className="max-w-4xl mx-auto mt-8">
          <ScrollReveal delay={120}>
            <div className="card p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold uppercase tracking-[0.15em]">
                  {ELITE_TRYOUT.group}
                </span>
                <span className="h-px flex-1 bg-[#E5E8EC]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-[13px] uppercase tracking-[0.2em] text-[#9CA3AF] font-semibold mb-2">
                    {ELITE_TRYOUT.weekday}
                  </p>
                  <p className="text-[2.75rem] sm:text-[3.25rem] font-extrabold leading-[0.95] tracking-tight text-[#1A1A1A] mb-4">
                    {ELITE_TRYOUT.dateLabel}
                  </p>
                  <p className="text-[15px] text-[#6B7280] font-medium leading-snug">
                    {ELITE_TRYOUT.time}
                    <span className="text-[#C4CBD4]"> · </span>
                    {ELITE_TRYOUT.location}
                  </p>
                </div>
                <div className="sm:border-l sm:border-[#E5E8EC] sm:pl-8 flex flex-col justify-center">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-[#9CA3AF] font-semibold mb-2">
                    Who belongs here
                  </p>
                  <p className="text-base text-[#1A1A1A] font-medium leading-[1.6]">
                    {ELITE_TRYOUT.audience} — the marquee tryout, the set date
                    out-of-town players come in for.
                  </p>
                  <p className="mt-3 text-[14px] text-[#6B7280] leading-[1.7]">
                    Can&apos;t make it? Free evaluations run any morning through
                    August 7.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
