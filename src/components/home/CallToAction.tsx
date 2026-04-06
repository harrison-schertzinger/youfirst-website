import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

export default function CallToAction() {
  return (
    <section className="py-24 sm:py-32 lg:py-40" id="cta">
      <ScrollReveal>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-5">
            Ready to Compete at the Next Level?
          </h2>
          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10">
            Join Southern Ohio&apos;s most ambitious lacrosse community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-accent-blue text-white text-sm font-semibold uppercase tracking-[0.08em] rounded-lg hover:bg-accent-blue-hover transition-colors min-w-[220px]"
            >
              View Summer Schedule
            </Link>
            <Link
              href="mailto:kathleen@youfirstelitelacrosseclub.com"
              className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-accent-blue text-accent-blue text-sm font-semibold uppercase tracking-[0.08em] rounded-lg hover:bg-accent-blue hover:text-white transition-all min-w-[220px]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
