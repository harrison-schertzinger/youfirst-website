import Link from "next/link";
import { Upload } from "lucide-react";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

// ─── Import Field Results ─────────────────────────────────────────────────────
// Back on wifi after tryouts: upload (or paste) the results file the field
// sheet exported, see exactly what will change, confirm. Auth comes from the
// admin layout; the API route re-checks it before touching the database.

export default function ImportFieldResultsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-accent-blue mb-1.5">
          <Upload size={18} strokeWidth={2.5} />
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
            2026 Tryouts
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
          Import Field Results
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Upload the <span className="font-semibold">tryout-results-…json</span>{" "}
          file the field sheet exported (or paste its text). You&apos;ll see a
          preview of every change before anything is written. Importing the same
          file twice is safe — the second run changes nothing.{" "}
          <Link href="/admin/tryouts" className="text-accent-blue-hover font-semibold">
            Back to signups
          </Link>
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
