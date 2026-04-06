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
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
              YOUR COMPETITIVE EDGE
            </h2>
          </div>
        </ScrollReveal>

        {/* Two photo cards, centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[1040px] mx-auto">
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 120}>
              <div className="card p-0 overflow-hidden h-full flex flex-col">
                {/* Photo */}
                <div className="relative w-full h-[220px] sm:h-[240px]">
                  <Image
                    src={card.src}
                    alt={card.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                </div>
                {/* Text */}
                <div className="p-8 flex-1">
                  <h3 className="text-[17px] font-semibold text-text-primary mb-3">
                    {card.title}
                  </h3>
                  <p className="text-[15px] text-text-secondary leading-[1.7]">
                    {card.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
