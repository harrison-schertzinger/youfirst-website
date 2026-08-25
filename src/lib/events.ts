/**
 * The club schedule — server data layer and ICS generation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE
 *
 * An event's `uid` is generated once, by the database, and never changes. It is
 * emitted verbatim as the ICS UID. A calendar client keys every event it has
 * ever seen by UID:
 *
 *   • same UID, higher SEQUENCE  → the client UPDATES the event in place.
 *   • different UID              → the client CREATES A SECOND EVENT.
 *
 * So if a UID ever changed on edit, every schedule change would silently double
 * on every parent's phone, forever, with no way for us to see it happening.
 * `events_guard_uid_trg` in the database raises on any UPDATE that would change
 * it. Nothing in this file may synthesize, re-derive, or fall back to a
 * different UID. If a row has no uid, that is a bug — skip the row, don't
 * invent one.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Server-only: reads the service-role key. Never import from a client component.
 */

import { createClient } from "@supabase/supabase-js";

// ── Types ───────────────────────────────────────────────────────────────────

export type EventType =
  | "practice"
  | "tournament"
  | "showcase"
  | "camp"
  | "meeting"
  | "training"
  | "other";

export type EventStatus = "scheduled" | "cancelled";

export interface ClubEvent {
  id: string;
  uid: string;
  title: string;
  eventType: EventType;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  dateConfirmed: boolean;
  dateNote: string | null;
  locationName: string | null;
  locationAddress: string | null;
  description: string | null;
  status: EventStatus;
  cancelledReason: string | null;
  appliesToAll: boolean;
  published: boolean;
  sequence: number;
  updatedAt: string;
  /** Team slugs this event applies to. Empty when appliesToAll is true. */
  teamSlugs: string[];
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  gradYear: number | null;
  sortOrder: number;
}

export interface CalendarFeed {
  token: string;
  label: string;
  teamId: string | null;
  teamSlug: string | null;
  active: boolean;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  practice: "Practice",
  tournament: "Tournament",
  showcase: "Showcase",
  camp: "Camp",
  meeting: "Meeting",
  training: "Training",
  other: "Event",
};

// ── Supabase ────────────────────────────────────────────────────────────────

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server env is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const EVENT_COLUMNS =
  "id, uid, title, event_type, starts_at, ends_at, all_day, date_confirmed, " +
  "date_note, location_name, location_address, description, status, " +
  "cancelled_reason, applies_to_all, published, sequence, updated_at";

interface EventRow {
  id: string;
  uid: string;
  title: string;
  event_type: EventType;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  date_confirmed: boolean;
  date_note: string | null;
  location_name: string | null;
  location_address: string | null;
  description: string | null;
  status: EventStatus;
  cancelled_reason: string | null;
  applies_to_all: boolean;
  published: boolean;
  sequence: number;
  updated_at: string;
}

function toClubEvent(row: EventRow, teamSlugs: string[]): ClubEvent {
  return {
    id: row.id,
    uid: row.uid,
    title: row.title,
    eventType: row.event_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    dateConfirmed: row.date_confirmed,
    dateNote: row.date_note,
    locationName: row.location_name,
    locationAddress: row.location_address,
    description: row.description,
    status: row.status,
    cancelledReason: row.cancelled_reason,
    appliesToAll: row.applies_to_all,
    published: row.published,
    sequence: row.sequence,
    updatedAt: row.updated_at,
    teamSlugs,
  };
}

/**
 * PostgREST embeds a joined table as an array in the generated types even when
 * the relationship is many-to-one. Normalize to the single row we asked for.
 */
function embedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await admin()
    .from("teams")
    .select("id, slug, name, grad_year, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    gradYear: t.grad_year,
    sortOrder: t.sort_order,
  }));
}

/**
 * Published events, newest-first by start. Unconfirmed-date events sort last —
 * they have no start to sort by.
 *
 * `teamSlug` filters to events that either apply to all teams or explicitly
 * list that team.
 */
export async function getEvents(opts?: {
  teamSlug?: string | null;
  includeUnpublished?: boolean;
}): Promise<ClubEvent[]> {
  const db = admin();

  let query = db.from("events").select(EVENT_COLUMNS);
  if (!opts?.includeUnpublished) query = query.eq("published", true);

  const { data: rows, error } = await query.order("starts_at", {
    ascending: true,
    nullsFirst: false,
  });
  if (error) throw error;

  const eventRows = (rows ?? []) as unknown as EventRow[];
  if (eventRows.length === 0) return [];

  // Team memberships in one round trip.
  const { data: links, error: linkErr } = await db
    .from("event_teams")
    .select("event_id, teams(slug)")
    .in(
      "event_id",
      eventRows.map((r) => r.id),
    );
  if (linkErr) throw linkErr;

  type LinkRow = { event_id: string; teams: { slug: string } | { slug: string }[] | null };
  const byEvent = new Map<string, string[]>();
  for (const link of (links ?? []) as unknown as LinkRow[]) {
    const team = embedded(link.teams);
    if (!team) continue;
    const list = byEvent.get(link.event_id) ?? [];
    list.push(team.slug);
    byEvent.set(link.event_id, list);
  }

  const events = eventRows.map((r) => toClubEvent(r, byEvent.get(r.id) ?? []));

  const slug = opts?.teamSlug;
  if (!slug) return events;
  return events.filter((e) => e.appliesToAll || e.teamSlugs.includes(slug));
}

