"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";

export default function TemplateArchiveButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archive = useCallback(async () => {
    setArchiving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Archive failed.");
        setArchiving(false);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("[TemplateArchiveButton] threw:", err);
      setError("Network error.");
      setArchiving(false);
    }
  }, [templateId, router]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#EF4444] transition-colors"
        title={`Archive ${templateName}`}
      >
        <Archive className="w-3 h-3" />
        Archive
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[11px]">
      <span className="text-[#EF4444]">Archive {templateName}?</span>
      <button
        type="button"
        onClick={archive}
        disabled={archiving}
        className="text-[#EF4444] font-semibold hover:underline disabled:opacity-60"
      >
        {archiving && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={archiving}
        className="text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60"
      >
        Cancel
      </button>
      {error && <span className="text-[#EF4444]">{error}</span>}
    </span>
  );
}
