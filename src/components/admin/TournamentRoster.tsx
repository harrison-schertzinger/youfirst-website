"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, Users } from "lucide-react";
import AddPlayersToTournamentModal, {
  type AvailablePlayer,
} from "@/components/admin/AddPlayersToTournamentModal";

export interface RosterEntry {
  player_id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  position: string | null;
}

interface Props {
  tournamentId: string;
  tournamentName: string;
  tournamentAgeGroup: string | null;
  initialRoster: RosterEntry[];
  availablePlayers: AvailablePlayer[];
}

export default function TournamentRoster({
  tournamentId,
  tournamentName,
  tournamentAgeGroup,
  initialRoster,
  availablePlayers,
}: Props) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  // Track which player ids we've optimistically removed so the row
  // disappears as soon as the user confirms, without waiting for the
  // server round-trip + revalidation.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = initialRoster.filter((r) => !removedIds.has(r.player_id));

  const removePlayer = useCallback(
    async (playerId: string) => {
      setError(null);
      setRemovingId(playerId);
      try {
        const res = await fetch(
          `/api/admin/tournaments/${tournamentId}/roster`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_id: playerId }),
          },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Failed to remove from roster.");
          setRemovingId(null);
          return;
        }
        setRemovedIds((prev) => new Set(prev).add(playerId));
        setConfirmingRemoveId(null);
        setRemovingId(null);
        router.refresh();
      } catch (err) {
        console.error("[TournamentRoster] remove threw:", err);
        setError("Network error.");
        setRemovingId(null);
      }
    },
    [tournamentId, router],
  );

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <header className="flex items-center justify-between px-6 md:px-7 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-[#6B7280]" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
            Roster · {visible.length}{" "}
            {visible.length === 1 ? "player" : "players"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#4A90D9] text-white text-[12px] font-semibold hover:bg-[#3A7BC8] transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Players
        </button>
      </header>

      {error && (
        <div className="px-6 py-2 border-b border-[#EF4444]/20 bg-[#FEF2F2]">
          <p role="alert" className="text-[12px] text-[#EF4444]">
            {error}
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
          No players assigned yet. Add players to build the roster for this
          tournament.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <Th>Name</Th>
                <Th>Class</Th>
                <Th>Position</Th>
                <Th className="text-right">Remove</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.player_id}
                  className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors h-10"
                >
                  <td className="px-5 py-2 text-[#0A0A0B]">
                    <Link
                      href={`/admin/players/${r.player_id}`}
                      className="font-medium hover:text-[#4A90D9] transition-colors"
                    >
                      {r.first_name} {r.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-[#6B7280] tabular-nums">
                    {r.graduation_year ?? "—"}
                  </td>
                  <td className="px-5 py-2 text-[#6B7280]">
                    {r.position ?? "—"}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {confirmingRemoveId === r.player_id ? (
                      <span className="inline-flex items-center gap-2 text-[11px]">
                        <span className="text-[#EF4444]">Remove?</span>
                        <button
                          type="button"
                          onClick={() => removePlayer(r.player_id)}
                          disabled={removingId === r.player_id}
                          className="font-semibold text-[#EF4444] hover:underline disabled:opacity-60"
                        >
                          {removingId === r.player_id && (
                            <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                          )}
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingRemoveId(null)}
                          disabled={removingId === r.player_id}
                          className="text-[#6B7280] hover:text-[#0A0A0B] disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingRemoveId(r.player_id)}
                        title="Remove from roster"
                        className="inline-flex items-center justify-center p-1.5 rounded text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddPlayersToTournamentModal
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          tournamentAgeGroup={tournamentAgeGroup}
          available={availablePlayers}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </section>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] text-left",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}
