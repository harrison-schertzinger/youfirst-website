import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { templateTypeLabel, type TemplateType } from "@/lib/email-templates";
import TemplateEditor, {
  type TemplateRecord,
} from "@/components/admin/TemplateEditor";
import type { SnippetMap } from "@/lib/template-render";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function TemplateEditPage({
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

  const [templateRes, snippetsRes] = await Promise.all([
    admin
      .from("email_templates")
      .select("id, name, type, subject, body, description, status")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("email_snippets")
      .select("key, content"),
  ]);

  if (templateRes.error) {
    console.error("[admin/templates/[id]] fetch failed:", templateRes.error);
    redirect("/admin/templates");
  }
  if (!templateRes.data) redirect("/admin/templates");
  const template = templateRes.data as TemplateRecord & { status: string };

  // Build a SnippetMap from the rows so TemplateEditor's live preview
  // resolves {{snippet:summer_schedule}} etc. against the real seeded
  // content. Empty/erroring fetch → empty map; preview still works,
  // snippet placeholders just stay literal.
  const snippetMap: SnippetMap = {};
  if (!snippetsRes.error && snippetsRes.data) {
    for (const row of snippetsRes.data as { key: string; content: string }[]) {
      (snippetMap as Record<string, string>)[row.key] = row.content;
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
        <Link
          href="/admin/templates"
          className="inline-flex items-center gap-1 hover:text-[#0A0A0B] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Templates
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-[#0A0A0B] font-medium">{template.name}</span>
      </nav>

      <header>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
          Edit Template
        </div>
        <h1 className="mt-1 text-[26px] md:text-[28px] font-bold tracking-tight text-[#0A0A0B]">
          {template.name}{" "}
          <span className="ml-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
            {templateTypeLabel[template.type as TemplateType]}
          </span>
        </h1>
      </header>

      <TemplateEditor initial={template} snippets={snippetMap} />
    </div>
  );
}
