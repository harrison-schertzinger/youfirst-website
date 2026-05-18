import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import ExpenseForm from "@/components/admin/ExpenseForm";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialTournamentId =
    typeof params.tournament_id === "string" ? params.tournament_id : null;

  const admin = getAdmin();
  let tournaments: Array<{ id: string; name: string }> = [];
  let players: Array<{
    id: string;
    first_name: string;
    last_name: string;
    graduation_year: number | null;
  }> = [];

  if (admin) {
    const [tourRes, playerRes] = await Promise.all([
      admin
        .from("tournaments")
        .select("id, name")
        .eq("status", "active")
        .order("start_date", { ascending: true, nullsFirst: false }),
      admin
        .from("players")
        .select("id, first_name, last_name, graduation_year")
        .eq("status", "active")
        .order("graduation_year", { ascending: true })
        .order("last_name", { ascending: true }),
    ]);
    tournaments = tourRes.data ?? [];
    players = playerRes.data ?? [];
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/expenses"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Expenses
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-[#0A0A0B] font-medium">New</span>
      </nav>

      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
          Log an Expense
        </div>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#0A0A0B]">
          New Expense
        </h1>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Record a single transaction. Attribute to a tournament or a player if
          relevant.
        </p>
      </header>

      <ExpenseForm
        tournaments={tournaments}
        players={players}
        initialTournamentId={initialTournamentId}
      />
    </div>
  );
}
