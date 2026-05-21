"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";

const POSITIONS = [
  "Attack",
  "Midfield",
  "Defense",
  "Goalie",
  "Other",
] as const;
type Position = (typeof POSITIONS)[number];

interface PlayerEditable {
  position: string | null;
  jersey_number: string | null;
  school: string | null;
}

interface Props {
  playerId: string;
  initial: PlayerEditable & {
    team_name: string | null;
    created_at: string | null;
    status: string;
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlayerInfoEditable({ playerId, initial }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState<PlayerEditable>({
    position: initial.position,
    jersey_number: initial.jersey_number,
    school: initial.school,
  });
  // Draft is what's in the form inputs while editing. Strings only so empty
  // textbox stays distinguishable from null until save.
  const [draft, setDraft] = useState<{
    position: Position | "";
    jersey_number: string;
    school: string;
  }>({
    position: (POSITIONS as readonly string[]).includes(current.position ?? "")
      ? (current.position as Position)
      : "",
    jersey_number: current.jersey_number ?? "",
    school: current.school ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enterEdit = useCallback(() => {
    setDraft({
      position: (POSITIONS as readonly string[]).includes(current.position ?? "")
        ? (current.position as Position)
        : "",
      jersey_number: current.jersey_number ?? "",
      school: current.school ?? "",
    });
    setError(null);
    setFieldError(null);
    setEditing(true);
  }, [current]);

  const cancel = useCallback(() => {
    setEditing(false);
    setError(null);
    setFieldError(null);
  }, []);

  const save = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);
      setFieldError(null);
      setSubmitting(true);
      try {
        const payload = {
          position: draft.position === "" ? null : draft.position,
          jersey_number: draft.jersey_number.trim() || null,
          school: draft.school.trim() || null,
        };
        const res = await fetch(`/api/admin/players/${playerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 400) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            field?: string;
          };
          if (data.field) {
            setFieldError(`${data.field}: ${data.error ?? "invalid value"}`);
          } else {
            setError(data.error ?? "Some fields are invalid.");
          }
          setSubmitting(false);
          return;
        }
        if (res.status === 403) {
          setError("You're not authorized to edit players.");
          setSubmitting(false);
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(data.error ?? "Update failed. Try again.");
          setSubmitting(false);
          return;
        }
        // Reflect saved values locally; no full page reload required.
        setCurrent(payload);
        setEditing(false);
        // Refresh the server tree so the page header (and any other
        // server-rendered surface that reads player fields) re-fetches
        // with the new values.
        router.refresh();
      } catch (err) {
        console.error("[PlayerInfoEditable] threw:", err);
        setError("Network error. Try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [draft, playerId, submitting],
  );

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 md:p-7">
      <header className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Player Info
          </div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
            {editing ? "Editing — save or cancel below" : "Roster details"}
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
        <form onSubmit={save} noValidate className="space-y-5">
          <FieldRow label="Position">
            <select
              value={draft.position}
              onChange={(e) =>
                setDraft({ ...draft, position: e.target.value as Position | "" })
              }
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
            >
              <option value="">— not set —</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Jersey number">
            <input
              type="text"
              value={draft.jersey_number}
              onChange={(e) =>
                setDraft({ ...draft, jersey_number: e.target.value })
              }
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
            />
          </FieldRow>
          <FieldRow label="School">
            <input
              type="text"
              value={draft.school}
              onChange={(e) => setDraft({ ...draft, school: e.target.value })}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9] transition-colors"
            />
          </FieldRow>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <StaticRow label="Team" value={initial.team_name ?? "—"} />
            <StaticRow label="Created" value={fmtDate(initial.created_at)} />
            <StaticRow label="Status" value={initial.status} />
          </div>

          {(error || fieldError) && (
            <p role="alert" className="text-[12px] text-[#EF4444]">
              {fieldError ?? error}
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
          <ViewRow label="Position" value={current.position ?? "—"} />
          <ViewRow label="Jersey #" value={current.jersey_number ?? "—"} />
          <ViewRow label="School" value={current.school ?? "—"} />
          <ViewRow label="Team" value={initial.team_name ?? "—"} />
          <ViewRow label="Created" value={fmtDate(initial.created_at)} />
          <ViewRow label="Status" value={initial.status} />
        </dl>
      )}
    </section>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[#0A0A0B]">{value}</dd>
    </div>
  );
}

function StaticRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
        {label}
      </span>
      <div className="text-[#0A0A0B]">{value}</div>
    </div>
  );
}
