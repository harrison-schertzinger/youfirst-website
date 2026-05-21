import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  TEMPLATE_TYPES,
  templateTypeLabel,
  type TemplateType,
} from "@/lib/email-templates";
import NewTemplateButton from "@/components/admin/NewTemplateButton";
import TemplateArchiveButton from "@/components/admin/TemplateArchiveButton";

export const dynamic = "force-dynamic";

interface TemplateRow {
  id: string;
  name: string;
  type: TemplateType;
  subject: string;
  body: string;
  description: string | null;
  is_default: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function preview(text: string, len = 80): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "—";
  return flat.length > len ? `${flat.slice(0, len)}…` : flat;
}

export default async function TemplatesPage() {
  const admin = getAdmin();
  if (!admin) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Supabase service-role env vars not configured.
      </div>
    );
  }

  const { data, error } = await admin
    .from("email_templates")
    .select(
      "id, name, type, subject, body, description, is_default, status, created_at, updated_at",
    )
    .eq("status", "active")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/templates] fetch failed:", error);
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Failed to load templates: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as TemplateRow[];
  const byType = new Map<TemplateType, TemplateRow[]>();
  for (const t of TEMPLATE_TYPES) byType.set(t, []);
  for (const r of rows) {
    byType.get(r.type)?.push(r);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Operations
          </div>
          <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
            Email Templates
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {rows.length} active template{rows.length === 1 ? "" : "s"} ·
            placeholders: <code className="text-[#0A0A0B]">{"{{player_name}}"}</code>,{" "}
            <code className="text-[#0A0A0B]">{"{{parent_first_name}}"}</code>,{" "}
            <code className="text-[#0A0A0B]">{"{{balance}}"}</code>,{" "}
            <code className="text-[#0A0A0B]">{"{{payment_link}}"}</code>,{" "}
            <code className="text-[#0A0A0B]">{"{{season}}"}</code>
          </p>
        </div>
        <NewTemplateButton />
      </header>

      <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        {TEMPLATE_TYPES.map((type) => {
          const list = byType.get(type) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={type}>
              <header className="px-6 py-3 border-b border-[#E5E7EB] bg-[#F8F9FA]">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  {templateTypeLabel[type]}
                </h2>
              </header>
              <ul className="divide-y divide-[#E5E7EB]">
                {list.map((t) => (
                  <li key={t.id} className="px-6 py-4 hover:bg-[#F8F9FA] transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/templates/${t.id}`}
                          className="font-semibold text-[14px] text-[#0A0A0B] hover:text-[#4A90D9]"
                        >
                          {t.name}
                        </Link>
                        <div className="mt-0.5 text-[12px] text-[#6B7280] truncate">
                          {t.subject || (
                            <span className="italic text-[#9CA3AF]">
                              (no subject)
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[12px] text-[#9CA3AF]">
                          {preview(t.body)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/admin/templates/${t.id}`}
                          className="text-[11px] font-medium text-[#4A90D9] hover:underline"
                        >
                          Edit
                        </Link>
                        <TemplateArchiveButton
                          templateId={t.id}
                          templateName={t.name}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {rows.length === 0 && (
          <div className="px-6 py-12 text-center text-[13px] text-[#6B7280]">
            No templates yet. Click <strong>New Template</strong> to create
            your first one.
          </div>
        )}
      </div>
    </div>
  );
}
