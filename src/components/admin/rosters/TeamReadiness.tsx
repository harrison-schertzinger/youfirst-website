import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  ROSTER_SIZE_MAX,
  ROSTER_SIZE_MIN,
  type TeamReadiness as Team,
} from "@/lib/rosters/readiness";

/**
 * Roster readiness — every team's shape at a glance, worst first.
 *
 * The Command Center already shows a shape strip, but only for the class tab
 * you are standing on. This answers the question that needs the whole club in
 * view at once: WHICH team needs attention first. Order is the feature — the
 * team missing a goalie is the top-left tile, always.
 *
 * No hooks, no state — a plain function component so a server page can render
 * it directly with no client bundle at all.
 *
 * Targets are ROSTER_SIZE_MIN/MAX from the shared roster vocabulary, NOT a
 * second set of numbers. See the header of src/lib/rosters/readiness.ts.
 */
export default function TeamReadiness({
  teams,
  heading = "Roster Readiness",
}: {
  teams: Team[];
  heading?: string;
}) {
  const goalieHunt = teams.filter((t) => t.needsGoalie);
  const short = teams.filter((t) => !t.atMinimum);

  return (
    <section aria-label={heading} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[13px] font-bold tracking-tight text-[#0A0A0B]">
          {heading}
        </h2>
        <p className="text-[11px] text-[#9CA3AF]">
          Target {ROSTER_SIZE_MIN}–{ROSTER_SIZE_MAX} per team, {" "}
          {goalieHunt.length > 0
            ? `${goalieHunt.length} short a goalie`
            : "every team has a goalie"}
          {short.length > 0 ? ` · ${short.length} under size` : ""}
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] px-4 py-8 text-center text-[12px] text-[#9CA3AF]">
          No athletes are placed on a team yet. Readiness fills in as placements
          are made.
        </div>
      ) : (
        <ul className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <li
              key={team.key}
              className="rounded-xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] px-4 py-3"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7280] truncate">
                  {team.label}
                </span>
              </div>

              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className="text-[20px] font-bold tracking-tight tabular-nums"
                  style={{ color: !team.atMinimum ? "#EF4444" : "#0A0A0B" }}
                >
                  {team.count}
                </span>
                <span className="text-[11px] font-normal text-[#9CA3AF] tabular-nums">
                  / {ROSTER_SIZE_MIN}–{ROSTER_SIZE_MAX}
                </span>
              </div>

              <div className="mt-1.5 space-y-1">
                {team.needsGoalie && (
                  <Flag tone="#EF4444" Icon={ShieldAlert}>
                    No goalie
                  </Flag>
                )}
                {!team.atMinimum && (
                  <Flag tone="#EF4444" Icon={AlertTriangle}>
                    {team.shortBy} short of {ROSTER_SIZE_MIN}
                  </Flag>
                )}
                {team.atMinimum && !team.needsGoalie && (
                  <span className="text-[11px] text-[#9CA3AF]">
                    At size · {team.goalies} goalie{team.goalies === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Flag({
  tone,
  Icon,
  children,
}: {
  tone: string;
  Icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] font-medium"
      style={{ color: tone }}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {children}
    </span>
  );
}
