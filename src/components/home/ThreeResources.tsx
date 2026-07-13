import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";

const RESOURCES = [
  {
    name: "YOU. FIRST",
    label: "The club.",
    body: "Where the best come together to compete and grow. Great teammates, great coaching, and a standard worth rising to.",
    linkText: "Explore the teams",
    href: "/levels",
    external: false,
    slot: "resource-club.jpg",
  },
  {
    name: "THE ACADEMY",
    label: "The next level.",
    body: "Cincinnati Lacrosse Academy. Deeper skill work and strength training for players ready to chase more.",
    linkText: "Inside the Academy",
    href: "https://cincinnatilacrosseacademy.com/",
    external: true,
    slot: "resource-academy.jpg",
  },
  {
    name: "YOU.PRJCT+",
    label: "The standard, daily.",
    body: "The performance platform that carries the habits, lifestyle, and support that turn ambition into a way of living.",
    linkText: "See the platform",
    href: "https://www.youprjct.com/",
    external: true,
    slot: "resource-youprjct.jpg",
  },
];

interface ThreeResourcesProps {
  eyebrow?: string;
  headingStart?: string;
  headingFade?: string;
  sub?: string;
}

export default function ThreeResources({
  eyebrow = "One Conviction, Three Resources",
  headingStart = "WE BUILD",
  headingFade = "THE BEST",
  sub = "Everything we do grows from that. Here is how it reaches a player, wherever she is.",
}: ThreeResourcesProps) {
  return (
    <section className="py-24 sm:py-32 bg-background">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-14">
            <p className="section-label mb-5">{eyebrow}</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.0] text-[#1A1A1A]">
              {headingStart} <span className="gradient-text-accent">{headingFade}</span>
            </h2>
            <p className="mt-5 text-lg text-[#6B7280] leading-[1.75]">{sub}</p>
          </div>
        </ScrollReveal>

        {/* Quiet Carolina connector — one ethos, three expressions (desktop) */}
        <ScrollReveal>
          <svg
            viewBox="0 0 1200 20"
            className="hidden lg:block w-full h-5 mb-8"
            aria-hidden="true"
          >
            <path d="M200 10 H1000" stroke="#4B9CD3" strokeWidth="1.5" opacity="0.35" />
            <circle cx="200" cy="10" r="5" fill="#4B9CD3" />
            <circle cx="600" cy="10" r="5" fill="#4B9CD3" />
            <circle cx="1000" cy="10" r="5" fill="#4B9CD3" />
          </svg>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {RESOURCES.map((r, i) => (
            <ScrollReveal key={r.name} delay={i * 120} className="h-full">
              <div className="card h-full flex flex-col overflow-hidden">
                <div className="relative h-48 sm:h-52 keep-color">
                  <PhotoSlot
                    name={r.slot}
                    alt={`${r.name} — ${r.label}`}
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                </div>
                <div className="p-7 sm:p-8 flex flex-col flex-1">
                  <h3 className="text-xl font-bold tracking-[-0.01em] text-[#1A1A1A]">
                    {r.name}
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                    {r.label}
                  </p>
                  <p className="mt-4 text-[15px] text-[#6B7280] leading-[1.7] flex-1">
                    {r.body}
                  </p>
                  {r.external ? (
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="arrow-link mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors duration-200"
                    >
                      {r.linkText}
                      <span className="arrow">→</span>
                    </a>
                  ) : (
                    <Link
                      href={r.href}
                      className="arrow-link mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors duration-200"
                    >
                      {r.linkText}
                      <span className="arrow">→</span>
                    </Link>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
