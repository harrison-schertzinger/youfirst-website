# YOU. FIRST — Brand Identity / Visual System

**This document is the law.** Every website section and every social graphic obeys it,
so the club looks world-class and identical everywhere. It is written for two readers:
a human deciding what looks right, and a generator deciding what to render. When any
older style note conflicts with this document, **this document wins.**

Canonical copies live in two places and must stay identical:

- Website: `youfirst-website/BRAND-IDENTITY.md` (this file)
- Media machine: `~/Business-Empire/02-YouFirst-Lacrosse/media-machine/BRAND-IDENTITY.md`

---

## 1. Name + lockup

The name is **`YOU. FIRST`** — with a **period after YOU**, a space, then FIRST.

- The period is brand anatomy. It renders **Carolina Blue** on black and white
  grounds, and **white** on Carolina grounds. It never inherits the text color and
  is never dropped.
- **Never** `YOU • FIRST`, `YOU·FIRST`, `YOU * FIRST`, or any dot/bullet/star/glyph
  *between* the words. The only mark is the period after YOU.
- Wordmark is set in **Inter 800**, tight tracking (−0.02 to −0.03 em), all caps.

**The mark** is the real club badge — the circular crest (the mirrored `.uoY` circle
with the Cincinnati skyline, three stars, and "Founded on Passion · Built on Purpose ·
Measured on Progress"). Asset:

- Media machine: `assets/logos/you-first-elite.png`
- IG studio: `~/youfirst-ig-studio/logos/club/uoY-circle-mark-512.png`

This badge is the ONLY signature mark. It is never redrawn, recolored hue-wise, or
replaced with an invented icon. Its navy is part of the mark and is exempt from the
palette rule (like photography).

**Primary lockup:** the badge at cap-height ×2.2 of the wordmark, set left of
`YOU. FIRST`, optically centered, with a sub-line `ELITE LACROSSE · CINCINNATI`
(uppercase, tracked 0.16em, 60–74% ink) under the wordmark. The wordmark may appear
alone (site nav, footers); the badge may appear alone (avatars, watermarks, jersey
contexts). Nothing else is a signature.

## 2. Banned: the orb

The glossy blue 3D sphere/ball ("the orb") that has appeared on past graphics is
**permanently banned**. It is not the logo, not a decoration, not a background prop.
It never appears again in any size, opacity, or crop. The badge above is our mark.

## 3. The official gradient — "Carolina Fade"

We DO use a gradient — exactly one family, built ONLY from our colors
(Carolina Blue `#4B9CD3`, black, and optionally white). Three locked recipes:

| Name | CSS | Use on |
|---|---|---|
| **Carolina Ink** (text on light) | `linear-gradient(to right, #1A1A1A 0%, #2D6E9E 45%, #4B9CD3 100%)` | THE key phrase of a headline on white/light grounds |
| **Carolina Sky** (text on dark) | `linear-gradient(to right, #4B9CD3 0%, #9CC5EF 55%, #FFFFFF 100%)` | THE key phrase of a headline on black/photo grounds |
| **Carolina Depth** (background) | `linear-gradient(160deg, #0A0A0B 0%, #0E1C28 45%, #1F4E75 100%)` | Full-bleed dark background bands and hero grounds |

Rules:

- **Allowed:** dark background bands (Carolina Depth), and the emphasized words of a
  headline (Ink on light, Sky on dark). One gradient moment per composition — the
  emphasized phrase, not the whole headline.
- **Not allowed:** body text, eyebrows/labels, buttons (solid Carolina only), tile
  and card surfaces (tiles are glass or solid), logos, borders, icons.
- **BANNED forever: any blue→green gradient.** That belongs to a different brand
  (YOU.PRJCT+) and never appears on YOU. FIRST work. Also banned: rainbow/multi-hue,
  purple, orange, radial "atmosphere" glows used as decoration.

## 4. Glass tiles — the surface language

Tiles are **frosted glass, not flat shadow tiles**. Two locked recipes; every tile
uses one of them exactly.

**DARK GLASS** — copy panels over photography and dark grounds
(reference: the homepage Backyard tile):

```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(12px) saturate(1.4);
border: 1px solid rgba(255, 255, 255, 0.15);
border-radius: 16px;
box-shadow:
  0 8px 60px rgba(0, 0, 0, 0.45),          /* deep soft lift */
  inset 0 1px 0 rgba(255, 255, 255, 0.12);  /* top edge light */
padding: 32px;  /* 48px on desktop hero tiles */
```

Text inside: white headline, body at `rgba(255,255,255,0.85)`, eyebrow Carolina.

**LIGHT GLASS** — tiles over bright photos and light grounds:

```css
background: rgba(255, 255, 255, 0.66);
backdrop-filter: blur(20px) saturate(1.6);
border: 1px solid rgba(255, 255, 255, 0.6);
border-radius: 16px;
box-shadow:
  0 8px 40px rgba(10, 10, 11, 0.18),
  inset 0 1px 0 rgba(255, 255, 255, 0.85);
padding: 32px;
```

Text inside: ink `#1A1A1A`, body `#3D4652`, eyebrow Carolina `#2D6E9E` register.

Rules: corner radius is **16px** (24px only on full-width hero tiles). Glass always
sits over something worth blurring — a photo or the Carolina Depth gradient; glass on
flat white is noise. Never stack glass on glass. No colored glass (no blue-tinted
fills beyond the white opacities above). Behind glass, darken photos per §6 so text
passes contrast.

## 5. Palette — three colors, nothing else

| Color | Hex | Role |
|---|---|---|
| **Black** | `#0A0A0B` (site) / `#000000` (media) | The ground. Dark bands, ink on light. |
| **Carolina Blue** | `#4B9CD3` | The one accent: buttons, emphasis, the period, icons, hairline moments. Hover/deep register `#3D87BC`–`#2D6E9E`. Wash `#EDF5FB`. |
| **White** | `#FFFFFF` | Light grounds, ink on dark. Whitespace is the luxury. |

- Neutrals are **mixes of these three only**: ink `#1A1A1A`, muted body `#6B7280`,
  faint `#9CA3AF`, hairline `#E5E8EC`, surface `#F8F9FA`. No warm grays, no cream.
- **Banned: orange, purple, green, gold, navy-as-a-color** (the badge's navy lives
  inside the logo only), and every gradient except §3.
- Photography and third-party logos (colleges, the badge) keep their own colors —
  the palette law governs DESIGN elements.

## 6. Typography + photo treatment

**Type — Inter, nothing else.** (Website: `next/font` Inter; media machine: vendored
`assets/fonts/inter-latin-*.woff2`.)

| Role | Spec |
|---|---|
| Hero headline | Inter 800–900, −0.025em, line-height 1.0–1.05, BIG (site: clamp ~2.5–5rem) |
| Section headline | Inter 700–800, −0.015em, 2–3.5rem |
| Eyebrow / label | Inter 600–700, UPPERCASE, tracked 0.14–0.2em, 11–13px, usually Carolina |
| Body | Inter 400–500, 15–17px, line-height 1.7–1.85, muted ink (#6B7280 / white 65–85%) |
| Numbers | always `font-feature-settings: 'tnum'` — stats align like a scoreboard |

No italics. No second typeface, ever. Emphasis = weight, Carolina, or the §3 text
gradient on the key phrase.

**Photography.** Strong, real photos of our players — the photography IS the brand's
warmth; design stays disciplined around it.

- **The website grade (signature):** photos render in Carolina-toned black & white —
  `filter: grayscale(1) sepia(0.22) hue-rotate(165deg) saturate(0.85) brightness(1.02)`
  — with a whisper of Carolina over slot photos:
  `linear-gradient(to top right, rgba(75,156,211,0.16), transparent)`.
  Full color is reserved as a deliberate accent (currently: the WE BUILD THE BEST
  trio, college logos, the homepage gallery, the levels cards). Color = a decision,
  never a default.
- **Social/media graphics** may run full-color photography (per MEDIA-STANDARDS
  canvases); the monochrome grade is available as a mood, not required there.
- **Text over a photo requires a scrim.** Either a flat darken
  (`rgba(10,10,11,0.55–0.65)` overlay) or a black tonal scrim
  (transparent→black, bottom-weighted) — then white text or a §4 glass tile.
  Never set text on a raw photo.
- Faces stay in frame: crop with object-position tuned per photo, never a blind
  center crop that beheads players.

## 7. Deliberately NOT locked

- **No corner-bracket frame or any decorative frame device is part of this identity.**
  Framing is an open question we are still exploring — nothing here forces one, and
  no generator should hardcode one as "the brand."
- Layout grids, motion, and iconography style beyond "Carolina line icons,
  2.5px stroke" remain open for exploration within the laws above.

## 8. Infographic slides / the SVG system

The third format beside photo slides and glass tiles: **pure-infographic slides** —
standalone teach-and-prove slides built around a custom SVG diagram on a clean
ground, no photo. (Our own answer to the YOU.PRJCT lesson-slide vocabulary, in OUR
brand.) Generator: media machine `generators/diagram.mjs` (`npm run diagram`) —
plain-JSON input, zero code.

**8.1 The slide format.** Ground: white default; a dark variant runs on Carolina
Depth (§3) — never any other background. Margins 84px (1080-wide canvas). Chrome,
top to bottom: a 6px **progress bar** across the top (faint track, Carolina fill =
slide position), then eyebrow (Carolina, tracked) left + **"01 / 03" counter**
(tabular, faint) right, then the headline (Inter 800, −0.025em, max two lines,
emphasis phrase in the §3 text gradient), then the **diagram center-stage**, then an
optional centered support line (Inter 500, muted, wraps inside margins), then the
footer: the club **badge** (66px) over `YOU. FIRST · ELITE LACROSSE` (tracked,
faint, Carolina period).

**8.2 The diagram library** — every diagram uses: Carolina `#4B9CD3` + black +
white ONLY, the Carolina Fade gradient for the emphasized element (never green,
never blue→green), Inter labels (uppercase, tracked 0.15em, 20–24px), tabular
numerals on every number, 16px card radius, 1.5px hairlines / 2.5–7px feature
strokes, faint `#E5E8EC`-register tracks with Carolina fills. Types, by name:

| Type | What it draws |
|---|---|
| `gauge` | semicircle meter, gradient value arc, giant tabular number |
| `compare` | stacked rows — "most athletes" faint vs "champions" Carolina-washed + stroked |
| `steps` | N nodes on a line, done = Carolina check circles, gradient progress |
| `bars` | vertical stat bars, highlight bar in gradient, values on top |
| `ring` | concentric comfort-zone rings, highlighted ring solid Carolina, arrow outward |
| `receipt` | list card with dashed separators, label/value rows, gradient total |
| `callout` | one giant gradient number + label + sub |
| `levels-path` | READY-MADE: the ascending JUMPSTART → LAUNCH → ELITE curve |
| `season-band` | READY-MADE: the month band with highlighted span + markers |
| `proof-mark` | READY-MADE: the "X of Y" check grid (7-of-8 All-Americans) |

**8.3 When to use which format.** Choose by the JOB of the slide:
**Pure-infographic** when the message is a number, a structure, or a comparison —
teaching or proving (levels, seasons, stats, costs, steps). **Photo slide** when
the message is emotional — people, moments, belonging; the photo does the talking.
**Glass tile** when copy must sit ON a photo or dark band — a statement over
atmosphere (web sections, feature moments). Never force a diagram onto an emotional
message or a photo onto a data message.

---

*Last updated 2026-07-04. Change process: Harrison says it in plain English; the
change lands in BOTH copies of this file, then in the code.*
