import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TournamentForm from "@/components/admin/TournamentForm";

export const dynamic = "force-dynamic";

export default function NewTournamentPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/tournaments"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tournaments
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-[#0A0A0B] font-medium">New</span>
      </nav>

      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
          Create Tournament
        </div>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#0A0A0B]">
          New Tournament
        </h1>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Add a tournament to track its entry fees, travel, and other expenses.
        </p>
      </header>

      <TournamentForm />
    </div>
  );
}
