import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import { AFTER_TRYOUTS } from "@/lib/program";

export default function TryoutsNext() {
  return (
    <section className="py-20 sm:py-28 bg-section-alt scroll-mt-20" id="tryouts-next">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <ScrollReveal>
            <div>
              <p className="section-label mb-5">Tryouts &amp; What Happens Next</p>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
                {AFTER_TRYOUTS.date}.
                <span className="block text-accent-blue">No cuts. Just placement.</span>
              </h2>
              <p className="mt-5 text-lg text-text-secondary leading-[1.75]">
                {AFTER_TRYOUTS.noCuts}
              </p>
              <Link
                href="/tryouts"
                className="mt-8 inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300"
              >
                Register for Tryouts — $50
              </Link>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {AFTER_TRYOUTS.steps.map((step, i) => (
              <ScrollReveal key={step} delay={i * 120}>
                <div className="card p-6 flex items-start gap-5">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-blue text-white font-extrabold text-lg flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-[15px] text-text-primary font-medium leading-[1.65] pt-1.5">
                    {step}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
