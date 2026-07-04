"use client";

import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

const PHOTOS = [
  {
    src: "/images/team/DWW07271.JPG",
    alt: "Team huddled together before a game under bright stadium lights",
  },
  {
    src: "/images/players/DSC05831.JPG",
    alt: "Player sprinting full speed with her stick cradled during a late afternoon practice",
  },
  {
    src: "/images/staff/IMG_0540.JPG",
    alt: "Coach directing players during an indoor training session",
  },
  {
    src: "/images/players/AE6E22F6-98AF-490C-8D3A-ADB96129AF19_Original.jpg",
    alt: "Two players arm-in-arm looking out at the field together",
  },
  {
    src: "/images/players/DSC02626.JPG",
    alt: "Coach and players laughing together at golden hour on the practice field",
  },
];

export default function PhotoStrip() {
  return (
    <section className="py-16 sm:py-24 overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex gap-4 sm:gap-6 items-end keep-color">
          {PHOTOS.map((photo, i) => (
            <ScrollReveal
              key={photo.src}
              delay={i * 150}
              className={`flex-1 min-w-0 ${
                i % 2 === 1 ? "mt-10 sm:mt-16" : ""
              }`}
            >
              <div className="relative rounded-2xl w-full group cursor-pointer overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.18)] transition-shadow duration-500" style={{ aspectRatio: "3/4.5" }}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover transition-all duration-700 group-hover:scale-[1.04] group-hover:brightness-110"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
