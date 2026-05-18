"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";

const STATUSES = ["active", "cancelled", "completed"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_COLOR: Record<Status, string> = {
  active: "#4A90D9",
  cancelled: "#EF4444",
  completed: "#34D399",
};

interface EditableTournament {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  status: Status;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TournamentEditable({
  initial,
}: {
  initial: EditableTournament;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<EditableTournament>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: current.name,
    location: current.location ?? "",
    start_date: current.start_date ?? "",
    end_date: current.end_date ?? "",
    notes: current.notes ?? "",
    status: current.status,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const enterEdit = useCallback(() => {
    setDraft({
      name: current.name,
      location: current.location ?? "",
      start_date: current.start_date ?? "",
      end_date: current.end_date ?? "",
      notes: current.notes ?? "",
      status: current.status,
    });
    setError(null);
    setFieldError(null);
    setEditing(true);
  }, [current]);

  const save = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);
      setFieldError(null);

      if (!draft.name.trim()) {
        setFieldError("name: required");
        return;
      }
      if (draft.start_date && draft.end_date && draft.start_date > draft.end_date) {
        setFieldError("end_date: must be on or after start_date");
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          name: draft.name.trim(),
          location: draft.location.trim() || null,
          start_date: draft.start_date || null,
          end_date: draft.end_date || null,
          notes: draft.notes.trim() || null,
          status: draft.status,
        };
        const res = await fetch(`/api/admin/tournaments/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 400) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            field?: string;
          };
          setFieldError(
            data.field
              ? `${data.field}: ${data.error ?? "invalid value"}`
              : (data.error ?? "Validation failed."),
          );
          setSubmitting(false);
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Save failed.");
          setSubmitting(false);
          return;
        }
        setCurrent({ ...current, ...payload });
        setEditing(false);
        router.refresh();
      } catch (err) {
        console.error("[TournamentEditable] threw:", err);
        setError("Network error.");
      } finally {
        setSubmitting(false);
      }
    },
    [current, draft, router, submitting],
  );

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <header className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Tournament Info
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            {editing ? "Editing — save or cancel below" : current.name}
          </h2>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={enterEdit}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#4A90D9] hover:bg-[#4A90D9]/[0.08] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </header>

      {editing ? (
        <form onSubmit={save} noValidate className="space-y-4">
          <Labeled label="Name">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={200}
              className={inputClass()}
            />
          </Labeled>
          <Labeled label="Location">
            <input
              type="text"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              className={inputClass()}
            />
          </Labeled>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Labeled label="Start date">
              <input
                type="date"
                value={draft.start_date}
                onChange={(e) =>
                  setDraft({ ...draft, start_date: e.target.value })
                }
                className={inputClass()}
              />
            </Labeled>
            <Labeled label="End date">
              <input
                type="date"
                value={draft.end_date}
                onChange={(e) =>
                  setDraft({ ...draft, end_date: e.target.value })
                }
                className={inputClass()}
              />
            </Labeled>
          </div>
          <Labeled label="Status">
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as Status })
              }
              className={inputClass()}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Notes">
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className={`${inputClass()} resize-y min-h-[80px]`}
            />
          </Labeled>

          {(fieldError || error) && (
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {fieldError ?? error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
          <ViewRow label="Location" value={current.location ?? "—"} />
          <ViewRow
            label="Status"
            value={
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
                style={{ backgroundColor: STATUS_COLOR[current.status] }}
              >
                {STATUS_LABEL[current.status]}
              </span>
            }
          />
          <ViewRow label="Start date" value={fmtDate(current.start_date)} />
          <ViewRow label="End date" value={fmtDate(current.end_date)} />
          {current.notes && (
            <ViewRow
              label="Notes"
              value={current.notes}
              className="sm:col-span-2"
            />
          )}
        </dl>
      )}
    </section>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function ViewRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[#0A0A0B]">{value}</dd>
    </div>
  );
}

function inputClass(): string {
  return "w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors";
}
