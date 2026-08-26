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
  /** The site's own share image. Null when it has none or could not be read. */
  imageUrl: string | null;
}

/**
 * Read a site's og:image — the picture it already publishes for link shares.
 *
 * Nothing is scraped beyond that one tag: we fetch the page, take the share
 * image it advertises, and stop. Cached for a day so a parent's page load never
 * waits on someone else's server, and every failure path returns null rather
 * than throwing — a resource with no preview still renders as a link, which is
 * strictly better than a portal that errors because a third-party site is down.
 */
async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "YouFirstLacrosse-Portal/1.0" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;

    const html = (await res.text()).slice(0, 200_000);
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return new URL(m[1], pageUrl).toString();
    }
    return null;
  } catch {
    return null;
  }
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
    .select("id, label, description, url, category, image_url")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[club-resources] fetch failed:", error);
    return [];
  }
  type Row = ClubResource & { image_url: string | null };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !!r.url);

  // A stored image always wins — it is ours, it cannot vanish when someone
  // else redesigns their site, and it costs no request.
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      url: r.url,
      category: r.category,
      imageUrl: r.image_url ?? (await fetchOgImage(r.url)),
    })),
  );
}
