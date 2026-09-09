/**
 * Roster readiness — every team's shape on one line, so "which team needs the
 * most attention" is answered by looking rather than by clicking through tabs.
 *
 * THIS FILE INVENTS NO DATA AND NO TARGETS. It is a pure reduction over the
 * RosterData the Command Center already builds, and the targets it measures
 * against are ROSTER_SIZE_MIN / ROSTER_SIZE_MAX / ROSTER_SHAPE from
 * ./shared.ts — the same constants the per-class shape strip on /admin uses.
 *
 * That reuse is the whole point. The handoff spec proposed 13 minimum / 15
 * ideal; Harrison ruled on 2026-09-09 to keep the club's existing 14–17 and
 * have one number club-wide. If a second set of targets ever appears here, the
 * readiness board and the placement screen will disagree about whether a team
 * is short, and a coach will make a call on the wrong one.
 *
 * Pure — no Supabase, no env. Safe to import from a client component.
 */

import {
  BLUE_TEAM_NAME,
  ROSTER_SHAPE,
  ROSTER_SIZE_MAX,
  ROSTER_SIZE_MIN,
  groupKeyForYear,
  type RosterAthlete,
  type RosterData,
} from "@/lib/rosters/shared";

/** The goalie target, read off the shared roster shape rather than restated. */
const GOALIE_MIN =
  ROSTER_SHAPE.find((t) => t.position === "Goalie")?.min ?? 1;

export interface TeamReadiness {
  /** Stable key — the class group ("2029", "2033/2034") or "blue". */
  key: string;
  /** What a human calls this team. */
  label: string;
  count: number;
  goalies: number;
  /** Short of the club's goalie target — the "goalie hunt" flag. */
  needsGoalie: boolean;
  /** How many players short of ROSTER_SIZE_MIN. 0 when the team is at size. */
  shortBy: number;
  /** True once the team has reached the minimum. */
  atMinimum: boolean;
}

/**
 * Which athletes count toward a team's size.
 *
 * The Elite bucket per class, plus the legacy elite_youth value that nothing
 * writes any more but that a historical row can still carry — folded in for
 * exactly the reason RostersClient folds it in: an athlete holding a retired
 * value must be VISIBLE under her team, not silently uncounted.
 *
 * elite_training, declined, no_tryout, no_registration and Pending are NOT
 * teams and are not counted. A girl in the Elite Training Group does not make
 * her class's Elite roster one player less short.
 */
const COUNTED_ELITE_TIERS = ["elite", "elite_youth"] as const;

function isCountedElite(a: RosterAthlete): boolean {
  return (COUNTED_ELITE_TIERS as readonly string[]).includes(a.placementTier ?? "");
}

/**
 * ONE GIRL, ONE LINE.
 *
 * A registration is only absorbed into a returning player's row when it
 * actually carries her player_id (see data.ts, the "new band" loop). On
 * 2026-09-09 fifty-seven registrations held a placement tier with no such
 * link, and fifty of them named a girl who already had a player row on the
 * same team — so she arrived here twice, and the strip counted her twice.
 * You First Blue read 28 for a team of 14. 2029 read 31 for a team of 20.
 * Every team then looked "over 17" and the number beside it meant nothing.
 *
 * This folds the twin back in for the purposes of counting, on name within a
 * team she is already established on. The registration's POSITION comes with
 * her: seven of 2031's "blank" positions were never blank, they were recorded
 * on the duplicate row a few lines down, and dropping that row without
 * keeping its position would trade a double-count for a false blank.
 *
 * This is a GUARD, not the cure. The cure is linking those registrations to
 * their players so every screen agrees; until then this one strip refuses to
 * report a number it knows is inflated. Nothing here mutates the athletes it
 * is given — other screens still see their own rows.
 */
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function foldDuplicateRegistrations(list: RosterAthlete[]): RosterAthlete[] {
  const players = new Map<string, RosterAthlete>();
  for (const a of list) {
    if (a.table === "players") players.set(nameKey(a.name), a);
  }
  // Nothing to fold — the common case once the data is linked.
  if (players.size === 0) return list;

  const positionFromTwin = new Map<string, string>();
  const unmatched: RosterAthlete[] = [];
  for (const a of list) {
    if (a.table === "players") continue;
    const k = nameKey(a.name);
    const twin = players.get(k);
    if (!twin) {
      unmatched.push(a);
      continue;
    }
    // First recorded position wins, so the fold is stable between refreshes
    // if a girl somehow carries two registrations naming different positions.
    if (!twin.position && a.position && !positionFromTwin.has(k)) {
      positionFromTwin.set(k, a.position);
    }
  }

  const kept = list
    .filter((a) => a.table === "players")
    .map((a) => {
      if (a.position) return a;
      const filled = positionFromTwin.get(nameKey(a.name));
      return filled ? { ...a, position: filled } : a;
    });

  return [...kept, ...unmatched];
}

function summarize(key: string, label: string, list: RosterAthlete[]): TeamReadiness {
  const count = list.length;
  const goalies = list.filter((a) => a.position === "Goalie").length;
  return {
    key,
    label,
    count,
    goalies,
    needsGoalie: goalies < GOALIE_MIN,
    shortBy: Math.max(0, ROSTER_SIZE_MIN - count),
    atMinimum: count >= ROSTER_SIZE_MIN,
  };
}

/**
 * Every team that currently holds at least one athlete, worst first.
 *
 * ORDER IS THE FEATURE: sorted by how much attention the team needs — missing a
 * goalie outranks being short on bodies, and being further short outranks being
 * nearly full. Luke reads the top of this list and knows where his week goes.
 * Ties fall back to team name so the order is stable between refreshes and a
 * card does not jump while he is looking at it.
 *
 * You First Blue is ONE team across 2029 and 2030 — it gets one row, exactly as
 * it gets one tab on the Command Center, never one row per class.
 */
export function buildReadiness(data: RosterData): TeamReadiness[] {
  const byClass = new Map<string, RosterAthlete[]>();
  const blue: RosterAthlete[] = [];

  for (const a of data.athletes) {
    if (a.placementTier === "blue") {
      blue.push(a);
      continue;
    }
    if (!isCountedElite(a) || a.classYear == null) continue;
    const key = groupKeyForYear(a.classYear);
    const bucket = byClass.get(key);
    if (bucket) bucket.push(a);
    else byClass.set(key, [a]);
  }

  const teams: TeamReadiness[] = [];
  for (const [key, list] of byClass) {
    teams.push(summarize(key, `${key} Elite`, foldDuplicateRegistrations(list)));
  }
  if (blue.length > 0) {
    teams.push(summarize("blue", BLUE_TEAM_NAME, foldDuplicateRegistrations(blue)));
  }

  return teams.sort((x, y) => {
    if (x.needsGoalie !== y.needsGoalie) return x.needsGoalie ? -1 : 1;
    if (x.shortBy !== y.shortBy) return y.shortBy - x.shortBy;
    return x.label.localeCompare(y.label);
  });
}

export { GOALIE_MIN, ROSTER_SIZE_MAX, ROSTER_SIZE_MIN };
