"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import {
  CONTACT_FOR_MAX,
  NAME_MAX,
  NOTES_MAX,
  needsDetail,
  type OpsContact,
} from "@/lib/ops-contacts";

/**
 * The contact book Luke inherits. Name, what they're the contact for, notes.
 *
 * Every row is editable in place and new rows are added from the same screen,
 * because the seeded list is deliberately incomplete — two rows say "Needs
 * detail" out loud rather than guessing at Gary Potterbaum's relationship or
 * naming a league app nobody confirmed. Filling those in is typing, not a
 * deploy.
 */
export default function OpsContacts({ initial }: { initial: OpsContact[] }) {
  const [contacts, setContacts] = useState<OpsContact[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(
    id: string | null,
    values: { name: string; contact_for: string; notes: string },
  ) {
    setBusyId(id ?? "new");
    setError(null);
    try {
      const res = await fetch(
        id ? `/api/admin/ops-contacts/${id}` : "/api/admin/ops-contacts",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't save that.");
        return;
      }
      const saved = data.contact as OpsContact;
      setContacts((prev) =>
        id ? prev.map((c) => (c.id === id ? saved : c)) : [...prev, saved],
      );
      setEditing(null);
      setAdding(false);
    } catch {
      setError("Network error — nothing was saved.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(contact: OpsContact) {
    setBusyId(contact.id);
    setError(null);
    const before = contacts;
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    try {
      const res = await fetch(`/api/admin/ops-contacts/${contact.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setContacts(before);
        setError(
          typeof data.error === "string" ? data.error : "Couldn't remove that contact.",
        );
      }
    } catch {
      setContacts(before);
      setError("Network error — the contact wasn't removed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Contacts" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[13px] font-bold tracking-tight text-[#0A0A0B]">Contacts</h2>
        <p className="text-[11px] text-[#9CA3AF]">Who to call, and what for.</p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-2.5 text-[12px] text-[#EF4444]"
        >
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] divide-y divide-[#F1F2F4]">
        {contacts.length === 0 && !adding && (
          <p className="px-4 py-8 text-center text-[12px] text-[#9CA3AF]">
            No contacts yet.
          </p>
        )}

        {contacts.map((contact) =>
          editing === contact.id ? (
            <ContactForm
              key={contact.id}
              initial={contact}
              busy={busyId === contact.id}
              onCancel={() => setEditing(null)}
              onSubmit={(values) => save(contact.id, values)}
            />
          ) : (
            <div
              key={contact.id}
              className={[
                "flex items-start justify-between gap-3 px-4 py-3 transition-opacity",
                busyId === contact.id ? "opacity-50" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[13px] font-semibold text-[#0A0A0B]">
                    {contact.name}
                  </span>
                  <span
                    className={[
                      "text-[11px]",
                      needsDetail(contact)
                        ? "font-medium text-[#F59E0B]"
                        : "text-[#6B7280]",
                    ].join(" ")}
                  >
                    {contact.contact_for}
                  </span>
                </div>
                {contact.notes && (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#9CA3AF]">
                    {contact.notes}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(contact.id);
                    setError(null);
                  }}
                  aria-label={`Edit ${contact.name}`}
                  className="rounded-md p-1.5 text-[#9CA3AF] hover:text-[#0A0A0B] hover:bg-[#F3F4F6] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(contact)}
                  disabled={busyId === contact.id}
                  aria-label={`Remove ${contact.name}`}
                  className="rounded-md p-1.5 text-[#D1D5DB] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors disabled:opacity-40"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ),
        )}

        {adding ? (
          <ContactForm
            busy={busyId === "new"}
            onCancel={() => setAdding(false)}
            onSubmit={(values) => save(null, values)}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
            className="flex w-full items-center gap-1.5 px-4 py-3 text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors rounded-b-2xl"
          >
            <Plus className="w-3.5 h-3.5" />
            Add a contact
          </button>
        )}
      </div>
    </section>
  );
}

function ContactForm({
  initial,
  busy,
  onCancel,
  onSubmit,
}: {
  initial?: OpsContact;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; contact_for: string; notes: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactFor, setContactFor] = useState(initial?.contact_for ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const canSave = name.trim().length > 0 && contactFor.trim().length > 0 && !busy;

  const field =
    "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12px] text-[#0A0A0B] placeholder:text-[#9CA3AF] focus:border-[#4A90D9] focus:outline-none";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave)
          onSubmit({
            name: name.trim(),
            contact_for: contactFor.trim(),
            notes: notes.trim(),
          });
      }}
      className="px-4 py-3 space-y-2 bg-[#4A90D9]/[0.03]"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          autoFocus
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Contact name"
          className={field}
        />
        <input
          value={contactFor}
          maxLength={CONTACT_FOR_MAX}
          onChange={(e) => setContactFor(e.target.value)}
          placeholder="What they're the contact for"
          aria-label="What they're the contact for"
          className={field}
        />
      </div>
      <textarea
        value={notes}
        rows={2}
        maxLength={NOTES_MAX}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        aria-label="Notes"
        className={`${field} resize-none`}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#6B7280] hover:text-[#0A0A0B] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
