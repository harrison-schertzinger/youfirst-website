"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Archive, Check, Mail } from "lucide-react";
import { ALLOWED_POSITIONS } from "@/lib/positions";
import {
  PROSPECT_STAGES,
  stageLabel,
  type ProspectStage,
  type ProspectStatus,
} from "@/lib/prospects";
import ProspectConvertModal from "@/components/admin/ProspectConvertModal";
import SendTemplateModal from "@/components/admin/SendTemplateModal";

export interface ProspectDetail {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
  school: string | null;
  prospect_email: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  source: string | null;
  stage: ProspectStage;
  last_contacted_at: string | null;
  notes: string | null;
  converted_player_id: string | null;
  status: ProspectStatus;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(iso: string | null): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - t) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function ProspectDetailClient({
  initial,
}: {
  initial: ProspectDetail;
}) {
  const router = useRouter();
  const [prospect, setProspect] = useState<ProspectDetail>(initial);
  const [stageSaving, setStageSaving] = useState(false);
  const [markingContacted, setMarkingContacted] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const patch = useCallback(
    async (
      body: Record<string, unknown>,
    ): Promise<{ ok: true; prospect: ProspectDetail } | { ok: false; error: string }> => {
      try {
        const res = await fetch(`/api/admin/prospects/${prospect.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          return { ok: false, error: data.error ?? "Save failed." };
        }
        const data = (await res.json()) as { prospect: ProspectDetail };
        setProspect(data.prospect);
        return { ok: true, prospect: data.prospect };
      } catch (err) {
        console.error("[ProspectDetail] patch threw:", err);
        return { ok: false, error: "Network error." };
      }
    },
    [prospect.id],
  );

  const onStageChange = useCallback(
    async (next: ProspectStage) => {
      if (next === prospect.stage) return;
      setStageSaving(true);
      setPageError(null);
      const result = await patch({ stage: next });
      setStageSaving(false);
      if (!result.ok) setPageError(result.error);
    },
    [patch, prospect.stage],
  );

  const onMarkContacted = useCallback(async () => {
    setMarkingContacted(true);
    setPageError(null);
    const result = await patch({ mark_contacted: true });
    setMarkingContacted(false);
    if (!result.ok) setPageError(result.error);
  }, [patch]);

  const onArchive = useCallback(async () => {
    setArchiving(true);
    setPageError(null);
    const result = await patch({ status: "archived" });
    setArchiving(false);
    if (!result.ok) {
      setPageError(result.error);
      setShowArchiveConfirm(false);
      return;
    }
    router.push("/admin/prospects");
  }, [patch, router]);

  const canConvert =
    prospect.stage === "ready_to_onboard" &&
    !!prospect.parent_email &&
    !!prospect.parent_first_name &&
    !!prospect.parent_last_name;

  const fullName = `${prospect.first_name} ${prospect.last_name}`;
  const stageMeta = stageLabel[prospect.stage];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            Prospect
          </div>
          <h1 className="mt-1 text-[28px] md:text-[32px] font-bold tracking-tight text-[#0A0A0B]">
            {fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
            <StagePill stage={prospect.stage} />
            {prospect.graduation_year && (
              <span className="text-[#6B7280]">
                Class of {prospect.graduation_year}
              </span>
            )}
            {prospect.position && (
              <>
                <span className="text-[#E5E7EB]">·</span>
                <span className="text-[#6B7280]">{prospect.position}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowComposeModal(true)}
          title="Compose an email from a template for this prospect"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A90D9] text-[#4A90D9] text-[13px] font-semibold hover:bg-[#4A90D9]/[0.08] transition-colors"
        >
          <Mail className="w-4 h-4" />
          Compose Email
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canConvert) return;
            setShowConvertModal(true);
          }}
          disabled={!canConvert}
          title={
            !canConvert
              ? "Convert requires stage=Ready to Onboard with parent name and email."
              : "Convert this prospect to a player"
          }
          className={[
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors shadow-sm",
            canConvert
              ? "bg-[#34D399] text-white hover:bg-[#22B883]"
              : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed",
          ].join(" ")}
        >
          <Check className="w-4 h-4" />
          Convert to Player
        </button>
        </div>
      </header>

      {pageError && (
        <div
          role="alert"
          className="rounded-lg border border-[#EF4444]/30 bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#EF4444]"
        >
          {pageError}
        </div>
      )}

      {/* Card 1 — Prospect Info */}
      <EditableCard
        title="Prospect Info"
        prospect={prospect}
        fields={[
          { key: "first_name", label: "First name", type: "text", required: true },
          { key: "last_name", label: "Last name", type: "text", required: true },
          { key: "graduation_year", label: "Graduation year", type: "number" },
          { key: "position", label: "Position", type: "position" },
          { key: "school", label: "School", type: "text" },
          { key: "prospect_email", label: "Prospect email", type: "email" },
        ]}
        onSaved={(p) => setProspect(p)}
      />

      {/* Card 2 — Parent Contact */}
      <EditableCard
        title="Parent Contact"
        prospect={prospect}
        fields={[
          { key: "parent_first_name", label: "Parent first name", type: "text" },
          { key: "parent_last_name", label: "Parent last name", type: "text" },
          { key: "parent_email", label: "Parent email", type: "email" },
          { key: "parent_phone", label: "Parent phone", type: "text" },
        ]}
        onSaved={(p) => setProspect(p)}
      />

      {/* Card 3 — Pipeline */}
      <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7 space-y-5">
        <header>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Pipeline
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            {stageMeta}
          </h2>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
              Stage
            </span>
            <select
              value={prospect.stage}
              disabled={stageSaving || prospect.stage === "converted"}
              onChange={(e) => onStageChange(e.target.value as ProspectStage)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] disabled:opacity-60 transition-colors"
            >
              {PROSPECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
              Last contacted
            </span>
            <div className="flex items-center gap-2 h-[40px]">
              <span className="text-[14px] text-[#0A0A0B]">
                {daysSince(prospect.last_contacted_at)}
              </span>
              <button
                type="button"
                onClick={onMarkContacted}
                disabled={markingContacted}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] disabled:opacity-60 transition-colors"
              >
                {markingContacted && <Loader2 className="w-3 h-3 animate-spin" />}
                Mark Contacted
              </button>
            </div>
          </div>
        </div>

        <NotesEditable
          prospectId={prospect.id}
          initial={prospect.notes}
          onSaved={(p) => setProspect(p)}
        />
      </section>

      {/* Card 4 — Source */}
      <EditableCard
        title="Source"
        prospect={prospect}
        fields={[
          { key: "source", label: "Source", type: "text" },
        ]}
        onSaved={(p) => setProspect(p)}
        extraStatic={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] pt-2 border-t border-[#E5E7EB]">
            <Static label="Created" value={fmtDate(prospect.created_at)} />
            <Static label="Created by" value={prospect.created_by ?? "—"} />
          </div>
        }
      />

      {/* Archive */}
      <div className="pt-6">
        {!showArchiveConfirm ? (
          <button
            type="button"
            onClick={() => setShowArchiveConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#EF4444]/40 text-[#EF4444] text-[13px] font-medium hover:bg-[#FEF2F2] transition-colors"
          >
            <Archive className="w-4 h-4" />
            Archive Prospect
          </button>
        ) : (
          <div className="rounded-2xl border border-[#EF4444]/30 bg-[#FEF2F2] p-5 space-y-3">
            <div className="text-[13px] text-[#0A0A0B]">
              Archive <span className="font-semibold">{fullName}</span>? They
              will be hidden from the pipeline view.
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={archiving}
                className="px-3 py-1.5 rounded-md text-[12px] text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onArchive}
                disabled={archiving}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#EF4444] text-white text-[12px] font-semibold hover:bg-[#DC2626] disabled:opacity-60 transition-colors"
              >
                {archiving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Archive
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Convert modal */}
      {showComposeModal && (
        <SendTemplateModal
          onClose={() => setShowComposeModal(false)}
          prospect={{
            first_name: prospect.first_name,
            last_name: prospect.last_name,
            graduation_year: prospect.graduation_year,
            parent_first_name: prospect.parent_first_name,
            parent_last_name: prospect.parent_last_name,
            parent_email: prospect.parent_email,
          }}
        />
      )}
      {showConvertModal && (
        <ProspectConvertModal
          prospect={{
            id: prospect.id,
            first_name: prospect.first_name,
            last_name: prospect.last_name,
            parent_email: prospect.parent_email,
          }}
          onClose={() => setShowConvertModal(false)}
          onConverted={(playerId) => {
            router.push(`/admin/players/${playerId}`);
          }}
        />
      )}
    </div>
  );
}

function StagePill({ stage }: { stage: ProspectStage }) {
  const colors: Record<ProspectStage, string> = {
    interested: "#9CA3AF",
    contacted: "#F59E0B",
    parent_confirmed: "#4A90D9",
    ready_to_onboard: "#34D399",
    converted: "#0A0A0B",
    declined: "#EF4444",
  };
  const c = colors[stage];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: c }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: c }}
        aria-hidden
      />
      {stageLabel[stage]}
    </span>
  );
}

// ─── Editable card ────────────────────────────────────────────────────────────

interface FieldSpec {
  key: keyof ProspectDetail;
  label: string;
  type: "text" | "number" | "email" | "position";
  required?: boolean;
}

function EditableCard({
  title,
  prospect,
  fields,
  onSaved,
  extraStatic,
}: {
  title: string;
  prospect: ProspectDetail;
  fields: FieldSpec[];
  onSaved: (next: ProspectDetail) => void;
  extraStatic?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(
    null,
  );

  const startEdit = () => {
    const d: Record<string, string> = {};
    for (const f of fields) {
      const v = prospect[f.key];
      d[String(f.key)] = v == null ? "" : String(v);
    }
    setDraft(d);
    setError(null);
    setFieldError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
    setFieldError(null);
  };

  const save = async () => {
    if (submitting) return;
    setError(null);
    setFieldError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        const v = draft[String(f.key)] ?? "";
        if (f.type === "number") {
          body[String(f.key)] = v === "" ? null : v;
        } else {
          body[String(f.key)] = v === "" ? null : v;
        }
      }
      const res = await fetch(`/api/admin/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };
        if (data.field) {
          setFieldError({ field: data.field, message: data.error ?? "Invalid value." });
        } else {
          setError(data.error ?? "Save failed.");
        }
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { prospect: ProspectDetail };
      onSaved(data.prospect);
      setEditing(false);
    } catch (err) {
      console.error("[EditableCard] threw:", err);
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <header className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            {title}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </header>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <FieldInput
                key={String(f.key)}
                f={f}
                value={draft[String(f.key)] ?? ""}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, [String(f.key)]: v }))
                }
                error={fieldError?.field === String(f.key) ? fieldError.message : null}
              />
            ))}
          </div>
          {error && (
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cancel}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
            {fields.map((f) => (
              <ViewRow
                key={String(f.key)}
                label={f.label}
                value={(prospect[f.key] as string | number | null) ?? "—"}
              />
            ))}
          </dl>
          {extraStatic}
        </>
      )}
    </section>
  );
}

