"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2, Star } from "lucide-react";

export interface GuardianWithLink {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  relationship: string | null;
  is_primary: boolean;
}

interface Props {
  playerId: string;
  guardians: GuardianWithLink[];
}

interface DraftFields {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

function toDraft(g: GuardianWithLink): DraftFields {
  return {
    first_name: g.first_name ?? "",
    last_name: g.last_name ?? "",
    email: g.email,
    phone: g.phone ?? "",
    relationship: g.relationship ?? "",
    is_primary: g.is_primary,
  };
}

export default function GuardiansEditableCard({ playerId, guardians }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<GuardianWithLink | null>(
    null,
  );
  const [makingPrimaryId, setMakingPrimaryId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router, startTransition]);

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <header className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Guardians
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            {guardians.length === 0
              ? "No guardians linked"
              : `${guardians.length} guardian${guardians.length === 1 ? "" : "s"} on file`}
          </h2>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Guardian
          </button>
        )}
      </header>

      {guardians.length === 0 && !adding && (
        <p className="text-sm text-[#6B7280]">
          No guardians linked. Click Add Guardian to attach one.
        </p>
      )}

      <ul className="divide-y divide-[#E5E7EB]">
        {guardians.map((g) => (
          <li key={g.id} className="py-4 first:pt-0 last:pb-0">
            {editingId === g.id ? (
              <GuardianEditForm
                key={`edit-${g.id}`}
                initial={toDraft(g)}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  refresh();
                }}
                onSubmit={async (draft) => {
                  const res = await fetch(`/api/admin/guardians/${g.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      first_name: draft.first_name.trim(),
                      last_name: draft.last_name.trim(),
                      email: draft.email.trim().toLowerCase(),
                      phone: draft.phone.trim() || null,
                      relationship: draft.relationship.trim() || null,
                    }),
                  });
                  return res;
                }}
                showPrimaryToggle={false}
                submitLabel="Save Changes"
              />
            ) : (
              <GuardianViewRow
                guardian={g}
                isMakingPrimary={makingPrimaryId === g.id}
                onEdit={() => setEditingId(g.id)}
                onRemove={() => setPendingRemove(g)}
                onMakePrimary={async () => {
                  if (makingPrimaryId) return;
                  setMakingPrimaryId(g.id);
                  try {
                    const res = await fetch(
                      `/api/admin/players/${playerId}/guardians`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          first_name: g.first_name ?? "",
                          last_name: g.last_name ?? "",
                          email: g.email,
                          phone: g.phone,
                          relationship: g.relationship,
                          is_primary: true,
                        }),
                      },
                    );
                    if (res.ok) refresh();
                  } finally {
                    setMakingPrimaryId(null);
                  }
                }}
              />
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-5 pt-5 border-t border-[#E5E7EB]">
          <GuardianEditForm
            initial={{
              first_name: "",
              last_name: "",
              email: "",
              phone: "",
              relationship: "",
              is_primary: false,
            }}
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              refresh();
            }}
            onSubmit={async (draft) => {
              const res = await fetch(
                `/api/admin/players/${playerId}/guardians`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    first_name: draft.first_name.trim(),
                    last_name: draft.last_name.trim(),
                    email: draft.email.trim().toLowerCase(),
                    phone: draft.phone.trim() || null,
                    relationship: draft.relationship.trim() || null,
                    is_primary: draft.is_primary,
                  }),
                },
              );
              return res;
            }}
            showPrimaryToggle
            submitLabel="Add Guardian"
          />
        </div>
      )}

      {pendingRemove && (
        <RemoveGuardianModal
          guardian={pendingRemove}
          playerId={playerId}
          onClose={() => setPendingRemove(null)}
          onRemoved={() => {
            setPendingRemove(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function GuardianViewRow({
  guardian: g,
  onEdit,
  onRemove,
  onMakePrimary,
  isMakingPrimary,
}: {
  guardian: GuardianWithLink;
  onEdit: () => void;
  onRemove: () => void;
  onMakePrimary: () => void;
  isMakingPrimary: boolean;
}) {
  const name =
    `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() || "Unnamed guardian";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-semibold text-[#0A0A0B] truncate">
            {name}
          </div>
          {g.is_primary && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A90D9]">
              <Star className="w-3 h-3" fill="currentColor" />
              Primary
            </span>
          )}
        </div>
        <div className="mt-1 text-[12px] text-[#6B7280] flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="break-all">{g.email}</span>
          <span>· {g.phone ?? "No phone on file"}</span>
          {g.relationship && <span>· {g.relationship}</span>}
        </div>
        {!g.is_primary && (
          <button
            type="button"
            onClick={onMakePrimary}
            disabled={isMakingPrimary}
            className="mt-1.5 text-[11px] font-medium text-[#4A90D9] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isMakingPrimary ? "Making primary…" : "Make Primary"}
          </button>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit guardian"
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove guardian from player"
          className="p-1.5 rounded-md text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/[0.08] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function GuardianEditForm({
  initial,
  showPrimaryToggle,
  submitLabel,
  onSubmit,
  onCancel,
  onSaved,
}: {
  initial: DraftFields;
  showPrimaryToggle: boolean;
  submitLabel: string;
  onSubmit: (draft: DraftFields) => Promise<Response>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<DraftFields>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await onSubmit(draft);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          field?: string;
        };
        setError(
          data.field
            ? `${data.field}: ${data.error ?? "invalid value"}`
            : (data.error ?? "Save failed. Try again."),
        );
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch (err) {
      console.error("[GuardianEditForm] submit threw:", err);
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 text-[13px]">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First name"
          value={draft.first_name}
          onChange={(v) => setDraft({ ...draft, first_name: v })}
          required
        />
        <Input
          label="Last name"
          value={draft.last_name}
          onChange={(v) => setDraft({ ...draft, last_name: v })}
          required
        />
      </div>
      <Input
        label="Email"
        type="email"
        value={draft.email}
        onChange={(v) => setDraft({ ...draft, email: v })}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Phone"
          type="tel"
          value={draft.phone}
          onChange={(v) => setDraft({ ...draft, phone: v })}
        />
        <Input
          label="Relationship"
          value={draft.relationship}
          onChange={(v) => setDraft({ ...draft, relationship: v })}
          placeholder="Father, Mother, Guardian…"
        />
      </div>
      {showPrimaryToggle && (
        <label className="flex items-center gap-2 text-[12px] text-[#0A0A0B]">
          <input
            type="checkbox"
            checked={draft.is_primary}
            onChange={(e) =>
              setDraft({ ...draft, is_primary: e.target.checked })
            }
            className="w-4 h-4 rounded border-[#E5E7EB] text-[#4A90D9]"
          />
          Set as primary guardian
        </label>
      )}

      {error && (
        <p role="alert" className="text-[12px] text-[#EF4444]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#4A90D9] text-white text-[12px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[13px] text-[#0A0A0B] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
      />
    </label>
  );
}

function RemoveGuardianModal({
  guardian,
  playerId,
  onClose,
  onRemoved,
}: {
  guardian: GuardianWithLink;
  playerId: string;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, submitting]);

  const remove = useCallback(async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/players/${playerId}/guardians/${guardian.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Remove failed. Try again.");
        setSubmitting(false);
        return;
      }
      onRemoved();
    } catch (err) {
      console.error("[RemoveGuardianModal] threw:", err);
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }, [guardian.id, onRemoved, playerId, submitting]);

  const name =
    `${guardian.first_name ?? ""} ${guardian.last_name ?? ""}`.trim() ||
    guardian.email;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="remove-guardian-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!submitting) onClose();
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-[440px] rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)] p-7">
        <h2
          id="remove-guardian-title"
          className="text-[17px] font-semibold tracking-tight text-[#0A0A0B]"
        >
          Remove {name} from this player?
        </h2>
        <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
          This unlinks the guardian from this player. The guardian record stays
          on file (siblings may still be linked to them). If they were the
          primary contact, the oldest remaining guardian becomes primary.
        </p>

        {error && (
          <p role="alert" className="mt-3 text-[12px] text-[#EF4444]">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#EF4444] text-[#EF4444] text-[13px] font-semibold hover:bg-[#EF4444]/[0.06] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Removing…" : "Confirm Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
