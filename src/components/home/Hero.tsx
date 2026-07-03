"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MISSION } from "@/lib/program";

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const reveal = `transition-all duration-700 ${
    loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
  }`;

  return (
    <section className="relative bg-white pt-32 sm:pt-40 pb-16 sm:pb-24 overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Tryouts chip */}
          <div className={reveal}>
            <Link
              href="/tryouts"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-accent-wash border border-[#D4E6F5] mb-8 hover:border-accent-blue transition-colors duration-200"
            >
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-[13px] text-accent-blue-hover tracking-[0.12em] uppercase font-semibold">
                Tryouts · Saturday, July 11
              </span>
            </Link>
          </div>

          {/* Headline */}
          <h1
            className={reveal}
            style={{ transitionDelay: "150ms" }}
          >
            <span className="block text-[2.4rem] sm:text-[3.6rem] lg:text-[4.4rem] font-extrabold tracking-[-0.025em] leading-[1.04] text-text-primary text-balance">
              {MISSION.headline}
            </span>
            <span className="block text-[2.4rem] sm:text-[3.6rem] lg:text-[4.4rem] font-extrabold tracking-[-0.025em] leading-[1.04] text-accent-blue text-balance">
              {MISSION.headlineAccent}
            </span>
          </h1>

          {/* Subline — the clarity promise */}
          <p
            className={`mt-7 text-lg sm:text-xl text-text-secondary leading-[1.7] max-w-2xl mx-auto ${reveal}`}
            style={{ transitionDelay: "300ms" }}
          >
            Girls&apos; lacrosse in Cincinnati, built around one promise: every
            price, the whole season, and the full path — published right here.
            No &ldquo;text Coach for details.&rdquo;
          </p>

          {/* CTAs */}
          <div
            className={`mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 ${reveal}`}
            style={{ transitionDelay: "450ms" }}
          >
            <Link
              href="/tryouts"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:shadow-[0_4px_24px_rgba(75,156,211,0.55)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 min-w-[230px]"
            >
              Register for Tryouts — $50
            </Link>
            <a
              href="#programs"
              className="inline-flex items-center justify-center px-8 py-4 border-[1.5px] border-[#D8DDE3] text-text-primary text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:border-accent-blue hover:text-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300 min-w-[230px]"
            >
              Programs &amp; Pricing
            </a>
          </div>
        </div>

        {/* Team photo tile */}
        <div
          className={`mt-14 sm:mt-20 ${reveal}`}
          style={{ transitionDelay: "600ms" }}
        >
          <div className="relative rounded-3xl overflow-hidden shadow-[0_12px_50px_rgba(10,10,10,0.14)] aspect-[4/3] sm:aspect-[21/10]">
            <Image
              src="/images/team/DSC09764_Original.JPG"
              alt="You First team in blue jerseys huddled arm-in-arm on the field"
              fill
              className="object-cover object-[center_40%]"
              sizes="(max-width: 1280px) 100vw, 1216px"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