export async function getFeedByToken(token: string): Promise<CalendarFeed | null> {
  const { data, error } = await admin()
    .from("calendar_feeds")
    .select("token, label, team_id, active, teams(slug)")
    .eq("token", token)
    .eq("active", true)
    .limit(1);
  if (error) throw error;
  type FeedRow = {
    token: string;
    label: string;
    team_id: string | null;
    active: boolean;
    teams: { slug: string } | { slug: string }[] | null;
  };
  const row = (data as unknown as FeedRow[] | null)?.[0];
  if (!row) return null;
  return {
    token: row.token,
    label: row.label,
    teamId: row.team_id,
    teamSlug: embedded(row.teams)?.slug ?? null,
    active: row.active,
  };
}

export async function getFeeds(): Promise<CalendarFeed[]> {
  const { data, error } = await admin()
    .from("calendar_feeds")
    .select("token, label, team_id, active, teams(slug, sort_order)")
    .eq("active", true);
  if (error) throw error;
  type Row = {
    token: string;
    label: string;
    team_id: string | null;
    active: boolean;
    teams: { slug: string; sort_order: number } | { slug: string; sort_order: number }[] | null;
  };
  return ((data ?? []) as unknown as Row[])
    .sort(
      (a, b) =>
        (embedded(a.teams)?.sort_order ?? 0) - (embedded(b.teams)?.sort_order ?? 0),
    )
    .map((r) => ({
      token: r.token,
      label: r.label,
      teamId: r.team_id,
      teamSlug: embedded(r.teams)?.slug ?? null,
      active: r.active,
    }));
}

// ── ICS generation ──────────────────────────────────────────────────────────

/**
 * Escape a value for an ICS TEXT field (RFC 5545 §3.3.11). Backslash first, or
 * we'd escape the escapes we just added.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line to 75 octets (RFC 5545 §3.1). Folding is by OCTET, not by
 * character — a multi-byte character split across a fold boundary corrupts the
 * line, which is how apostrophes and em-dashes break a feed in Outlook.
 */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a UTF-8 continuation byte (10xxxxxx) from its leader.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines carry a leading space
  }

  return parts.join("\r\n ");
}

function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dateStamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, "");
}

function addDay(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.youfirstlacrosse.com";

/**
 * Render events as an ICS document.
 *
 * WHAT IS DELIBERATELY EXCLUDED:
 *   • events with `date_confirmed = false` — a guessed date on a parent's phone
 *     is worse than no date. They show as "Date TBC" on the website instead.
 *   • events with no `starts_at`.
 *
 * WHAT IS DELIBERATELY INCLUDED:
 *   • cancelled events, carrying STATUS:CANCELLED and a bumped SEQUENCE. If we
 *     deleted them instead, they would linger on every phone that already has
 *     them — the client would simply never hear about the removal.
 */
export function buildIcs(events: ClubEvent[], calendarName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//You First Elite Lacrosse//Club Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:America/New_York",
    // Ask clients to re-poll hourly. Without these many clients back off to
    // once a day and a same-week change lands too late to be useful.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    if (!event.startsAt) continue;
    if (!event.dateConfirmed) continue;
    if (!event.uid) continue; // never synthesize a UID — see the header note

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${utcStamp(event.updatedAt)}`);
    lines.push(`SEQUENCE:${event.sequence}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(event.startsAt)}`);
      // DTEND is exclusive for all-day events.
      lines.push(
        `DTEND;VALUE=DATE:${dateStamp(addDay(event.endsAt ?? event.startsAt))}`,
      );
    } else {
      lines.push(`DTSTART:${utcStamp(event.startsAt)}`);
      if (event.endsAt) lines.push(`DTEND:${utcStamp(event.endsAt)}`);
    }

    const prefix = event.status === "cancelled" ? "CANCELLED: " : "";
    lines.push(`SUMMARY:${escapeText(prefix + event.title)}`);

    const where = [event.locationName, event.locationAddress]
      .filter(Boolean)
      .join(", ");
    if (where) lines.push(`LOCATION:${escapeText(where)}`);

    const body = [
      event.description,
      event.status === "cancelled" && event.cancelledReason
        ? `Cancelled: ${event.cancelledReason}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (body) lines.push(`DESCRIPTION:${escapeText(body)}`);

    lines.push(`STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);
    lines.push(`URL:${SITE_URL}/schedule`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line endings and a trailing CRLF.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
