// Fills the photo-slot system from the inbox.
// Drop photos named after their slot (e.g. backyard.jpg) into
// public/images/new-photos, then run:  node scripts/optimize-slots.mjs
// Each is EXIF-rotated, metadata-stripped, resized (max 2400px, never
// upscaled), compressed, and written to public/images/slots/<same name>.
import sharp from "sharp";
import { mkdirSync, existsSync, readdirSync } from "node:fs";

const IN = "public/images/new-photos/";
const OUT = "public/images/slots/";

const SLOT_NAMES = [
  "resource-club.jpg",
  "resource-academy.jpg",
  "resource-youprjct.jpg",
  "backyard.jpg",
  "levels-jumpstart.jpg",
  "levels-launch.jpg",
  "levels-elite.jpg",
];

mkdirSync(OUT, { recursive: true });
const inbox = readdirSync(IN);

let filled = 0;
for (const slot of SLOT_NAMES) {
  // case-insensitive match, tolerate .jpeg/.JPG variants of the same stem
  const stem = slot.replace(/\.jpg$/, "").toLowerCase();
  const match = inbox.find((f) => {
    const base = f.toLowerCase().replace(/\.(jpe?g|png)$/i, "");
    return base === stem || base === stem.replace(/^levels-/, "level-");
  });
  if (!match) {
    console.log(`— ${slot}  (not in inbox yet)`);
    continue;
  }
  await sharp(IN + match)
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(OUT + slot);
  console.log(`✓ ${slot}  ←  ${match}`);
  filled++;
}
console.log(`${filled}/${SLOT_NAMES.length} slots filled.`);
