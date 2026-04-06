import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

const CARDS = [
  {
    number: "01",
    src: "/images/players/IMG_0872.JPG",
    alt: "Three athletes in black .uoY tanks standing with lacrosse sticks on a sunny field",
    title: "Premier Training",
    description:
      "Our training academy delivers the most elite and effective schedule for player development in the region. We don't just practice — we build.",
    link: "/schedule",
    linkText: "View our schedule",
  },
  {
    number: "02",
    src: "/images/players/5CFB272B-41A2-4598-A063-D04E5DD9162D.JPG",
    alt: "Players standing arm-in-arm at golden hour with a lacrosse goal behind them",
    title: "Unmatched Community",
    description:
      "You will find friends who make working hard second nature, fun, and cool. Community is the key ingredient to consistency — and consistency is what separates good from great.",
    link: "/about",
    linkText: "See our community",
  },
];

export default function CompetitiveEdge() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-background" id="competitive-edge">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-5">The Competitive Edge</p>
            <h2 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold tracking-tight leading-[1.0]">
              <span className="text-[#1A1A1A]">Your </span>
              <span className="gradient-text-accent">Competitive Edge</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Two magazine-style photo cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[1080px] mx-auto">
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 200}>
              <div className="group bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 h-full flex flex-col">
                {/* Photo — full-bleed within card */}
                <div className="relative w-full h-[280px] sm:h-[300px] overflow-hidden">
                  <Image
                    src={card.src}
                    alt={card.alt}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-[1.03] group-hover:brightness-105"
                    sizes="(max-width: 768px) 100vw, 520px"
                  />
                </div>
                {/* Text */}
                <div className="p-8 lg:p-10 flex-1 flex flex-col">
                  {/* Number + Title */}
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-xs font-bold text-[#9CA3AF] tracking-wider">{card.number}</span>
                    <h3 className="text-xl font-bold text-accent-blue tracking-[-0.01em]">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-base text-[#6B7280] leading-[1.75] flex-1">
                    {card.description}
                  </p>
                  <Link
                    href={card.link}
                    className="arrow-link inline-flex items-center gap-2 mt-6 text-sm font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors duration-200"
                  >
                    {card.linkText}
                    <span className="arrow">&rarr;</span>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Gradient divider at bottom */}
      <div className="gradient-divider mt-24 sm:mt-32 lg:mt-40" />
    </section>
  );
}
