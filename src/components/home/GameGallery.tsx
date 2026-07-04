import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

// Real game photography — the proof behind "reps against real competition."
const SHOTS = [
  {
    src: "/images/game/game-dodge.jpg",
    alt: "You First player #3 dodging past a defender in a tournament game",
    caption: "Beating her defender",
  },
  {
    src: "/images/game/game-sprint-12.jpg",
    alt: "You First player #12 sprinting upfield in the black game uniform",
    caption: "Pushing tempo",
  },
  {
    src: "/images/game/game-defense-5.jpg",
    alt: "You First player #5 sliding into defensive position on turf",
    caption: "Team defense",
  },
];

export default function GameGallery() {
  return (
    <section className="pb-24 sm:pb-32 bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex items-baseline justify-between gap-4 mb-8">
            <p className="section-label">Game Day</p>
            <p className="text-sm text-text-muted">Real reps. Real competition.</p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {SHOTS.map((shot, i) => (
            <ScrollReveal key={shot.src} delay={i * 120}>
              <figure className="relative rounded-2xl overflow-hidden group shadow-[0_4px_20px_rgba(10,10,10,0.10)] aspect-[4/5]">
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
