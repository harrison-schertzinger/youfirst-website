import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { STANDARD, type StandardBlock } from "@/content/standard";
import PrintButton from "@/components/standard/PrintButton";

export const metadata: Metadata = {
  title: "The You First Standard | YOU. FIRST Elite Lacrosse",
  description:
    "What the 2026–27 season is, who is coaching it, what the summer looks like, and what is expected.",
};

// ─── The You First Standard ──────────────────────────────────────────────────
// The document a family keeps, as a page rather than an attachment. An attached
// PDF hurts deliverability and competes with the confirm button; a link costs
// nothing and can be corrected after it is sent.
//
// Deep navy on screen, matching the placement email that sends families here.
// Ink-on-white on paper — see the @media print block in globals.css. That is
// what covers the family who wants a file.
//
// Built for a phone first: one column, no horizontal scroll, tables that scroll
// inside their own box rather than pushing the page sideways.
//
// EVERY WORD comes from src/content/standard.ts. Copy Harrison has not written
// renders as a visible chip — the same convention /coaches already ships. This
// page invents nothing.

function Pending({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#102741] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8397AC] print:bg-[#F3F4F6] print:text-[#6B7280]">
      {label} · Pending Harrison
    </span>
  );
}

function Block({ block }: { block: StandardBlock }) {
  switch (block.type) {
    case "lede":
      return (
        <p className="doc-strong mb-5 text-[19px] font-semibold leading-[1.5] sm:text-[21px]">
          {block.text}
        </p>
      );
    case "p":
      return (
        <p className="mb-4 text-[16px] leading-[1.75] sm:text-[17px]">{block.text}</p>
      );
    case "h":
      return (
        <h3 className="doc-accent mt-9 mb-3 text-[11px] font-bold uppercase tracking-[0.18em]">
          {block.text}
        </h3>
      );
    case "list":
      return (
        <ul className="mb-4 list-disc space-y-2 pl-5">
          {block.items.map((item, i) => (
            <li key={i} className="text-[16px] leading-[1.7] sm:text-[17px]">
              {item}
            </li>
          ))}
        </ul>
      );
    case "pillars":
      return (
        <div className="mb-4 space-y-5">
          {block.items.map((p, i) => (
            <div key={i} className="doc-pillar pl-4">
              <div className="doc-strong text-[17px] font-bold leading-[1.4] sm:text-[18px]">
                {p.lead}
              </div>
              {p.body && (
                <div className="mt-1.5 text-[16px] leading-[1.7]">{p.body}</div>
              )}
            </div>
          ))}
        </div>
      );
    case "note":
      return (
        <div className="doc-panel doc-pillar mb-5 py-4 pl-4 pr-5 text-[16px] leading-[1.7]">
          {block.text}
        </div>
      );
    case "table":
      // Wide content scrolls inside its own box; the page body never does.
      return (
        <div className="mb-5 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[440px] border-collapse text-left">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th
                    key={i}
                    className="doc-th pb-2 pr-4 text-[10px] font-bold uppercase tracking-[0.12em] last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="doc-td py-3 pr-4 align-top text-[15px] leading-[1.6] last:pr-0"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "pending":
      return (
        <div className="mb-4">
          <Pending label={block.label} />
        </div>
      );
  }
}

export default function StandardPage() {
  const doc = STANDARD;

  return (
    <>
      <div className="print-hide">
        <Navbar initialTheme="dark" />
      </div>

      <main className="standard-doc min-h-screen">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="px-6 pt-32 pb-12 sm:pt-40 sm:pb-16 print:pt-0 print:pb-6">
          <div className="mx-auto max-w-[760px]">
            <p className="doc-accent text-[11px] font-bold uppercase tracking-[0.22em]">
              {doc.season} season
            </p>
            <h1 className="doc-strong doc-title mt-4 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.5rem]">
              {doc.title}
            </h1>
            <div className="mt-6">
              <Block block={doc.standfirst} />
            </div>

            {/* Contents — a long document on a phone needs a way in. */}
            <nav
              aria-label="Contents"
              className="doc-panel mt-10 rounded-xl p-5 print:mt-6 print:rounded-none"
            >
              <p className="doc-muted text-[10px] font-bold uppercase tracking-[0.18em]">
                Contents
              </p>
              <ol className="mt-3 space-y-1.5">
                {doc.sections.map((s, i) => (
                  <li key={s.slug} className="text-[15px]">
                    <span className="doc-muted mr-2 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <a href={`#${s.slug}`} className="doc-strong hover:underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-6 print-hide">
              <PrintButton />
            </div>
          </div>
        </section>

        {/* ── Sections ───────────────────────────────────────────────── */}
        <div className="px-6 pb-24 print:pb-0">
          <div className="mx-auto max-w-[760px]">
            {doc.sections.map((s, i) => (
              <section
                key={s.slug}
                id={s.slug}
                className="doc-section scroll-mt-24 border-t pt-10 pb-2 print:pt-7"
                style={{ borderTopColor: "transparent" }}
              >
                <div className="doc-rule mb-9 h-px w-full print:mb-6" />
                <p className="doc-sec-n doc-accent text-[11px] font-bold tracking-[0.18em]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="doc-strong mt-2 mb-6 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight sm:text-[2.25rem]">
                  {s.title}
                </h2>
                {s.blocks.map((b, bi) => (
                  <Block key={bi} block={b} />
                ))}
              </section>
            ))}

            <div className="doc-rule mt-12 mb-8 h-px w-full" />
            <p className="doc-muted text-[13px]">
              YOU. FIRST Elite Lacrosse Club · Cincinnati, Ohio
            </p>
          </div>
        </div>
      </main>

      <div className="print-hide">
        <Footer />
      </div>
    </>
  );
}
