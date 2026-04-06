// Schedule data layer — Google Calendar API integration.
// Components import getEvents() and the ScheduleEvent type.
// Nothing downstream changes when the data source changes.

export type EventType = "tournament" | "practice" | "camp" | "showcase" | "meeting";

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
}

export const EVENT_COLORS: Record<EventType, string> = {
  tournament: "#4A90D9",
  practice: "#34D399",
  camp: "#9B59B6",
  showcase: "#E8453C",
  meeting: "#6B6B6B",
};

export const EVENT_LABELS: Record<EventType, string> = {
  tournament: "Tournament",
  practice: "Practice",
  camp: "Camp",
  showcase: "Showcase",
  meeting: "Meeting",
};

// ── Google Calendar API types ──

interface GCalDateTime {
  dateTime?: string; // ISO 8601 for timed events
  date?: string;     // YYYY-MM-DD for all-day events
  timeZone?: string;
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: GCalDateTime;
  end: GCalDateTime;
  location?: string;
  description?: string;
}

interface GCalResponse {
  items?: GCalEvent[];
}

// ── Parsing helpers ──

const EVENT_TYPE_KEYWORDS: { type: EventType; patterns: RegExp }[] = [
  { type: "tournament", patterns: /tournament|tourney/i },
  { type: "camp",       patterns: /camp/i },
  { type: "showcase",   patterns: /showcase/i },
  { type: "meeting",    patterns: /meeting|parent|info\s*night/i },
  // practice is the default fallback — no entry needed
];

function parseEventType(title: string, description: string): EventType {
  const text = `${title} ${description}`;
  for (const { type, patterns } of EVENT_TYPE_KEYWORDS) {
    if (patterns.test(text)) return type;
  }
  return "practice";
}

const GRAD_YEAR_PATTERN = /\b(202[5-9]|203[0-5])\b/g;
const ALL_TEAMS = [2027, 2028, 2029, 2030];

function parseTeams(description: string): number[] {
  const matches = description.match(GRAD_YEAR_PATTERN);
  if (!matches) return ALL_TEAMS;
  const years = [...new Set(matches.map(Number))].filter(
    (y) => y >= 2025 && y <= 2035
  );
  return years.length > 0 ? years.sort() : ALL_TEAMS;
}

function parseLocation(raw: string): { location: string; address: string } {
  if (!raw) return { location: "", address: "" };
  // Google Calendar often stores "Venue Name, Full Address"
  const commaIdx = raw.indexOf(",");
  if (commaIdx === -1) return { location: raw.trim(), address: "" };
  return {
    location: raw.slice(0, commaIdx).trim(),
    address: raw.slice(commaIdx + 1).trim(),
  };
}

function transformEvent(gcal: GCalEvent): ScheduleEvent {
  const title = gcal.summary || "Event";
  const description = gcal.description || "";
  const isAllDay = !!gcal.start.date;

  let startDate: string;
  let endDate: string;
  let startTime: string;
  let endTime: string;

  if (isAllDay) {
    // All-day: start.date is inclusive, end.date is EXCLUSIVE in Google API
    startDate = gcal.start.date!;
    // Subtract 1 day from end to make it inclusive
    const endExclusive = new Date(gcal.end.date! + "T00:00:00");
    endExclusive.setDate(endExclusive.getDate() - 1);
    endDate = endExclusive.toISOString().split("T")[0];
    startTime = "00:00";
    endTime = "23:59";
  } else {
    // Timed event: parse directly from ISO string to preserve local timezone
    // e.g. "2026-06-02T17:30:00-04:00" → date "2026-06-02", time "17:30"
    const [sDate, sRest] = gcal.start.dateTime!.split("T");
    const [eDate, eRest] = gcal.end.dateTime!.split("T");
    startDate = sDate;
    endDate = eDate;
    startTime = sRest.slice(0, 5);
    endTime = eRest.slice(0, 5);
  }

  const { location, address } = parseLocation(gcal.location || "");

  return {
    id: gcal.id,
    title,
    eventType: parseEventType(title, description),
    startDate,
    endDate,
    startTime,
    endTime,
    location,
    address,
    description: description.replace(/<[^>]*>/g, "").trim(), // strip HTML tags
    teams: parseTeams(description),
    isAllDay,
  };
}

// ── Fetch ──

/**
 * Fetch schedule events from Google Calendar API.
 * Falls back to placeholder data if the API call fails.
 * Uses Next.js ISR — revalidates every 5 minutes.
 */
export async function getEvents(): Promise<ScheduleEvent[]> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!apiKey || !calendarId) {
    console.warn("[calendar] Missing GOOGLE_CALENDAR_API_KEY or GOOGLE_CALENDAR_ID — using placeholder data");
    return PLACEHOLDER_EVENTS;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      timeMin: "2025-01-01T00:00:00Z",
      timeMax: "2027-12-31T23:59:59Z",
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      console.error(`[calendar] Google Calendar API error: ${res.status} ${res.statusText}`);
      return PLACEHOLDER_EVENTS;
    }

    const data: GCalResponse = await res.json();

    if (!data.items || data.items.length === 0) {
      console.warn("[calendar] Google Calendar returned no events — using placeholder data");
      return PLACEHOLDER_EVENTS;
    }

    return data.items.map(transformEvent);
  } catch (err) {
    console.error("[calendar] Failed to fetch from Google Calendar:", err);
    return PLACEHOLDER_EVENTS;
  }
}

// ── Placeholder fallback data ──

const PLACEHOLDER_EVENTS: ScheduleEvent[] = [
  {
    id: "prac-0603",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-06-02",
    endDate: "2026-06-02",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — stick work, team defense, and conditioning.",
    teams: [2027, 2028, 2029, 2030],
    isAllDay: false,
  },
  {
    id: "prac-0604",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-06-04",
    endDate: "2026-06-04",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — offensive sets and shooting.",
    teams: [2027, 2028, 2029, 2030],
    isAllDay: false,
  },
  {
    id: "camp-june",
    title: "Summer Skills Camp",
    eventType: "camp",
    startDate: "2026-06-08",
    endDate: "2026-06-11",
    startTime: "09:00",
    endTime: "15:00",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Four-day intensive skills camp.",
    teams: [2028, 2029, 2030],
    isAllDay: false,
  },
  {
    id: "tourn-june",
    title: "Midwest Showdown",
    eventType: "tournament",
    startDate: "2026-06-20",
    endDate: "2026-06-21",
    startTime: "08:00",
    endTime: "18:00",
    location: "Voice of America MetroPark",
    address: "7850 VOA Park Dr, West Chester, OH",
    description: "Two-day regional tournament.",
    teams: [2027, 2028, 2029],
    isAllDay: false,
  },
];
