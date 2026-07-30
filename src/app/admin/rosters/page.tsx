import RostersClient from "@/components/admin/rosters/RostersClient";
import { buildRosterData, getServiceClient } from "@/lib/rosters/data";

export const dynamic = "force-dynamic";

// ─── Rosters — every athlete, every class, one screen ────────────────────────
// Auth lives in the admin layout (magic-link allowlist); this page assembles
// the unified athlete list server-side and hands it to the client instrument.

export default async function RostersPage() {
  const supabase = getServiceClient();
  if (!supabase) {
    return (
      <div className="p-8 text-sm text-red-600">
        Server is missing its database keys — rosters can&apos;t load.
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof buildRosterData>> | null = null;
  let message = "Unknown error.";
  try {
    data = await buildRosterData(supabase);
  } catch (e) {
    if (e instanceof Error) message = e.message;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Couldn&apos;t load rosters: {message}
      </div>
    );
  }

  return <RostersClient initial={data} />;
}
