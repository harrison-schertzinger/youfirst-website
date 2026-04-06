import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

export default function CallToAction() {
  return (
    <section className="relative py-28 sm:py-36 lg:py-44 overflow-hidden" id="cta">
      {/* Multi-layer dark background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #0A0A0B 0%, #111318 40%, #0A0A0B 100%)",
        }}
      />

      {/* Radial glow behind content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(74, 144, 217, 0.06), transparent)",
        }}
      />

      {/* .uoY watermark */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] sm:text-[300px] font-extrabold text-white/[0.02] select-none leading-none tracking-tight pointer-events-none"
        aria-hidden="true"
        style={{ transform: "translate(-50%, -50%) scaleX(-1)" }}
      >
        YOU.
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
        <ScrollReveal>
          {/* Accent line */}
          <div className="w-12 h-[2px] bg-accent-blue mx-auto mb-10 rounded-full" />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6 tracking-[-0.02em]">
            Ready to Compete at the
            <br className="hidden sm:block" />
            {" "}Next Level?
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <p className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto mb-12 font-light">
            Join Southern Ohio&apos;s most ambitious lacrosse community.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={350}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 min-w-[220px]"
            >
              View Summer Schedule
            </Link>
            <Link
              href="mailto:kathleen@youfirstelitelacrosseclub.com"
              className="inline-flex items-center justify-center px-8 py-4 border border-white/20 text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-white/[0.06] hover:border-white/30 hover:-translate-y-0.5 transition-all duration-300 min-w-[220px] backdrop-blur-sm"
            >
              Contact Us
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
