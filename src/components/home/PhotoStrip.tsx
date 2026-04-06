const PHOTOS = [
  { label: "Game Day", aspect: "aspect-[4/3]" },
  { label: "Training", aspect: "aspect-[3/4]" },
  { label: "Team", aspect: "aspect-[4/3]" },
  { label: "Tournament", aspect: "aspect-[3/4]" },
  { label: "Celebration", aspect: "aspect-[4/3]" },
] as const;

export default function PhotoStrip() {
  return (
    <section className="py-16 sm:py-20 overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex gap-3 sm:gap-4 items-end">
          {PHOTOS.map((photo, i) => (
            <div
              key={photo.label}
              className={`flex-1 min-w-0 ${photo.aspect} ${
                i % 2 === 1 ? "mt-6 sm:mt-8" : ""
              }`}
            >
              <div
                className="photo-placeholder rounded-xl sm:rounded-2xl w-full h-full group cursor-pointer overflow-hidden"
                role="img"
                aria-label={`${photo.label} photo — coming soon`}
              >
                <div className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                  <span className="text-[10px] sm:text-xs">{photo.label.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
