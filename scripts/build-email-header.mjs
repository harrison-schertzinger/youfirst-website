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

/**
 * THREE TREATMENTS THAT ARE ACTUALLY THREE THINGS.
 *
 * A first pass produced three near-identical bands: same crop, same wordmark
 * corner, same scrim, and aurora ribbons positioned mostly outside the visible
 * area so the colour barely showed. If the differences need pointing out, they
 * are not treatments. Each of these differs in STRUCTURE — where the wordmark
 * sits, whether the photo is full-bleed, how colour is applied — not in
 * exposure.
 */
const TREATMENTS = {
  // A · AURORA — colour-forward. Bright Carolina ribbons sweep the full band,
  // blurred and screened so they read as light, not as a filter. Wordmark
  // centred and large. This one should look designed from across the room.
  aurora: {
    label: "Aurora",
    photo: "grayscale(1) contrast(1.05) brightness(1.02)",
    layers: `
      <div class="l ribbons" style="background:
        radial-gradient(46% 120% at 22% 78%, ${CAROLINA}f2 0%, ${CAROLINA}80 42%, transparent 74%),
        radial-gradient(38% 105% at 58% 12%, ${LIGHT}e6 0%, ${LIGHT}66 44%, transparent 76%),
        radial-gradient(52% 130% at 88% 88%, ${MID}f2 0%, ${MID}73 46%, transparent 78%);
        mix-blend-mode:screen;filter:blur(46px)"></div>
      <div class="l" style="background:
        linear-gradient(180deg, ${INK}59 0%, transparent 30%, ${INK}b3 100%)"></div>`,
    wordmark: "center",
    scrim: false,
  },

  // B · SPLIT — a solid navy panel carries the wordmark, the photograph owns
  // the rest, and a Carolina edge-light marks the seam. Structurally the most
  // different of the three: the type never sits on the picture.
  split: {
    label: "Split",
    photo: "grayscale(1) contrast(1.16) brightness(.92)",
    frame: "right",
    layers: `
      <div class="l" style="background:
        linear-gradient(90deg, transparent 0%, transparent 34%, ${INK}40 40%, transparent 62%)"></div>
      <div class="panel"></div>
      <div class="seam"></div>`,
    wordmark: "panel",
    scrim: false,
  },

  // C · DUOTONE — the photograph stops being a photograph. Luminance kept,
  // hue mapped navy → Carolina across the frame, so it reads as a graphic.
  // Wordmark small and bottom-left under a Carolina rule.
  duotone: {
    label: "Duotone",
    photo: "grayscale(1) contrast(1.34) brightness(1.06)",
    layers: `
      <div class="l" style="background:
        linear-gradient(118deg, ${INK} 0%, ${MID} 52%, ${CAROLINA} 100%);
        mix-blend-mode:color"></div>
      <div class="l" style="background:
        linear-gradient(118deg, ${INK}b3 0%, transparent 46%, ${CAROLINA}33 100%);
        mix-blend-mode:multiply"></div>
      <div class="l" style="background:
        linear-gradient(180deg, transparent 46%, ${INK}e6 100%)"></div>`,
    wordmark: "rule",
    scrim: false,
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
  const centred = t.wordmark === "center";
  const panel = t.wordmark === "panel";
  const PANEL_W = 40; // % of the band the navy panel occupies in SPLIT

  const markBox = centred
    ? `left:0;right:0;top:0;bottom:0;align-items:center;justify-content:center;text-align:center`
    : panel
      ? `left:0;top:0;bottom:0;width:${PANEL_W}%;align-items:center;justify-content:center;padding:0 34px;text-align:left`
      : `left:0;right:0;top:0;bottom:0;align-items:flex-end;justify-content:flex-start;padding:0 0 44px 54px`;

  return `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;background:${INK};overflow:hidden}
  .band{position:relative;width:${W}px;height:${H}px;isolation:isolate;background:${INK}}
  /* Cropped to the band by sharp's saliency pass, so no object-fit guesswork:
     a blind centre crop cut the athletes' faces off. */
  .ph{position:absolute;top:0;bottom:0;width:${t.frame === "right" ? 100 - PANEL_W : 100}%;
      ${t.frame === "right" ? `right:0;` : `left:0;`}
      height:100%;object-fit:cover;object-position:center;
      filter:${t.photo}}
  .l{position:absolute;inset:0}
  /* SPLIT: the solid panel the wordmark lives on, and the Carolina seam. */
  .panel{position:absolute;left:0;top:0;bottom:0;width:${PANEL_W}%;background:${INK}}
  .seam{position:absolute;left:${PANEL_W}%;top:0;bottom:0;width:3px;
        background:linear-gradient(180deg,${CAROLINA}00 0%,${CAROLINA} 38%,${LIGHT} 62%,${CAROLINA}00 100%)}
  /* The bottom edge dissolves into the email's ground so the band is not a
     rectangle pasted on navy. */
  .melt{position:absolute;left:0;right:0;bottom:0;height:26%;
        background:linear-gradient(180deg,transparent 0%,${INK} 100%)}
  .mark{position:absolute;display:flex;${markBox}}
  .wm{font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;
      font-weight:800;letter-spacing:-.02em;line-height:1;color:#fff;
      font-size:${centred ? 76 : panel ? 50 : 52}px;
      text-shadow:0 2px 30px rgba(10,26,47,.55)}
  .wm .dot{color:${CAROLINA}}
  .sub{font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;
       font-weight:700;font-size:${panel ? 12 : 14}px;letter-spacing:.30em;
       text-transform:uppercase;color:rgba(255,255,255,.86);margin-top:13px;
       text-shadow:0 1px 14px rgba(10,26,47,.7)}
  /* DUOTONE: a Carolina rule above the wordmark instead of a scrim. */
  .rule{width:74px;height:4px;background:${CAROLINA};margin-bottom:20px}
</style>
<div class="band">
  <img class="ph" src="${photoUrl}">
  ${t.layers}
  <div class="melt"></div>
  <div class="mark"><div>
    ${t.wordmark === "rule" ? '<div class="rule"></div>' : ""}
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
