"use client";

import { useState } from "react";
import { PAYMENT_FAQ } from "@/lib/feesData";
import ScrollReveal from "@/components/home/ScrollReveal";

export default function PaymentFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-background" id="faq">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-5">Payment FAQ</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.0]">
              <span className="text-[#1A1A1A]">Common </span>
              <span className="gradient-text-accent">Questions</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Accordion */}
        <div className="max-w-[720px] mx-auto space-y-3">
          {PAYMENT_FAQ.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <ScrollReveal key={i} delay={i * 80}>
                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between px-8 py-6 text-left transition-colors duration-200 hover:bg-[#FAFBFC]"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-semibold text-[#1A1A1A] pr-4">
                      {item.question}
                    </span>
                    <svg
                      className={`w-5 h-5 text-[#9CA3AF] flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-8 pb-6">
                      <div className="gradient-divider mb-4" />
                      <p className="text-sm text-[#6B7280] leading-[1.8]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
