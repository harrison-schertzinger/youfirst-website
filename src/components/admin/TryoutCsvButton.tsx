"use client";

import { Download } from "lucide-react";

export interface TryoutCsvRow {
  player: string;
  parent: string;
  email: string;
  phone: string;
  gradYear: string;
  position: string;
  tryout: string;
  status: string;
  signedUp: string;
}

// Builds the spreadsheet in the browser from the rows already on the page —
// no extra endpoint, so the admin login is the only door to this data.
export default function TryoutCsvButton({ rows }: { rows: TryoutCsvRow[] }) {
  function download() {
    const header = [
      "Player",
      "Parent",
      "Email",
      "Phone",
      "Grad Year",
      "Position",
      "Tryout",
      "Status",
      "Signed Up",
    ];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.player, r.parent, r.email, r.phone, r.gradYear, r.position, r.tryout, r.status, r.signedUp]
          .map(esc)
          .join(","),
      ),
    ];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tryout-signups.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.08em] rounded-xl hover:bg-accent-blue-hover transition-colors"
    >
      <Download size={15} strokeWidth={2.5} />
      Download as spreadsheet
    </button>
  );
}
