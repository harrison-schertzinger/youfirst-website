"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import {
  BOARD_COLUMNS,
  BODY_MAX,
  COLUMN_META,
  TITLE_MAX,
  shortAuthor,
  type BoardColumn,
  type WarRoomCard,
} from "@/lib/war-room";

/**
 * The War Room — three columns, one shared whiteboard.
 *
 * Harrison, Henry and Luke all write to the same board, so every card carries
 * who put it up and nothing else. There is no drag-and-drop: a card moves with
 * the arrow buttons in its own footer, which costs one click, works on a phone
 * without a gesture library, and is reachable from a keyboard. A board this
 * small does not earn a drag dependency.
 *
 * Moving IS the point of the board. Harrison's media day idea starts in Ideas;
 * the day it becomes work, one arrow takes it to Doing Now.
 */

/**
 * What is in flight. Discriminated on `kind` rather than on the id, because a
 * card id is a string and so is the literal "new" — a union keyed on the id
 * alone does not narrow, it only looks like it does.
 */
type Busy =
  | { kind: "card"; id: string }
  | { kind: "new"; column: BoardColumn }
  | null;

export default function WarRoomBoard({ initial }: { initial: WarRoomCard[] }) {
  const [cards, setCards] = useState<WarRoomCard[]>(initial);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<BoardColumn | null>(null);

  async function addCard(column: BoardColumn, title: string, body: string) {
    setBusy({ kind: "new", column });
    setError(null);
    try {
      const res = await fetch("/api/admin/war-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_column: column, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't add that card.");
        return;
      }
      setCards((prev) => [data.card as WarRoomCard, ...prev]);
      setOpenForm(null);
    } catch {
      setError("Network error — the card wasn't saved.");
    } finally {
      setBusy(null);
    }
  }

  async function moveCard(card: WarRoomCard, direction: -1 | 1) {
    const index = BOARD_COLUMNS.indexOf(card.board_column);
    const next = BOARD_COLUMNS[index + direction];
    if (!next) return;

    setBusy({ kind: "card", id: card.id });
    setError(null);
    // Optimistic: the move is a single field and the row is already on screen,
    // so the column snaps immediately and rolls back if the write is refused.
    const before = cards;
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, board_column: next } : c)),
    );
    try {
      const res = await fetch(`/api/admin/war-room/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_column: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCards(before);
        setError(typeof data.error === "string" ? data.error : "Couldn't move that card.");
      }
    } catch {
      setCards(before);
      setError("Network error — the card didn't move.");
    } finally {
      setBusy(null);
    }
  }

  async function removeCard(card: WarRoomCard) {
    setBusy({ kind: "card", id: card.id });
    setError(null);
    const before = cards;
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    try {
      const res = await fetch(`/api/admin/war-room/${card.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCards(before);
        setError(typeof data.error === "string" ? data.error : "Couldn't remove that card.");
      }
    } catch {
      setCards(before);
      setError("Network error — the card wasn't removed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="War Room board" className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-2.5 text-[12px] text-[#EF4444]"
        >
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {BOARD_COLUMNS.map((column) => {
          const meta = COLUMN_META[column];
          const list = cards.filter((c) => c.board_column === column);
          return (
            <div key={column} className="rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
              <div className="px-4 pt-4 pb-3 border-b border-[#F1F2F4]">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-bold tracking-tight text-[#0A0A0B]">
                    {meta.title}
                  </h3>
                  <span className="text-[11px] tabular-nums text-[#9CA3AF]">
                    {list.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{meta.hint}</p>
              </div>

              <ul className="p-3 space-y-2">
                {list.length === 0 && openForm !== column && (
                  <li className="rounded-xl border border-dashed border-[#E5E7EB] px-3 py-6 text-center text-[11px] text-[#9CA3AF]">
                    Nothing here yet.
                  </li>
                )}

                {list.map((card) => {
                  const index = BOARD_COLUMNS.indexOf(card.board_column);
                  const cardBusy = busy?.kind === "card" && busy.id === card.id;
                  return (
                    <li
                      key={card.id}
                      className={[
                        "group rounded-xl border border-[#E5E7EB] px-3 py-2.5 transition-opacity",
                        cardBusy ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold leading-snug text-[#0A0A0B]">
                          {card.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeCard(card)}
                          disabled={cardBusy}
                          aria-label={`Remove ${card.title}`}
                          className="shrink-0 -mr-1 -mt-0.5 rounded-md p-1 text-[#D1D5DB] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {card.body && (
                        <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">
                          {card.body}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">
                          {shortAuthor(card.added_by)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveCard(card, -1)}
                            disabled={cardBusy || index === 0}
                            aria-label={`Move ${card.title} to ${
                              COLUMN_META[BOARD_COLUMNS[index - 1] ?? column].title
                            }`}
                            className="rounded-md p-1 text-[#9CA3AF] hover:text-[#0A0A0B] hover:bg-[#F3F4F6] transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCard(card, 1)}
                            disabled={cardBusy || index === BOARD_COLUMNS.length - 1}
                            aria-label={`Move ${card.title} to ${
                              COLUMN_META[BOARD_COLUMNS[index + 1] ?? column].title
                            }`}
                            className="rounded-md p-1 text-[#9CA3AF] hover:text-[#0A0A0B] hover:bg-[#F3F4F6] transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}

                <li>
                  {openForm === column ? (
                    <AddCardForm
                      busy={busy?.kind === "new" && busy.column === column}
                      onCancel={() => setOpenForm(null)}
                      onSubmit={(title, body) => addCard(column, title, body)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenForm(column);
                        setError(null);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add a card
                    </button>
                  )}
                </li>
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AddCardForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const canSave = title.trim().length > 0 && !busy;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSubmit(title.trim(), body.trim());
      }}
      className="rounded-xl border border-[#4A90D9]/40 bg-[#4A90D9]/[0.03] p-2.5 space-y-2"
    >
      <input
        autoFocus
        value={title}
        maxLength={TITLE_MAX}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Short title"
        aria-label="Card title"
        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#0A0A0B] placeholder:font-normal placeholder:text-[#9CA3AF] focus:border-[#4A90D9] focus:outline-none"
      />
      <textarea
        value={body}
        rows={2}
        maxLength={BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        placeholder="One line of detail (optional)"
        aria-label="Card description"
        className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12px] text-[#0A0A0B] placeholder:text-[#9CA3AF] focus:border-[#4A90D9] focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          {busy ? "Adding…" : "Add"}
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