function FieldInput({
  f,
  value,
  onChange,
  error,
}: {
  f: FieldSpec;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  const cls = [
    "w-full bg-white rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]",
    error ? "border border-[#EF4444]" : "border border-[#E5E7EB]",
  ].join(" ");
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {f.label}
        {f.required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </span>
      {f.type === "position" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">—</option>
          {ALLOWED_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={f.required}
          className={cls}
        />
      )}
      {error && (
        <span role="alert" className="block mt-1 text-[11px] text-[#EF4444]">
          {error}
        </span>
      )}
    </label>
  );
}

function ViewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[#0A0A0B]">
        {value === null || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

function Static({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
        {label}
      </span>
      <span className="text-[#0A0A0B]">{value}</span>
    </div>
  );
}

// ─── Notes editor ─────────────────────────────────────────────────────────────

function NotesEditable({
  prospectId,
  initial,
  onSaved,
}: {
  prospectId: string;
  initial: string | null;
  onSaved: (next: ProspectDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync draft when initial prop changes externally (after parent updates).
  if (!editing && draft !== (initial ?? "")) {
    setDraft(initial ?? "");
  }

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft.trim() === "" ? null : draft }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Save failed.");
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { prospect: ProspectDetail };
      onSaved(data.prospect);
      setEditing(false);
    } catch (err) {
      console.error("[NotesEditable] threw:", err);
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
          Notes
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-[#4A90D9] hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
          />
          {error && (
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(initial ?? "");
              }}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md text-[12px] text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#4A90D9] text-white text-[12px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Save Notes
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-[#0A0A0B] whitespace-pre-wrap">
          {initial?.trim() ? initial : <span className="text-[#9CA3AF]">—</span>}
        </p>
      )}
    </div>
  );
}
