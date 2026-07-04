import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";

// ── Photo-slot system ────────────────────────────────────────────────────────
// Every image spot in the newer sections loads a FIXED filename from
// public/images/slots/. Drop a photo with the right name into the inbox
// (public/images/new-photos), run `node scripts/optimize-slots.mjs`, and the
// spot fills itself on the next deploy. Until then: a tasteful dark
// placeholder with the expected filename in the corner, so nothing looks
// broken and it's obvious what to name each photo.

interface PhotoSlotProps {
  /** Fixed filename, e.g. "backyard.jpg" — always looked up in /images/slots/ */
  name: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  /** object-position utility for the filled image */
  positionClassName?: string;
}

export default function PhotoSlot({
  name,
  alt,
  sizes = "100vw",
  priority = false,
  positionClassName = "object-center",
}: PhotoSlotProps) {
  const filled = existsSync(path.join(process.cwd(), "public", "images", "slots", name));

  if (filled) {
    return (
      <>
        <Image
          src={`/images/slots/${name}`}
          alt={alt}
          fill
          className={`object-cover ${positionClassName}`}
          sizes={sizes}
          priority={priority}
        />
        {/* whisper of Carolina — elegant gradient accent over the photo */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-[#4B9CD3]/[0.16] via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#0A0A0B] flex items-center justify-center">
      <svg viewBox="0 0 64 24" className="w-14 h-auto opacity-80" aria-hidden="true">
        <path d="M14 4 V20 M32 4 V20 M50 4 V20" stroke="#4B9CD3" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="absolute bottom-2.5 right-3.5 text-[10px] font-medium tracking-[0.08em] text-white/25 font-mono">
        {name}
      </span>
    </div>
  );
}
