#!/usr/bin/env node
/**
 * Build the two Club Standard PDFs.
 *
 *   node scripts/build-club-standard.mjs
 *
 * HTML → PDF through headless Chrome, which is already on this machine. The
 * PDF is built here and COMMITTED, rather than rendered on demand in a
 * serverless function: a placement receipt must not depend on a headless
 * browser cold-starting on Vercel, and the document changes a handful of times
 * a year.
 *
 * Output: public/documents/club-standard-{tournament,elite-youth}.pdf
 *
 * While any [[ ]] block survives in content.mjs the pages carry a DRAFT rule,
 * so a draft attached to a receipt by accident is unmistakable.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { VARIANTS } from "../documents/club-standard/content.mjs";
import { renderDocument, unwrittenIn } from "../documents/club-standard/render.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const BUILD_DIR = path.join(ROOT, "documents", "club-standard", "build");
const OUT_DIR = path.join(ROOT, "public", "documents");
const COVER = path.join(
  ROOT,
  "public/images/players/5CFB272B-41A2-4598-A063-D04E5DD9162D.JPG",
);

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  process.env.CHROME_PATH,
].filter(Boolean);

function findChrome() {
  for (const c of CHROME_CANDIDATES) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    `No Chrome found. Set CHROME_PATH, or install Google Chrome.\nTried:\n  ${CHROME_CANDIDATES.join("\n  ")}`,
  );
}

function main() {
  const chrome = findChrome();
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(COVER)) {
    console.warn(`! Cover image missing: ${COVER} — building without it.`);
  }
  const coverUrl = fs.existsSync(COVER) ? pathToFileURL(COVER).href : null;

  let anyDraft = false;

  for (const variant of Object.values(VARIANTS)) {
    const unwritten = unwrittenIn(variant.key);
    if (unwritten.length) anyDraft = true;

    const html = renderDocument(variant.key, coverUrl);
    const htmlPath = path.join(BUILD_DIR, `${variant.key}.html`);
    fs.writeFileSync(htmlPath, html, "utf8");

    const pdfPath = path.join(OUT_DIR, variant.file);
    execFileSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    const bytes = fs.statSync(pdfPath).size;
    console.log(
      `✓ ${variant.file}  ${(bytes / 1024).toFixed(0)} KB${
        unwritten.length ? `  — DRAFT (${unwritten.length} sections unwritten)` : ""
      }`,
    );
    if (unwritten.length) {
      for (const s of unwritten) console.log(`    · ${s}`);
    }
  }

  if (anyDraft) {
    console.log(
      "\nThese are DRAFTS. Every page carries a draft rule until the [[ ]] blocks\nin documents/club-standard/content.mjs are written. Re-run this script after.",
    );
  }
}

main();
