"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

/**
 * Persistent bottom-row in the prospects spreadsheet. Lets Harrison
 * rapid-fire enter names collected at a tournament without opening a
 * separate form. Minimum required: first + last name. Everything else
 * optional, fills in over time via the inline cells above.
 */

interface Props {
  /** Optional default source string (e.g., "Tournament Tip-Off 2026"). */
  defaultSource?: string;
}

export default function InlineProspectAddRow({ defaultSource }: Props) {
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [grad, setGrad] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [source, setSource] = useState(defaultSource ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFirst("");
    setLast("");
    setGrad("");
    setParentName("");
    setParentEmail("");
    setParentPhone("");
    // Preserve `source` so the next-entered prospect from the same event
    // doesn't lose context.
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    const f = first.trim();
    const l = last.trim();
    if (!f) {
      setError("First name is required.");
      firstRef.current?.focus();
      return;
    }
    if (!l) {
      setError("Last name is required.");
      return;
    }
    // Split "First Last" into two fields. Anything after the first
    // space becomes the last name; empty if only one word entered.
    const trimmedParent = parentName.trim();
    let parent_first_name: string | null = null;
    let parent_last_name: string | null = null;
    if (trimmedParent.length > 0) {
      const spaceIdx = trimmedParent.indexOf(" ");
      if (spaceIdx === -1) {
        parent_first_name = trimmedParent;
      } else {
        parent_first_name = trimmedParent.slice(0, spaceIdx);
        parent_last_name = trimmedParent.slice(spaceIdx + 1).trim() || null;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: f,
          last_name: l,
          graduation_year: grad.trim() === "" ? null : grad.trim(),
          parent_first_name,
          parent_last_name,
          parent_email: parentEmail.trim() === "" ? null : parentEmail.trim(),
          parent_phone: parentPhone.trim() === "" ? null : parentPhone.trim(),
          source: source.trim() === "" ? null : source.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to add prospect.");
        setSubmitting(false);
        return;
      }
      reset();
      // Keep focus on first-name for next entry.
      firstRef.current?.focus();
      router.refresh();
    } catch (err) {
      console.error("[InlineProspectAddRow] threw:", err);
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }, [
    first,
    last,
    grad,
    parentName,
    parentEmail,
    parentPhone,
    source,
    reset,
    router,
  ]);

  // Enter on any cell submits (except the source cell where Enter is also
  // the natural "I'm done" key for the row).
  const onCellKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <tr className="bg-[#F8F9FA] border-t-2 border-[#E5E7EB]">
      <td className="px-2 py-1.5">
        <div className="flex gap-1">
          <input
            ref={firstRef}
            type="text"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            onKeyDown={onCellKey}
            placeholder="First"
            disabled={submitting}
            className="w-20 text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9] focus:border-[#4A90D9]"
          />
          <input
            type="text"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            onKeyDown={onCellKey}
            placeholder="Last"
            disabled={submitting}
            className="w-24 text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9] focus:border-[#4A90D9]"
          />
        </div>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={2024}
          max={2040}
          value={grad}
          onChange={(e) => setGrad(e.target.value)}
          onKeyDown={onCellKey}
          placeholder="Year"
          disabled={submitting}
          className="w-20 text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          onKeyDown={onCellKey}
          placeholder="Parent name"
          disabled={submitting}
          className="w-full text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          onKeyDown={onCellKey}
          placeholder="parent@email.com"
          disabled={submitting}
          className="w-full text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="tel"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
          onKeyDown={onCellKey}
          placeholder="Phone"
          disabled={submitting}
          className="w-full text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
      </td>
      <td className="px-2 py-1.5 text-[12px] text-[#9CA3AF] italic">—</td>
      <td className="px-2 py-1.5 text-[11px] text-[#9CA3AF]">interested</td>
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={onCellKey}
          placeholder="Source"
          disabled={submitting}
          className="w-full text-[12px] bg-white border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
        />
      </td>
      <td className="px-2 py-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          title="Add prospect (Enter)"
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#4A90D9] text-white text-[11px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          Add
        </button>
        {error && (
          <div role="alert" className="mt-1 text-[10px] text-[#EF4444]">
            {error}
          </div>
        )}
      </td>
    </tr>
  );
}
