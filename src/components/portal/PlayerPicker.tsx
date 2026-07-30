"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface RosterPlayer {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  team_name: string | null;
  position: string | null;
}

/**
 * Shown when a logged-in parent isn't linked to any player yet. Lets them
 * search the full active roster and link their email to their athlete. After
 * a successful link, `onLinked` re-pulls the portal so the player's portal
 * renders. A parent can come back and link additional players.
 */
export default function PlayerPicker({ onLinked }: { onLinked: () => void }) {
  const router = useRouter();
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  // Self-linking is off by default (see src/lib/portal-self-link.ts). When it
  // is, an unrecognised email gets a short human next step instead of a roster
  // she can pick any child out of.
  const [selfLinkDisabled, setSelfLinkDisabled] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/players");
        if (res.status === 401) {
          router.replace("/fees");
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setLoadError("Couldn’t load the roster. Please refresh.");
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as {
          players: RosterPlayer[];
          self_link_disabled?: boolean;
          message?: string;
        };
        if (!cancelled) {
          setPlayers(data.players ?? []);
          setSelfLinkDisabled(data.self_link_disabled === true);
          setDisabledMessage(data.message ?? "");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Network error. Please refresh.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.team_name ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [players, query]);

  async function link(playerId: string) {
    if (linkingId) return;
    setLinkingId(playerId);
    setLinkError("");
    try {
      const res = await fetch("/api/portal/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (res.status === 401) {
        router.replace("/fees");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setLinkError(data.error ?? "Couldn’t link. Please try again.");
        setLinkingId(null);
        return;
      }
      onLinked();
    } catch {
      setLinkError("Network error. Please try again.");
      setLinkingId(null);
    }
  }

  // Nothing to search and nothing to claim — just the next step.
  if (!loading && selfLinkDisabled) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="section-label mb-3">Player Portal</p>
        <h1 className="text-[1.75rem] md:text-[2rem] font-bold tracking-tight leading-[1.15] text-[#1A1A1A] mb-4">
          We need to connect your account
        </h1>
        <p className="text-base text-[#6B7280] leading-relaxed">
          {disabledMessage}
        </p>
        <a
          href="mailto:kathleen@youfirstlacrosse.com?subject=Portal%20access"
          className="mt-7 inline-block px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.35)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.5)] transition-all duration-300"
        >
          Email Kathleen
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 text-center">
        <p className="section-label mb-3">Player Portal</p>
        <h1 className="text-[2rem] md:text-[2.5rem] font-bold tracking-tight leading-[1.1] text-[#1A1A1A] mb-3">
          Find your athlete
        </h1>
        <p className="text-base text-[#6B7280] leading-relaxed">
          Search the roster and link your email to your player. You can link to
          more than one.
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or team…"
        className="w-full px-5 py-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 mb-6"
      />

      {linkError && (
        <p className="text-sm text-red-500 mb-4 text-center">{linkError}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-center text-sm text-[#9CA3AF] py-12">{loadError}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-[#9CA3AF] py-12">
          No players match “{query}”.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-[#1A1A1A] truncate">
                  {p.first_name} {p.last_name}
                </div>
                <div className="text-[13px] text-[#6B7280]">
                  {p.team_name ? `${p.team_name} · ` : ""}
                  {p.graduation_year ? `Class of ${p.graduation_year}` : ""}
                  {p.position ? ` · ${p.position}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => link(p.id)}
                disabled={linkingId !== null}
                className="shrink-0 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white bg-accent-blue rounded-lg shadow-[0_2px_8px_rgba(74,144,217,0.35)] hover:bg-accent-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {linkingId === p.id ? "Linking…" : "Link to my email"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
