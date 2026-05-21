import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import ProspectDetailClient, {
  type ProspectDetail,
} from "@/components/admin/ProspectDetailClient";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = getAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Supabase service-role env vars not configured.
      </div>
    );
  }

  const { data, error } = await admin
    .from("prospects")
    .select(
      "id, first_name, last_name, graduation_year, position, school, prospect_email, parent_first_name, parent_last_name, parent_email, parent_phone, source, stage, last_contacted_at, notes, converted_player_id, status, created_at, created_by, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/prospects/[id]] fetch failed:", error);
    redirect("/admin/prospects");
  }
  if (!data) redirect("/admin/prospects");
  const prospect = data as ProspectDetail;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/prospects"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Prospects
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-[#0A0A0B] font-medium">
          {prospect.first_name} {prospect.last_name}
        </span>
      </nav>

      <ProspectDetailClient initial={prospect} />
    </div>
  );
}
