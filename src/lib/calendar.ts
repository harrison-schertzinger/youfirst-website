// Schedule data layer — swap getEvents() internals for Google Calendar API
// without changing any component code.

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

const PLACEHOLDER_EVENTS: ScheduleEvent[] = [
  // ── JUNE PRACTICES (Tue/Thu) ──
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
    teams: [2027, 2028, 2029, 2030, 2031],
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
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // Camp week
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
    description: "Four-day intensive skills camp. All positions, all levels. Bring lunch, water, and your best attitude.",
    teams: [2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0616",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-06-16",
    endDate: "2026-06-16",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — transition game and clearing.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0618",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-06-18",
    endDate: "2026-06-18",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Tournament prep — set plays and game situations.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // June tournament
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
    description: "Two-day regional tournament. Pool play Saturday, bracket Sunday. Arrive 60 min before first game.",
    teams: [2027, 2028, 2029],
    isAllDay: false,
  },
  {
    id: "prac-0623",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-06-23",
    endDate: "2026-06-23",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Recovery practice — film review and light stick work.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0625",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-06-25",
    endDate: "2026-06-25",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — defensive slides and ground balls.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // Showcase
  {
    id: "showcase-june",
    title: "Elite 100 Showcase",
    eventType: "showcase",
    startDate: "2026-06-28",
    endDate: "2026-06-28",
    startTime: "10:00",
    endTime: "16:00",
    location: "Obetz Sports Complex",
    address: "4390 Lancaster Rd, Obetz, OH",
    description: "Invite-only showcase with 50+ college coaches in attendance. Wear white uniforms.",
    teams: [2027, 2028],
    isAllDay: false,
  },

  // ── JULY ──
  {
    id: "prac-0707",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-07-07",
    endDate: "2026-07-07",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — man-up and man-down situations.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0709",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-07-09",
    endDate: "2026-07-09",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Pre-tournament practice — high tempo scrimmage.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // July tournament
  {
    id: "tourn-july",
    title: "Queen City Classic",
    eventType: "tournament",
    startDate: "2026-07-11",
    endDate: "2026-07-12",
    startTime: "08:00",
    endTime: "17:00",
    location: "Spooky Nook Sports Champion Mill",
    address: "101 E High St, Hamilton, OH",
    description: "Premier summer tournament. College coaches will be scouting. Pool play both days, championship bracket Sunday afternoon.",
    teams: [2027, 2028, 2029, 2030],
    isAllDay: false,
  },
  {
    id: "prac-0714",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-07-14",
    endDate: "2026-07-14",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Post-tournament review and position-specific work.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0716",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-07-16",
    endDate: "2026-07-16",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — fast breaks and ride packages.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // Parent meeting
  {
    id: "meeting-july",
    title: "Parent Info Night",
    eventType: "meeting",
    startDate: "2026-07-20",
    endDate: "2026-07-20",
    startTime: "18:30",
    endTime: "20:00",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Fall season preview, recruiting timeline updates, and Q&A with coaching staff. All families encouraged to attend.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0721",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-07-21",
    endDate: "2026-07-21",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — draw controls and ride/clear.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0723",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-07-23",
    endDate: "2026-07-23",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Showcase prep — individual skills and highlight reel situations.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // Showcase
  {
    id: "showcase-july",
    title: "Under Armour Highlight",
    eventType: "showcase",
    startDate: "2026-07-25",
    endDate: "2026-07-26",
    startTime: "09:00",
    endTime: "17:00",
    location: "SPIRE Institute",
    address: "5201 SPIRE Cir, Geneva, OH",
    description: "National-level recruiting showcase. Two days of games in front of D1, D2, and D3 coaches. Blue uniforms.",
    teams: [2027, 2028, 2029],
    isAllDay: false,
  },

  // ── AUGUST ──
  {
    id: "prac-0804",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-08-04",
    endDate: "2026-08-04",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Full team practice — zone defense and settled offense.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0806",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-08-06",
    endDate: "2026-08-06",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "End-of-summer tournament prep. Full scrimmage format.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  // August tournament
  {
    id: "tourn-aug",
    title: "Buckeye Cup",
    eventType: "tournament",
    startDate: "2026-08-08",
    endDate: "2026-08-09",
    startTime: "08:00",
    endTime: "17:00",
    location: "Darby Creek Metro Park",
    address: "1775 Darby Creek Dr, Galloway, OH",
    description: "Season-ending tournament. All teams competing. Family tailgate Sunday morning.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
  {
    id: "prac-0811",
    title: "Team Practice",
    eventType: "practice",
    startDate: "2026-08-11",
    endDate: "2026-08-11",
    startTime: "17:30",
    endTime: "19:30",
    location: "The Barn",
    address: "5554 Mount Zion Road, Milford, OH",
    description: "Final summer practice. Awards, recognition, and fall preview.",
    teams: [2027, 2028, 2029, 2030, 2031],
    isAllDay: false,
  },
];

/**
 * Fetch schedule events. Currently returns hardcoded data.
 * Replace internals with Google Calendar API call — the return type stays the same.
 */
export async function getEvents(): Promise<ScheduleEvent[]> {
  // TODO: Replace with Google Calendar API fetch
  // const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${API_KEY}`);
  // return transformGoogleEvents(await res.json());
  return PLACEHOLDER_EVENTS;
}
