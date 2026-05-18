import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import { rowsToCsv, localDateStamp } from "@/lib/csv";
import {
  expenseCategoryMeta,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount_cents: number;
  vendor: string | null;
  tournament_id: string | null;
  player_id: string | null;
  notes: string | null;
  status: string;
  created_at: string | null;
}

function bad(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const season = params.get("season") ?? "2025-26";
  const statusParam = params.get("status") ?? "active";
  const categoriesParam = params.get("categories"); // comma-separated
  const categoryParam = params.get("category"); // legacy single
  const tournamentId = params.get("tournament_id");
  const playerId = params.get("player_id");
  const from = params.get("from");
  const to = params.get("to");

  // Validate filter dates (only the format — empty is fine).
  if (from && !DATE_RE.test(from)) return bad("from must be YYYY-MM-DD.");
  if (to && !DATE_RE.test(to)) return bad("to must be YYYY-MM-DD.");
  if (from && to && from > to) {
    return bad("from must be on or before to.");
  }

  // Multi-cat parsing: comma-split, trim, dedup, validate each.
  let categories: ExpenseCategory[] | null = null;
  if (categoriesParam) {
    const list = [
      ...new Set(
        categoriesParam
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    ];
    for (const c of list) {
      if (!isExpenseCategory(c)) {
        return bad(`Unknown category: ${c}`);
      }
    }
    categories = list as ExpenseCategory[];
  } else if (categoryParam) {
    if (!isExpenseCategory(categoryParam)) {
      return bad(`Unknown category: ${categoryParam}`);
    }
    categories = [categoryParam];
  }

  // ── Service-role + query ───────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Service-role env vars not configured." },
      { status: 500 },
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let q = admin
    .from("expenses")
    .select(
      "id, expense_date, category, description, amount_cents, vendor, tournament_id, player_id, notes, status, created_at",
    )
    .eq("season", season)
    .eq("status", statusParam)
    .order("expense_date", { ascending: false });
  if (categories && categories.length > 0) q = q.in("category", categories);
  if (tournamentId) q = q.eq("tournament_id", tournamentId);
  if (playerId) q = q.eq("player_id", playerId);
  if (from) q = q.gte("expense_date", from);
  if (to) q = q.lte("expense_date", to);

  const { data: expenses, error } = await q;
  if (error) {
    console.error("[admin/expenses/export]", error);
    return NextResponse.json(
      { error: "Failed to query expenses." },
      { status: 500 },
    );
  }

  // Resolve tournament + player names for the CSV.
  const exRows = (expenses ?? []) as ExpenseRow[];
  const tournamentIds = [
    ...new Set(exRows.map((e) => e.tournament_id).filter((x): x is string => !!x)),
  ];
  const playerIds = [
    ...new Set(exRows.map((e) => e.player_id).filter((x): x is string => !!x)),
  ];

  const [tourRes, playerRes] = await Promise.all([
    tournamentIds.length > 0
      ? admin
          .from("tournaments")
          .select("id, name")
          .in("id", tournamentIds)
      : Promise.resolve({ data: [], error: null }),
    playerIds.length > 0
      ? admin
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const tournamentName = new Map<string, string>();
  for (const t of (tourRes.data ?? []) as Array<{ id: string; name: string }>) {
    tournamentName.set(t.id, t.name);
  }
  const playerName = new Map<string, string>();
  for (const p of (playerRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>) {
    playerName.set(p.id, `${p.first_name} ${p.last_name}`);
  }

  // ── CSV body ────────────────────────────────────────────────────────────
  const header = [
    "Date",
    "Category",
    "Description",
    "Vendor",
    "Amount (Dollars)",
    "Tournament",
    "Player",
    "Notes",
    "Status",
    "Created",
  ];
  const rows: string[][] = [header];
  for (const e of exRows) {
    const categoryLabel = isExpenseCategory(e.category)
      ? expenseCategoryMeta[e.category as ExpenseCategory].text
      : e.category;
    rows.push([
      e.expense_date,
      categoryLabel,
      e.description,
      e.vendor ?? "",
      (e.amount_cents / 100).toFixed(2),
      e.tournament_id ? (tournamentName.get(e.tournament_id) ?? "") : "",
      e.player_id ? (playerName.get(e.player_id) ?? "") : "",
      e.notes ?? "",
      e.status,
      e.created_at ?? "",
    ]);
  }

  const csv = rowsToCsv(rows);
  const filename = `expenses-${localDateStamp()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Don't cache the export — filters change frequently.
      "Cache-Control": "no-store",
    },
  });
}
