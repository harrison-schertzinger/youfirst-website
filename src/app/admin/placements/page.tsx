import PlacementsClient from "@/components/admin/placements/PlacementsClient";
import { getServiceClient } from "@/lib/placement/config";
import { buildAudience } from "@/lib/placement/audience";

export const dynamic = "force-dynamic";

// ─── Placements — who is about to be emailed, and what they will receive ────
// Auth lives in the admin layout (magic-link allowlist). This page assembles
// the audience server-side; every send goes back through the API routes, which
// re-derive the recipient list from the database rather than trusting anything
// the browser hands back.

export default async function PlacementsPage() {
  const supabase = getServiceClient();
  if (!supabase) {
    return (
      <div className="p-8 text-sm text-red-600">
        Server is missing its database keys — placements can&apos;t load.
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof buildAudience>> | null = null;
  let message = "Unknown error.";
  try {
    data = await buildAudience(supabase);
  } catch (e) {
    if (e instanceof Error) message = e.message;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Couldn&apos;t load placements: {message}
      </div>
    );
  }

  return <PlacementsClient initial={data} />;
}
