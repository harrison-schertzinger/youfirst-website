import ScrollReveal from "./ScrollReveal";

export default function Mission() {
  return (
    <section className="py-24 sm:py-32 lg:py-40" id="mission">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image placeholder */}
          <ScrollReveal>
            <div
              className="photo-placeholder rounded-2xl aspect-[4/5] max-h-[560px] w-full"
              role="img"
              aria-label="Player in action — photo coming soon"
            >
              <span>PHOTO</span>
            </div>
          </ScrollReveal>

          {/* Text content */}
          <ScrollReveal delay={150}>
            <div className="max-w-lg">
              <p className="section-label mb-4">Our Mission</p>
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-text-primary leading-tight mb-8">
                Train to Be the Best{" "}
                <span className="text-accent-blue">You.</span>
              </h2>
              <div className="space-y-5">
                <p className="text-base sm:text-[17px] text-text-secondary leading-relaxed">
                  Our mission is to build the best players Southern Ohio has to
                  offer, showcase them at the biggest events against the top
                  competition in the country.
                </p>
                <p className="text-base sm:text-[17px] text-text-secondary leading-relaxed">
                  We develop the individual first, because when you become the
                  best version of yourself, the lacrosse takes care of itself.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
