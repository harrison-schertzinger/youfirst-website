import ScrollReveal from "./ScrollReveal";

const CARDS = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor">
        <path d="M18 3C9.716 3 3 9.716 3 18s6.716 15 15 15 15-6.716 15-15S26.284 3 18 3zm0 27c-6.627 0-12-5.373-12-12S11.373 6 18 6s12 5.373 12 12-5.373 12-12 12z" opacity="0.3" />
        <circle cx="18" cy="18" r="7" opacity="0.6" />
        <circle cx="18" cy="18" r="3" />
      </svg>
    ),
    title: "Premier Training",
    description:
      "Our training academy delivers the most elite and effective schedule for player development in the region. We don't just practice — we build.",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor">
        <circle cx="18" cy="10" r="5" />
        <path d="M18 17c-5.523 0-10 3.582-10 8v2h20v-2c0-4.418-4.477-8-10-8z" />
        <circle cx="28" cy="12" r="3.5" opacity="0.4" />
        <path d="M28 17.5c-1.5 0-2.9.4-4 1.1 1.8 1.6 3 3.8 3.3 6.4H33v-1.5c0-3.3-2.2-6-5-6z" opacity="0.4" />
        <circle cx="8" cy="12" r="3.5" opacity="0.4" />
        <path d="M8 17.5c1.5 0 2.9.4 4 1.1-1.8 1.6-3 3.8-3.3 6.4H3v-1.5c0-3.3 2.2-6 5-6z" opacity="0.4" />
      </svg>
    ),
    title: "Unmatched Community",
    description:
      "You will find friends who make working hard second nature, fun, and cool. Community is the key ingredient to consistency — and consistency is what separates good from great.",
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor">
        <path d="M18 4l4.5 9.5H32l-7.5 5.8L27.5 30 18 24l-9.5 6 3-10.7L4 13.5h9.5L18 4z" />
      </svg>
    ),
    title: "Elite Mentorship",
    description:
      "Train alongside and be coached by college-level players and coaches who have walked the path you're walking. Learn from experience, not just instruction.",
  },
] as const;

export default function CompetitiveEdge() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 bg-background" id="competitive-edge">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="section-label mb-4">The Competitive Edge</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
              The YOU. FIRST Difference
            </h2>
          </div>
        </ScrollReveal>

        {/* Cards — staggered reveal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 120}>
              <div className="card text-center h-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-blue/10 text-accent-blue mb-6">
                  {card.icon}
                </div>
                <h3 className="text-[17px] font-semibold text-text-primary mb-3">
                  {card.title}
                </h3>
                <p className="text-[15px] text-text-secondary leading-[1.7]">
                  {card.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
