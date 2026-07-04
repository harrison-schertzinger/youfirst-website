import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

export default function Philosophy() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-background" id="philosophy">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
          {/* Photo — fills to match content height */}
          <ScrollReveal className="min-h-[400px] lg:min-h-0">
            <div className="relative rounded-2xl overflow-hidden w-full h-full shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
              <Image
                src="/images/team/DWW07615NEW.jpg"
                alt="You. First team at golden hour on the practice field"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </ScrollReveal>

          {/* Content — lacrosse-focused philosophy */}
          <div className="flex flex-col justify-center">
            <ScrollReveal>
              <p className="section-label mb-5">The Philosophy</p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.0] mb-8 tracking-tight">
                <span className="text-[#1A1A1A]">Every Player Has</span>
                <br />
                <span className="text-[#1A1A1A]">a Dream. </span>
                <span className="gradient-text-accent">We Build the Path.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="space-y-5 max-w-md">
                <p className="text-lg text-[#6B7280] leading-[1.75]">
                  Every player who walks into this club has a dream. For some,
                  it&apos;s playing college lacrosse. For others, it&apos;s becoming the
                  kind of person who earns that opportunity.
                </p>
                <p className="text-lg text-[#6B7280] leading-[1.75]">
                  We build the plan. We run the schedule. We create the
                  environment where working hard is the norm and excellence is the
                  expectation. The college commitment is the outcome — the
                  transformation is the real win.
                </p>
              </div>
            </ScrollReveal>

            {/* Brand mark + You.Prjct connection */}
            <ScrollReveal delay={350}>
              <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                    YOU<span className="text-accent-blue">.</span> FIRST
                  </span>
                  <span className="w-px h-5 bg-[#D1D5DB]" aria-hidden="true" />
                  <span className="text-xs font-normal tracking-wide text-[#9CA3AF]">
                    Elite Lacrosse Club
                  </span>
                </div>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  Powered by{" "}
                  <span className="font-semibold text-[#6B7280]">
                    YOU<span className="text-accent-blue">.</span>PRJCT
                  </span>{" "}
                  — The Operating System for Elite Performance
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
