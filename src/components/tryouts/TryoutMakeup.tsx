import Image from "next/image";
import ScrollReveal from "@/components/home/ScrollReveal";
import { MAKEUP_TRYOUT, TRYOUT_PHOTOS } from "@/lib/tryouts";

/**
 * Make-up tryout section — softer, welcoming framing. Same dark-gradient
 * cinematic treatment as the rest of the page, over a warmer big-group /
 * daytime Academy shot (swap via TRYOUT_PHOTOS.makeup). The CTA deep-links to
 * the form in make-up mode (#makeup).
 */
export default function TryoutMakeup() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32" id="makeup-info">
      {/* Warm community photo — swap via TRYOUT_PHOTOS.makeup */}
      <div className="absolute inset-0">
        <Image
          src={TRYOUT_PHOTOS.makeup}
          alt=""
          aria-hidden="true"
          fill
          className="object-cover object-[center_35%]"
          sizes="100vw"
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(10,10,11,0.90) 0%, rgba(10,10,11,0.82) 50%, rgba(10,10,11,0.92) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(74,144,217,0.10), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[760px] px-6 text-center">
        <ScrollReveal>
          <p className="section-label mb-5">Can&apos;t Make July 11 or 25?</p>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <h2 className="text-[2.25rem] md:text-[3.25rem] font-bold leading-[1.05] tracking-tight text-white mb-6">
            Come See If You First Is{" "}
            <span className="gradient-text-blue">Right for You.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <p className="text-lg sm:text-xl text-white/65 leading-[1.7] mb-8 max-w-xl mx-auto">
            Come to a make-up tryout — {MAKEUP_TRYOUT.rangeLabel}, mornings{" "}
            {MAKEUP_TRYOUT.time} at the {MAKEUP_TRYOUT.location}. Pick the day that
            works and come see if You First is the right home for you.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-10 text-[13px] uppercase tracking-[0.12em] text-white/55 font-semibold">
            <span>{MAKEUP_TRYOUT.rangeLabel}</span>
            <span className="text-accent-blue/70">·</span>
            <span>{MAKEUP_TRYOUT.time}</span>
            <span className="text-accent-blue/70">·</span>
            <span>{MAKEUP_TRYOUT.location}</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={350}>
          <a
            href="#makeup"
            className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_18px_rgba(74,144,217,0.45)] hover:shadow-[0_6px_28px_rgba(74,144,217,0.6)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Register for a Make-up
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
