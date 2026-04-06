import Image from "next/image";

const PHOTOS = [
  {
    src: "/images/team/DWW07274.JPG",
    alt: "Team raising lacrosse sticks skyward in unison before a game",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/players/DSC05831.JPG",
    alt: "Player sprinting full speed with her stick cradled during a late afternoon practice",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/staff/IMG_0540.JPG",
    alt: "Coach directing players during an indoor training session",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/players/AE6E22F6-98AF-490C-8D3A-ADB96129AF19_Original.jpg",
    alt: "Two players arm-in-arm looking out at the field together",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/players/DSC02626.JPG",
    alt: "Coach and players laughing together at golden hour on the practice field",
    aspect: "aspect-[3/4]",
  },
];

export default function PhotoStrip() {
  return (
    <section className="py-16 sm:py-20 overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex gap-3 sm:gap-4 items-end">
          {PHOTOS.map((photo, i) => (
            <div
              key={photo.src}
              className={`flex-1 min-w-0 ${photo.aspect} ${
                i % 2 === 1 ? "mt-6 sm:mt-8" : ""
              }`}
            >
              <div className="relative rounded-xl sm:rounded-2xl w-full h-full group cursor-pointer overflow-hidden">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
