// Web-optimizes photos dropped into public/images/new-photos (the inbox).
// Run:  node scripts/optimize-photos.mjs
// - auto-rotates from EXIF, strips all metadata (sharp default)
// - resizes to max 2400px wide, NEVER upscales
// - outputs mozjpeg quality-80 files into public/images/game/
// The inbox folder is gitignored; only optimized copies ship.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const IN = "public/images/new-photos/";
const OUT = "public/images/game/";
mkdirSync(OUT, { recursive: true });

// slug: output name · file: inbox source · trim: optional bottom-crop fraction
const PHOTOS = [
  { slug: "game-dodge", file: "IMG_1946.jpg" },
  { slug: "game-sprint-12", file: "IMG_1944.jpg" },
  { slug: "game-defense-5", file: "IMG_1947.jpg" },
  { slug: "game-lockdown-6", file: "IMG_1949.jpg", trim: 0.14 }, // crop IG sticker
  { slug: "game-save-88", file: "IMG_2012.jpg" },
  { slug: "game-attack-22", file: "IMG_2013.jpg" },
  { slug: "training-1v1", file: "hannah-evie.jpg" },
  { slug: "training-mentors", file: "audrey+char.jpg" },
  { slug: "training-clinic", file: "DSC05334.JPG" },
];

for (const { slug, file, trim } of PHOTOS) {
  let img = sharp(IN + file).rotate(); // apply EXIF orientation
  const meta = await img.metadata();
  // metadata() is pre-rotation; swap dims for 90/270 EXIF orientations
  const rotated = meta.orientation && meta.orientation >= 5;
  const w = rotated ? meta.height : meta.width;
  const h = rotated ? meta.width : meta.height;
  if (trim) {
    img = img.extract({ left: 0, top: 0, width: w, height: Math.round(h * (1 - trim)) });
  }
  await img
    .resize({ width: 2400, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(OUT + slug + ".jpg");
  console.log(slug + ".jpg  ←  " + file);
}
console.log("done → " + OUT);
