import ScrollReveal from "./ScrollReveal";
import { FAQ_ITEMS } from "@/lib/program";

export default function FaqSection() {
  return (
    <section className="py-20 sm:py-28 bg-white scroll-mt-20" id="faq">
      <div className="mx-auto max-w-[880px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <p className="section-label mb-5">Common Questions</p>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
              Straight answers, in writing.
            </h2>
          </div>
        </ScrollReveal>

        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, i) => (
            <ScrollReveal key={item.question} delay={Math.min(i, 4) * 80}>
              <details className="group bg-white rounded-2xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 sm:px-7 py-5 transition-shadow duration-300 open:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] sm:text-base font-bold text-text-primary leading-snug">
                    {item.question}
                  </span>
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-wash text-accent-blue flex items-center justify-center transition-transform duration-300 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1V13M1 7H13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-[15px] text-text-secondary leading-[1.75]">
                  {item.answer}
                </p>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
