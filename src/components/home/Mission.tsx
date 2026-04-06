import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

export default function Mission() {
  return (
    <section className="py-24 sm:py-32 lg:py-40" id="mission">
      {/* Gradient divider at top */}
      <div className="gradient-divider mb-24 sm:mb-32 lg:mb-40" />

      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Photo with premium treatment */}
          <ScrollReveal>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/5] max-h-[560px] w-full shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
              <Image
                src="/images/training/8746A0BD-0B75-4A2B-8754-EDB89F150FE1_Original.jpg"
                alt="Coach guiding two athletes through resistance band training inside The Barn"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </ScrollReveal>

          {/* Text content */}
          <div className="max-w-lg">
            <ScrollReveal>
              <p className="section-label mb-4">Our Mission</p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-8 tracking-[-0.01em]">
                <span className="gradient-text">Train to Be the Best</span>{" "}
                <span className="text-accent-blue">You.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="space-y-5">
                <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                  Our mission is to build the best players Southern Ohio has to
                  offer, showcase them at the biggest events against the top
                  competition in the country.
                </p>
                <p className="text-base sm:text-lg text-[#6B7280] leading-relaxed">
                  We develop the individual first, because when you become the
                  best version of yourself, the lacrosse takes care of itself.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
