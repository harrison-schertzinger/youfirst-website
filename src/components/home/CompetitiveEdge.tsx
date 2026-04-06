import ScrollReveal from "./ScrollReveal";

const CARDS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="6" />
        <circle cx="16" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
    title: "Premier Training",
    description:
      "Our training academy delivers the most elite and effective schedule for player development in the region. We don't just practice — we build.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4C12 4 8 6 8 10C8 14 12 16 16 16C20 16 24 14 24 10C24 6 20 4 16 4Z" />
        <path d="M6 28C6 22 10 18 16 18C22 18 26 22 26 28" />
        <path d="M22 6C24 6 28 8 28 11" />
        <path d="M10 6C8 6 4 8 4 11" />
      </svg>
    ),
    title: "Unmatched Community",
    description:
      "You will find friends who make working hard second nature, fun, and cool. Community is the key ingredient to consistency — and consistency is what separates good from great.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 6L20 14H28L22 19L24 27L16 22L8 27L10 19L4 14H12L16 6Z" />
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
              What Sets Us Apart
            </h2>
          </div>
        </ScrollReveal>

        {/* Cards — staggered reveal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 120}>
              <div className="card text-center h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-blue/10 text-accent-blue mb-6">
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-3">
                  {card.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
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
