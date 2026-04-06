"use client";

import { useState } from "react";
import { PAYMENT_PLANS, INCLUDED_FEATURES } from "@/lib/feesData";
import ScrollReveal from "@/components/home/ScrollReveal";

export default function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(planId: string) {
    setLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(null);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError(
        "Unable to connect to payment system. Please contact kathleen@youfirstelitelacrosseclub.com."
      );
      setLoading(null);
    }
  }

  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-background" id="pricing">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-5">Payment Plans</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.0]">
              <span className="text-[#1A1A1A]">Choose Your </span>
              <span className="gradient-text-accent">Plan</span>
            </h2>
            <p className="mt-6 text-lg text-[#6B7280] max-w-xl mx-auto leading-[1.75]">
              Three flexible options. Same elite experience. Pick what works for your family.
            </p>
          </div>
        </ScrollReveal>

        {/* Error toast */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-[1080px] mx-auto">
          {PAYMENT_PLANS.map((plan, i) => (
            <ScrollReveal key={plan.id} delay={i * 150}>
              <div
                className={`relative bg-white rounded-2xl overflow-hidden border transition-all duration-500 h-full flex flex-col ${
                  plan.featured
                    ? "border-accent-blue shadow-[0_8px_40px_rgba(74,144,217,0.15)] md:-translate-y-2 scale-[1.02]"
                    : "border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0">
                    <div
                      className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-bl-xl ${
                        plan.badgeColor === "green"
                          ? "bg-[#10B981] text-white"
                          : "bg-accent-blue text-white"
                      }`}
                    >
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="p-8 lg:p-10 flex-1 flex flex-col">
                  {/* Plan name */}
                  <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight mb-6">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="text-[3rem] font-extrabold text-[#1A1A1A] tracking-tight leading-none">
                      ${plan.perPayment.toLocaleString()}
                    </span>
                    {plan.payments > 1 && (
                      <span className="text-base text-[#9CA3AF] font-medium ml-1">
                        /{plan.payments === 4 ? "quarter" : "month"}
                      </span>
                    )}
                  </div>

                  {/* Total / schedule */}
                  <div className="mb-8">
                    {plan.payments > 1 && (
                      <p className="text-sm text-[#6B7280]">
                        ${plan.total.toLocaleString()} total
                      </p>
                    )}
                    <p className="text-sm text-[#9CA3AF] mt-1">{plan.schedule}</p>
                    {plan.savings && (
                      <p className="text-sm font-semibold text-[#10B981] mt-2">
                        {plan.savings}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="gradient-divider mb-8" />

                  {/* Features */}
                  <ul className="space-y-3.5 flex-1">
                    {INCLUDED_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm text-[#6B7280] leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <button
                    onClick={() => handleSelect(plan.id)}
                    disabled={loading === plan.id}
                    className={`mt-8 w-full py-4 text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl transition-all duration-300 ${
                      plan.featured
                        ? "bg-accent-blue text-white shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-white text-accent-blue border-2 border-accent-blue hover:bg-accent-blue hover:text-white hover:-translate-y-0.5 active:scale-[0.98]"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? "Redirecting..." : "Select Plan"}
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Contact line */}
        <ScrollReveal delay={500}>
          <p className="text-center mt-12 text-sm text-[#9CA3AF]">
            Questions?{" "}
            <a
              href="mailto:kathleen@youfirstelitelacrosseclub.com"
              className="text-accent-blue hover:text-accent-blue-hover transition-colors duration-200 underline underline-offset-2"
            >
              kathleen@youfirstelitelacrosseclub.com
            </a>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
