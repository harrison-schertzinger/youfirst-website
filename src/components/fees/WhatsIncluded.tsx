import { WHATS_INCLUDED } from "@/lib/feesData";
import ScrollReveal from "@/components/home/ScrollReveal";

export default function WhatsIncluded() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-section-alt" id="whats-included">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-5">Everything Included</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.0]">
              <span className="text-[#1A1A1A]">What Your </span>
              <span className="gradient-text-accent">Investment</span>
              <span className="text-[#1A1A1A]"> Covers</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* 3x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-[1080px] mx-auto">
          {WHATS_INCLUDED.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100}>
              <div className="group bg-white rounded-2xl p-8 lg:p-10 border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 h-full flex flex-col">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-6 group-hover:bg-accent-blue/15 transition-colors duration-300">
                  <svg
                    className="w-6 h-6 text-accent-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight mb-3">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-[#6B7280] leading-[1.75] flex-1">
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
