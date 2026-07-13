import ScrollReveal from "@/components/home/ScrollReveal";
import { MAKEUP_TRYOUT } from "@/lib/tryouts";

/**
 * Make-up tryout section — for elite players (grad years 2027–2030) who can't
 * make July 25. Light, welcoming framing to balance the page's darker
 * photography bands. The CTA deep-links to the form in make-up mode (#makeup).
 */
export default function TryoutMakeup() {
  return (
    <section className="py-24 sm:py-32 bg-surface" id="makeup-info">
      <div className="mx-auto max-w-[760px] px-6 text-center">
        <ScrollReveal>
          <p className="section-label mb-5">Elite Players — Can&apos;t Make July 25?</p>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <h2 className="text-[2.25rem] md:text-[3.25rem] font-bold leading-[1.05] tracking-tight text-[#1A1A1A] mb-6">
            Come See If You First Is
            <span className="block gradient-text-accent">Right for You.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <p className="text-lg sm:text-xl text-[#6B7280] leading-[1.7] mb-8 max-w-xl mx-auto">
            Come to a make-up tryout — {MAKEUP_TRYOUT.rangeLabel}, mornings{" "}
            {MAKEUP_TRYOUT.time} at the {MAKEUP_TRYOUT.location}. For elite
            players, grad years 2027 through 2030, who can&apos;t make the July
            25 tryout. Pick the day that works — completely free.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-10 text-[13px] uppercase tracking-[0.12em] text-[#9CA3AF] font-semibold">
            <span>{MAKEUP_TRYOUT.rangeLabel}</span>
            <span className="text-accent-blue">·</span>
            <span>{MAKEUP_TRYOUT.time}</span>
            <span className="text-accent-blue">·</span>
            <span>{MAKEUP_TRYOUT.location}</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={350}>
          <a
            href="#makeup"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_18px_rgba(75,156,211,0.45)] hover:shadow-[0_6px_28px_rgba(75,156,211,0.6)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Register for a Make-up
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
