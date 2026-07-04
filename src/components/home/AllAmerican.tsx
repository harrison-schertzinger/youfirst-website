import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

// 8 regional All-American marks — 7 filled Carolina blue, 1 outlined.
// Real type + graphics; no baked image.
const MARKS = [true, true, true, true, true, true, true, false];

export default function AllAmerican() {
  return (
    <section className="relative py-28 sm:py-36 bg-[#0A0A0B] overflow-hidden">
      {/* Darkened game photography */}
      <div className="absolute inset-0">
        <Image
          src="/images/players/all-american-bg.jpg"
          alt=""
          fill
          className="object-cover object-[center_30%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0A0A0B]/80" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 flex flex-col items-center text-center gap-8">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4B9CD3]">
            Regional All-Americans
          </p>
        </ScrollReveal>

        {/* 7 of 8 — at a glance */}
        <ScrollReveal delay={100}>
          <div
            className="flex items-end gap-3 sm:gap-4"
            role="img"
            aria-label="7 of the region's 8 All-Americans, shown as 7 filled marks out of 8"
          >
            {MARKS.map((filled, i) => (
              <span
                key={i}
                className={
                  filled
                    ? "w-3.5 sm:w-4 h-14 sm:h-16 rounded-full bg-[#4B9CD3] shadow-[0_0_24px_rgba(75,156,211,0.45)]"
                    : "w-3.5 sm:w-4 h-14 sm:h-16 rounded-full border-2 border-white/40"
                }
              />
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <h2 className="text-[2.25rem] sm:text-[3rem] lg:text-[3.5rem] font-bold tracking-tight leading-[1.05] text-white max-w-3xl">
            We trained 7 of the region&apos;s 8 All-Americans.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <p className="text-lg text-white/70 leading-[1.75] max-w-2xl">
            Up from 5 of 8 the year before, and 3 more from out of state. We
            don&apos;t just develop players. We develop the best ones.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
