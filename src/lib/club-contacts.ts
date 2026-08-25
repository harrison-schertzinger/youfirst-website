/**
 * Who a family emails, as data.
 *
 * Hardcoding a name here would mean a deploy to announce the incoming club
 * director — and a deploy again the day anyone's role changes. The portal reads
 * whatever is published in club_contacts, so announcing Luke is flipping one
 * boolean, not shipping code.
 *
 * Server-only: reads the service-role key.
 */

import { createClient } from "@supabase/supabase-js";

export interface ClubContact {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  blurb: string | null;
}

export async function getPublishedContacts(): Promise<ClubContact[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("club_contacts")
    .select("id, role, name, email, phone, blurb")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[club-contacts] fetch failed:", error);
    return [];
  }
  return (data ?? []) as ClubContact[];
}
