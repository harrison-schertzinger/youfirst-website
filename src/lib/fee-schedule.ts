/**
 * What a season costs for one class.
 *
 * Reads public.fee_schedule. A row that is not published is INCOMPLETE — the
 * club has not set every number — and this module returns null for it rather
 * than handing a partial total to a page that would render it as fact.
 *
 * Server-only.
 */

import { createClient } from "@supabase/supabase-js";

export const CURRENT_SEASON = "2026-27";

export interface ClassFees {
  gradYear: number;
  season: string;
  summerCents: number;
  rosterCents: number;
  tournamentCount: number;
  tournamentCents: number;
}

export async function getClassFees(
  gradYear: number | null | undefined,
  season: string = CURRENT_SEASON,
): Promise<ClassFees | null> {
  if (gradYear == null) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("fee_schedule")
    .select("grad_year, season, summer_cents, roster_cents, tournament_count, tournament_cents")
    .eq("season", season)
    .eq("grad_year", gradYear)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return null;
  // The published constraint guarantees these are set, but a defensive read
  // costs nothing and a null slipping through would render as "$NaN".
  if (data.summer_cents == null || data.tournament_count == null) return null;

  return {
    gradYear: data.grad_year,
    season: data.season,
    summerCents: data.summer_cents,
    rosterCents: data.roster_cents,
    tournamentCount: data.tournament_count,
    tournamentCents: data.tournament_cents,
  };
}
