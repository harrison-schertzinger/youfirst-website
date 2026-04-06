import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

export default function CallToAction() {
  return (
    <section className="relative py-24 sm:py-32 lg:py-40 overflow-hidden" id="cta">
      {/* Dark background — bookend with hero */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #0f1923 0%, #1a2332 60%, #2d3748 100%)",
        }}
      />

      {/* .uoY watermark */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] sm:text-[280px] font-extrabold text-white/[0.03] select-none leading-none tracking-tight pointer-events-none"
        aria-hidden="true"
        style={{ transform: "translate(-50%, -50%) scaleX(-1)" }}
      >
        YOU.
      </div>

      {/* Content */}
      <ScrollReveal>
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
          {/* Thin decorative line */}
          <div className="w-12 h-[2px] bg-accent-blue mx-auto mb-10" />

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
            Ready to Compete at the Next Level?
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto mb-10">
            Join Southern Ohio&apos;s most ambitious lacrosse community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-lg hover:bg-accent-blue-hover transition-colors min-w-[220px]"
            >
              View Summer Schedule
            </Link>
            <Link
              href="mailto:kathleen@youfirstelitelacrosseclub.com"
              className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/30 text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-lg hover:bg-white/10 hover:border-white/50 transition-all min-w-[220px]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
