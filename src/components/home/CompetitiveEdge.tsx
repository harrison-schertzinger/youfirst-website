import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

const CARDS = [
  {
    src: "/images/players/IMG_0872.JPG",
    alt: "Three athletes in black .uoY tanks standing with lacrosse sticks on a sunny field",
    title: "Premier Training",
    description:
      "Our training academy delivers the most elite and effective schedule for player development in the region. We don't just practice — we build.",
  },
  {
    src: "/images/players/5CFB272B-41A2-4598-A063-D04E5DD9162D.JPG",
    alt: "Players standing arm-in-arm at golden hour with a lacrosse goal behind them",
    title: "Unmatched Community",
    description:
      "You will find friends who make working hard second nature, fun, and cool. Community is the key ingredient to consistency — and consistency is what separates good from great.",
  },
];

export default function CompetitiveEdge() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-background" id="competitive-edge">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-4">The Competitive Edge</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.02em]">
              <span className="gradient-text">Your Competitive Edge</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Two magazine-style photo cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[1040px] mx-auto">
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 200}>
              <div className="group bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 h-full flex flex-col">
                {/* Photo — full-bleed within card */}
                <div className="relative w-full h-[260px] sm:h-[280px] overflow-hidden">
                  <Image
                    src={card.src}
                    alt={card.alt}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-[1.03] group-hover:brightness-105"
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                  {/* Subtle gradient at bottom of photo for blending */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/20 to-transparent" />
                </div>
                {/* Text */}
                <div className="p-8 lg:p-10 flex-1">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-3 tracking-[-0.01em]">
                    {card.title}
                  </h3>
                  <p className="text-[15px] text-[#6B7280] leading-[1.75]">
                    {card.description}
                  </p>
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
