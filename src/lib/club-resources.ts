/**
 * Direct-action links on the portal. Director-editable rows, never hardcoded.
 *
 * Only published rows are returned, and the database refuses to publish a row
 * without a URL — so a dead link cannot reach a family even by accident.
 *
 * Server-only.
 */

import { createClient } from "@supabase/supabase-js";

export interface ClubResource {
  id: string;
  label: string;
  description: string | null;
  url: string;
  category: string;
}

export async function getPublishedResources(): Promise<ClubResource[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("club_resources")
    .select("id, label, description, url, category")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[club-resources] fetch failed:", error);
    return [];
  }
  return ((data ?? []) as ClubResource[]).filter((r) => !!r.url);
}
