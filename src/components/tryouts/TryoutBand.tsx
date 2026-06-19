import Image from "next/image";
import ScrollReveal from "@/components/home/ScrollReveal";
import { TRYOUT_PHOTOS } from "@/lib/tryouts";

/**
 * Cinematic full-bleed photo band between the dates and the form. Pure
 * atmosphere — swap the image via TRYOUT_PHOTOS.band in src/lib/tryouts.ts.
 */
export default function TryoutBand() {
  return (
    <section className="relative h-[60vh] min-h-[420px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 animate-ken-burns">
        <Image
          src={TRYOUT_PHOTOS.band}
          alt="You. First athletes together on the field"
          fill
          className="object-cover object-[center_40%]"
          sizes="100vw"
        />
      </div>
      {/* Dark overlay for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 50%, rgba(10,10,11,0.85) 100%)",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <ScrollReveal>
          <div className="w-12 h-[2px] bg-accent-blue mx-auto mb-8 rounded-full" />
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <p className="text-[2rem] sm:text-[3rem] lg:text-[3.5rem] font-extrabold leading-[1.0] tracking-[-0.02em] text-white uppercase">
            Build &amp; Bring the
            <br />
            Best <span className="text-accent-blue">Together.</span>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
