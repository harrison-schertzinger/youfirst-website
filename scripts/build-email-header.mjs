#!/usr/bin/env node
/**
 * Build the placement-email header band.
 *
 *   node scripts/build-email-header.mjs
 *
 * DROP PHOTOS HERE:  public/images/email/incoming/
 * Anything in that folder is used. With the folder empty it falls back to the
 * strongest action frames already in the repo, so there is always something to
 * look at.
 *
 * WHY THE OUTPUT IS A FLAT IMAGE, NOT CSS:
 * Gmail strips mix-blend-mode, Outlook's Word engine ignores CSS gradients
 * entirely, and a header that half-renders is worse than a plain photograph.
 * So the gradient work is done HERE — composed in HTML where blend modes and
 * webfonts behave, then screenshotted to a single JPEG the email just <img>s.
 *
 * THE PALETTE IS THE LIVE SITE'S, not invented. Every stop is lifted from
 * src/app/globals.css so the email and youfirstlacrosse.com agree:
 *   #1A1A1A → #2D6E9E → #4B9CD3   (.gradient-text-accent)
 *   #4B9CD3 → #9CC5EF → #FFFFFF   (.gradient-text-blue)
 *   #0A1A2F                        (the email's own ground)
 * There is no green anywhere. The blue-to-green aurora belongs to YOU.PRJCT+,
 * a different brand, and must never appear here.
 */

import { execFileSync } from "node:child_process";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const INCOMING = path.join(ROOT, "public/images/email/incoming");
const OUT_DIR = path.join(ROOT, "public/images/email");
const WORK = path.join(ROOT, "documents/email-header-build");

// 2x for retina; the email renders it at 600 wide.
const W = 1200;
const H = 420;

// ── Palette, from src/app/globals.css ────────────────────────────────────
const INK = "#0A1A2F"; // the email's ground — the band melts into it
const CAROLINA = "#4B9CD3";
const MID = "#2D6E9E";
const LIGHT = "#9CC5EF";

/** Used when the drop folder is empty, so there is always a render to judge. */
const FALLBACK = [
  "public/images/new-photos/levels-elite.jpg",
  "public/images/new-photos/IMG_1949.jpg",
  "public/images/new-photos/IMG_1947.jpg",
];

const TREATMENTS = {
  // Carolina ribbons sweeping across the band — the most "aurora" of the three.
  aurora: {
    label: "Aurora",
    // Ribbons kept off the centre so the athlete still reads through them —
    // the photograph is the subject, the wash is the light falling on it.
    layers: `
      <div class="l" style="background:
        radial-gradient(105% 165% at 6% 120%, ${CAROLINA}a6 0%, ${MID}59 30%, transparent 62%),
        radial-gradient(80% 135% at 92% -30%, ${LIGHT}80 0%, ${CAROLINA}40 36%, transparent 66%);
        mix-blend-mode:screen"></div>
      <div class="l" style="background:
        linear-gradient(104deg, ${INK}e6 0%, ${INK}40 30%, transparent 56%, ${MID}4d 82%, ${CAROLINA}66 100%);
        mix-blend-mode:overlay"></div>`,
    wordmark: "left",
  },
  // Heavier ground, one Carolina sweep out of the lower left. Most restrained.
  deep: {
    label: "Deep",
    layers: `
      <div class="l" style="background:
        radial-gradient(150% 200% at 0% 130%, ${CAROLINA}b3 0%, ${MID}66 38%, transparent 70%);
        mix-blend-mode:screen"></div>
      <div class="l" style="background:
        linear-gradient(180deg, ${INK}b3 0%, ${INK}40 42%, ${INK}f7 100%)"></div>`,
    wordmark: "left",
  },
  // Photo stays most visible; Carolina reads as a rim-light along the top edge.
  edge: {
    label: "Edge",
    layers: `
      <div class="l" style="background:
        linear-gradient(180deg, ${CAROLINA}d9 0%, ${CAROLINA}40 9%, transparent 26%);
        mix-blend-mode:screen"></div>
      <div class="l" style="background:
        linear-gradient(180deg, ${INK}59 0%, transparent 34%, ${INK}e6 100%)"></div>`,
    wordmark: "left",
  },
};

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  process.env.CHROME_PATH,
].filter(Boolean);

function findChrome() {
  for (const c of CHROME) if (fs.existsSync(c)) return c;
  throw new Error("No Chrome found. Set CHROME_PATH.");
}

