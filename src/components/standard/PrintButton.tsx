"use client";

import { Printer } from "lucide-react";

/**
 * "Save as PDF" — the whole reason we ship a link instead of an attachment.
 * window.print() on a phone opens the share sheet with Save to Files / Print,
 * and on desktop the print dialog with Save as PDF. The @media print block in
 * globals.css is what makes the result worth keeping.
 *
 * Hidden from the printed page itself via .print-hide on its wrapper.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-[#1E3A56] px-4 py-2.5 text-[14px] font-semibold text-[#C6D2DF] transition hover:border-[#4B9CD3] hover:text-white"
    >
      <Printer className="h-4 w-4" />
      Save as PDF
    </button>
  );
}
