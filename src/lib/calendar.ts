/**
 * Schedule data for the public /schedule page.
 *
 * SOURCE OF TRUTH IS SUPABASE (`events`), as of 2026-08-25.
 *
 * This file previously read the Google Calendar API and — when the key was
 * missing, the call failed, or the calendar came back empty — silently fell
 * back to a hardcoded PLACEHOLDER_EVENTS array containing INVENTED practices
 * and a fictional "Midwest Showdown" tournament with a real-looking venue and
 * date. Parents could see fabricated events on the live site. Both the Google
 * path and the placeholders are deleted. There is no fallback now: if the
 * database is unreachable the page shows an error, because showing a made-up
 * schedule is worse than showing none.
 *
 * Events whose date the club has not confirmed are NOT returned by getEvents().
 * They come back from getUnconfirmedEvents() instead and render as "Date TBC".
 */

import { getEvents as getClubEvents, type ClubEvent } from "@/lib/events";

export type EventType =
  | "tournament"
  | "practice"
  | "camp"
  | "showcase"
  | "meeting"
  | "training";

export interface ScheduleEvent {
  id: string;
  title: string;
  eventType: EventType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  location: string;
  address: string;
  description: string;
  teams: number[];   // grad years, e.g. [2027, 2028]
  isAllDay: boolean;
  isCancelled: boolean;
}

/** An event the club has scheduled but not yet dated. Renders as "Date TBC". */
export interface UndatedEvent {
  id: string;
  title: string;
  eventType: EventType;
  dateNote: string | null;
  location: string;
  description: string;
  teams: number[];
}

// Brand palette only — Electric/Deep Carolina, black, gray. No YOU.PRJCT+
// gradient: different company, different brand.
// Two of these carry the fall: every Saturday is a four-hour block — the
// Academy hour first, then team practice — and the pair must read as two
// distinct things at a glance without turning the page into a paint chart.
export const EVENT_COLORS: Record<EventType, string> = {
  practice: "#1E7FB5",   // Deep Carolina — the team's own session, 12–2
  training: "#7FB8E0",   // light Carolina — the Academy block before it, 10–12
  tournament: "#0A0A0A", // black — travel weekends stand apart from both
  showcase: "#3AB0E8",
  camp: "#98A0AB",
  meeting: "#98A0AB",
};

export const EVENT_LABELS: Record<EventType, string> = {
  tournament: "Tournament",
  practice: "Practice",
  camp: "Camp",
  showcase: "Showcase",
  meeting: "Meeting",
  training: "Academy",
};

/** `events.event_type` allows 'other'; the page vocabulary does not. */
function toPageType(type: ClubEvent["eventType"]): EventType {
  return type === "other" ? "meeting" : type;
}

function teamsOf(event: ClubEvent, allGradYears: number[]): number[] {
  if (event.appliesToAll) return allGradYears;
  return event.teamSlugs
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

/** Split an ISO timestamp into local (Eastern) date and HH:MM parts. */
function easternParts(iso: string): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  // Intl renders midnight as "24" in some runtimes; normalize.
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

function toScheduleEvent(event: ClubEvent, allGradYears: number[]): ScheduleEvent {
  const start = easternParts(event.startsAt!);
  const end = event.endsAt ? easternParts(event.endsAt) : start;
  return {
    id: event.id,
    title: event.title,
    eventType: toPageType(event.eventType),
    startDate: start.date,
    endDate: end.date,
    startTime: event.allDay ? "00:00" : start.time,
    endTime: event.allDay ? "23:59" : end.time,
    location: event.locationName ?? "",
    address: event.locationAddress ?? "",
    description: event.description ?? "",
    teams: teamsOf(event, allGradYears),
    isAllDay: event.allDay,
    isCancelled: event.status === "cancelled",
  };
}

async function loadSplit() {
  const events = await getClubEvents();
  const allGradYears = [
    ...new Set(
      events.flatMap((e) => e.teamSlugs.map(Number).filter(Number.isFinite)),
    ),
  ].sort((a, b) => a - b);
  return { events, allGradYears };
}

/** Confirmed-date, published events for the calendar grid. */
export async function getEvents(): Promise<ScheduleEvent[]> {
  const { events, allGradYears } = await loadSplit();
  return events
    .filter((e) => e.dateConfirmed && e.startsAt)
    .map((e) => toScheduleEvent(e, allGradYears));
}

/**
 * Scheduled-but-undated events. These are real commitments whose date the club
 * has not confirmed — fall tournaments awaiting an operator's release, most
 * often. They render as "Date TBC" and are deliberately withheld from the
 * calendar feed: a wrong date on a parent's phone is worse than no date.
 */
export async function getUnconfirmedEvents(): Promise<UndatedEvent[]> {
  const { events, allGradYears } = await loadSplit();
  return events
    .filter((e) => !e.dateConfirmed)
    .map((e) => ({
      id: e.id,
      title: e.title,
      eventType: toPageType(e.eventType),
      dateNote: e.dateNote,
      location: e.locationName ?? "",
      description: e.description ?? "",
      teams: teamsOf(e, allGradYears),
    }));
}

/**
 * A one-click "Add to Google Calendar" link for a single event.
 *
 * This is the SECONDARY mechanism, deliberately. Subscribing to the feed is
 * what keeps a family right: it is one action and every later change reaches
 * them. A Google link copies the event as it is today into their calendar and
 * then knows nothing — if a practice moves, their copy silently stays wrong.
 *
 * So it exists for the parent who wants one thing on their calendar without
 * subscribing to everything, and the copy around it should never present it as
 * equivalent to subscribing.
 *
 * Google reads UTC when the timestamps carry a Z, which avoids the whole class
 * of bugs where an event lands an hour out for a family in another timezone.
 */
export function googleCalendarUrl(event: ScheduleEvent): string {
  const stamp = (date: string, time: string) => {
    // The stored times are Eastern wall-clock; convert to UTC for Google.
    const local = new Date(`${date}T${time}:00`);
    const eastern = new Date(
      local.toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    const offsetMs = local.getTime() - eastern.getTime();
    return new Date(local.getTime() + offsetMs)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.isCancelled ? `CANCELLED: ${event.title}` : event.title,
    dates: event.isAllDay
      ? `${event.startDate.replace(/-/g, "")}/${event.endDate.replace(/-/g, "")}`
      : `${stamp(event.startDate, event.startTime)}/${stamp(event.endDate, event.endTime)}`,
  });

  const where = [event.location, event.address].filter(Boolean).join(", ");
  if (where) params.set("location", where);
  if (event.description) params.set("details", event.description);

  return `https://calendar.google.com/calendar/render?${params}`;
}