function page(photoUrl, t) {
  const pos =
    t.wordmark === "center"
      ? "align-items:center;justify-content:center;text-align:center"
      : "align-items:flex-end;justify-content:flex-start;padding:0 0 46px 54px";
  return `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;background:${INK};overflow:hidden}
  .band{position:relative;width:${W}px;height:${H}px;isolation:isolate;background:${INK}}
  /* Grayscale + a touch of contrast: the photo carries form, the wash carries colour. */
  /* Already cropped to the band by sharp's saliency pass, so no object-fit
     guesswork here — a blind centre crop cut the athletes' faces off. */
  .ph{position:absolute;inset:0;width:100%;height:100%;
      filter:grayscale(1) contrast(1.14) brightness(.86)}
  .l{position:absolute;inset:0}
  /* The bottom edge dissolves into the email's ground so the band is not a
     pasted rectangle sitting on navy. */
  .melt{position:absolute;left:0;right:0;bottom:0;height:34%;
        background:linear-gradient(180deg,transparent 0%,${INK} 100%)}
  /* A soft scrim under the wordmark corner so "ELITE LACROSSE" survives a
     busy frame. Sized to the type, not the band — it must not read as a bar. */
  .scrim{position:absolute;left:0;bottom:0;width:62%;height:58%;
         background:radial-gradient(90% 120% at 12% 92%, ${INK}d9 0%, ${INK}8c 42%, transparent 76%)}
  .mark{position:absolute;inset:0;display:flex;${pos}}
  .wm{font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;
      font-weight:800;font-size:64px;letter-spacing:-.02em;line-height:1;color:#fff;
      text-shadow:0 2px 26px rgba(10,26,47,.62)}
  .wm .dot{color:${CAROLINA}}
  .sub{font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;
       font-weight:700;font-size:15px;letter-spacing:.30em;text-transform:uppercase;
       color:rgba(255,255,255,.82);margin-top:14px;text-shadow:0 1px 14px rgba(10,26,47,.7)}
</style>
<div class="band">
  <img class="ph" src="${photoUrl}">
  ${t.layers}
  <div class="melt"></div>
  ${t.wordmark === "left" ? '<div class="scrim"></div>' : ""}
  <div class="mark"><div>
    <div class="wm">YOU<span class="dot">.</span> FIRST</div>
    <div class="sub">Elite Lacrosse</div>
  </div></div>
</div>`;
}

/**
 * Crop to the band with sharp's saliency attention, NOT a centre crop.
 * These are portrait frames; centring them cut the athletes' faces out of a
 * shallow band and left jerseys and torsos. Attention keeps the subject.
 */
async function bandCrop(photo, stem) {
  const out = path.join(WORK, `${stem}-band.jpg`);
  await sharp(photo)
    .rotate()
    .resize(W, H, { fit: "cover", position: sharp.strategy.attention })
    .jpeg({ quality: 92 })
    .toFile(out);
  return out;
}

async function main() {
  const chrome = findChrome();
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const dropped = fs.existsSync(INCOMING)
    ? fs
        .readdirSync(INCOMING)
        .filter((f) => /\.(jpe?g|png|heic|webp)$/i.test(f))
        .map((f) => path.join(INCOMING, f))
    : [];

  const photos = dropped.length
    ? dropped
    : FALLBACK.map((p) => path.join(ROOT, p)).filter(fs.existsSync);

  if (!photos.length) throw new Error("No photos to work with.");
  console.log(
    dropped.length
      ? `Using ${dropped.length} dropped photo(s) from public/images/email/incoming/`
      : `Drop folder empty — falling back to ${photos.length} action frames already in the repo.`,
  );

  const built = [];
  for (const photo of photos) {
    const stem = path.basename(photo).replace(/\.[^.]+$/, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const band = await bandCrop(photo, stem);
    for (const [key, t] of Object.entries(TREATMENTS)) {
      const html = page(pathToFileURL(band).href, t);
      const htmlPath = path.join(WORK, `${stem}-${key}.html`);
      fs.writeFileSync(htmlPath, html, "utf8");
      const out = path.join(OUT_DIR, `header-${stem}-${key}.jpg`);
      execFileSync(
        chrome,
        [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--force-device-scale-factor=1",
          `--window-size=${W},${H}`,
          `--screenshot=${out}`,
          "--virtual-time-budget=9000",
          pathToFileURL(htmlPath).href,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      built.push({ key, label: t.label, out, kb: (fs.statSync(out).size / 1024) | 0 });
    }
  }

  console.log("");
  for (const b of built) {
    console.log(`  ${b.label.padEnd(7)} ${path.relative(ROOT, b.out)}  ${b.kb} KB`);
  }
  console.log(
    `\nPoint the email at one by setting HERO in src/lib/placement/config.ts.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
