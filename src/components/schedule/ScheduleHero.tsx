"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function ScheduleHero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[50vh] sm:min-h-[55vh] flex items-center justify-center overflow-hidden">
      {/* Background photo */}
      <div className="absolute inset-0">
        <Image
          src="/images/team/DSC09932_Original.JPG"
          alt="You. First team in blue jerseys huddled arm-in-arm on the field at St. Paul's School"
          fill
          className="object-cover object-[center_40%]"
          sizes="100vw"
          priority
        />
      </div>

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(0,0,0,0.7) 0%,
              rgba(0,0,0,0.55) 40%,
              rgba(0,0,0,0.5) 60%,
              rgba(0,0,0,0.65) 100%
            )
          `,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 text-center pt-32 pb-20 sm:pt-36 sm:pb-24">
        <div
          className={`transition-all duration-700 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
        >
          <p className="section-label mb-5">Summer 2026</p>
        </div>

        <h1
          className={`text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-tight leading-[0.95] mb-6 transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "150ms", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}
        >
          <span className="text-white">Season </span>
          <span className="gradient-text-blue">Schedule</span>
        </h1>

        <p
          className={`text-lg sm:text-xl text-white/60 font-light max-w-lg mx-auto transition-all duration-800 ${
            loaded
              ? "opacity-100 translate-y-0 blur-0"
              : "opacity-0 translate-y-4 blur-sm"
          }`}
          style={{ transitionDelay: "300ms", textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
        >
          Your complete guide to the season ahead.
        </p>
      </div>
    </section>
  );
}
