import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import { SITE_CONFIG } from "@/lib/constants";

export default function ContactSection() {
  return (
    <section className="py-20 sm:py-28 bg-section-alt scroll-mt-20" id="contact">
      <div className="mx-auto max-w-[880px] px-6 lg:px-8 text-center">
        <ScrollReveal>
          <p className="section-label mb-5">Contact &amp; Register</p>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] leading-[1.1] text-text-primary text-balance">
            Ready when you are.
          </h2>
          <p className="mt-5 text-lg text-text-secondary leading-[1.75] max-w-xl mx-auto">
            Register for tryouts in two minutes, or email us directly — a real
            person answers.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/tryouts"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300 min-w-[220px]"
            >
              Register for Tryouts
            </Link>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="inline-flex items-center justify-center px-8 py-4 border-[1.5px] border-[#D8DDE3] text-text-primary text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:border-accent-blue hover:text-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300 min-w-[220px]"
            >
              {SITE_CONFIG.email}
            </a>
          </div>
          <p className="mt-6 text-sm text-text-muted">
            Current families:{" "}
            <Link href="/fees" className="text-accent-blue-hover font-semibold hover:underline">
              sign in to the Player Portal
            </Link>{" "}
            to manage payments and player info.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
