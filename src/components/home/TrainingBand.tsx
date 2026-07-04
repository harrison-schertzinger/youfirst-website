import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

// Training-culture texture — the work behind the game shots.
const SHOTS = [
  {
    src: "/images/game/training-1v1.jpg",
    alt: "Two players battling through a 1v1 defensive drill at summer training",
    caption: "1v1s every week",
  },
  {
    src: "/images/game/training-mentors.jpg",
    alt: "A college-player coach walking a young player through a drill",
    caption: "Coached by college players",
  },
  {
    src: "/images/game/training-clinic.jpg",
    alt: "A coach teaching a circle of young players at the summer clinic",
    caption: "Where the youngest teams start",
  },
];

export default function TrainingBand() {
  return (
    <section className="py-24 sm:py-32 bg-section-alt">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex items-baseline justify-between gap-4 mb-8">
            <p className="section-label">The Work</p>
            <p className="text-sm text-text-muted">Summer training at the Cincinnati Lacrosse Academy.</p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 items-start">
          {SHOTS.map((shot, i) => (
            <ScrollReveal key={shot.src} delay={i * 120} className={i === 1 ? "sm:mt-10" : ""}>
              <figure className="relative rounded-2xl overflow-hidden group shadow-[0_4px_20px_rgba(10,10,10,0.10)] aspect-[3/4]">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <figcaption className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#0A0A0A]/75 to-transparent">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/90">
                    {shot.caption}
                  </span>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
