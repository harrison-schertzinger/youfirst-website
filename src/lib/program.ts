// You First Elite Lacrosse — Youth Program Facts
// ────────────────────────────────────────────────
// Every value in this file comes from the master Q&A
// (src/content/master-qa.md — the single source of truth).
// When the program changes, update the Q&A first, then mirror it here.

export const MISSION = {
  headline: "The standard for lacrosse in Cincinnati is low.",
  headlineAccent: "We exist to raise it.",
  body: "You First Elite Lacrosse is built to develop the best girls' lacrosse players in the region, and to make college lacrosse a real, viable path for players here. Our youth program is the front end of that mission: maximize touches, maximize playing and development, and have a lot of fun competing.",
} as const;

export const PROOF_STATS = [
  {
    value: "7 of 8",
    label: "Regional HS All-Americans trained here",
    detail: "Up from 5 of 8 the year before — plus 3 more from out of state.",
  },
  {
    value: "30+",
    label: "College commitments",
    detail: "To 20+ programs across D1, D2, and D3.",
  },
  {
    value: "100%",
    label: "College-player coaches",
    detail: "Every coach is a current or former college player, and our college athletes mentor the girls.",
  },
] as const;

export interface TierPrice {
  group: string;
  classes: string;
  grades: string;
  price: string;
  note: string;
}

export interface Tier {
  id: string;
  name: string;
  kicker: string;
  classes: string;
  grades: string;
  summary: string;
  prices: TierPrice[];
  highlights: string[];
}

export const TIERS: Tier[] = [
  {
    id: "jumpstart",
    name: "Jumpstart",
    kicker: "Where it starts",
    classes: "Classes 2033–2036",
    grades: "Rising 3rd–6th grade",
    summary:
      "We build the fundamentals, maximize touches, play 6v6 on weekends, and keep it local and fun.",
    prices: [
      {
        group: "Youngest teams",
        classes: "2035–2036",
        grades: "rising 3rd–4th",
        price: "$1,000",
        note: "Stay in town — focused on training and weekend 6v6.",
      },
      {
        group: "Older teams",
        classes: "2033–2034",
        grades: "rising 5th–6th",
        price: "$1,200",
        note: "Adds the local and nearby tournament slate.",
      },
    ],
    highlights: [
      "Fundamentals and maximum touches",
      "6v6 on the weekends",
      "Local and fun",
    ],
  },
  {
    id: "launch",
    name: "Launch",
    kicker: "Takeoff",
    classes: "Class 2032",
    grades: "Rising 7th grade",
    summary:
      "Everything the Jumpstart teams do, plus the team's first travel tournament out East.",
    prices: [
      {
        group: "Class 2032",
        classes: "2032",
        grades: "rising 7th",
        price: "$1,250",
        note: "Plus about $300 for the July travel tournament out East (Maryland Cup or Mid-Atlantic) — part of the season.",
      },
    ],
    highlights: [
      "Everything Jumpstart does",
      "First travel tournament out East",
      "One July weekend with our older teams",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    kicker: "The full circuit",
    classes: "Classes 2031 and up",
    grades: "Rising 8th grade and up",
    summary:
      "The full competitive teams playing the national circuit and building toward college.",
    prices: [
      {
        group: "Classes 2031 and up",
        classes: "2031+",
        grades: "rising 8th+",
        price: "Set separately",
        note: "Available on request — email us and we'll walk you through it.",
      },
    ],
    highlights: [
      "National tournament circuit",
      "Building toward college lacrosse",
      "College-player coaching and mentorship",
    ],
  },
];

export const FEES_NOTE =
  "All fees are all-in and include the $200 roster confirmation, which secures the spot and covers the team's jerseys. Payment can be made in full or in installments — dates are set at roster confirmation, so families always know what is due and when." as const;

export const SEASON = {
  months: ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB"],
  offMonths: ["MAR", "APR", "MAY"],
  intro:
    "We offer training options from June through February. The focus is giving players as much opportunity to train and play as possible, all the way from summer into the winter.",
  promise:
    "We publish practice time blocks and treat them as opportunities, not mandates. Nothing is required, and the schedule is built to work around other sports. Typically there is practice every weekend outside of holiday weekends.",
  practices: [
    { label: "Where", value: "All practices are held at the Cincinnati Lacrosse Academy." },
    { label: "How often", value: "Two to three times a week in the summer." },
    { label: "Who coaches", value: "Our college-player coaches — all current or former college athletes." },
  ],
} as const;

export const TOURNAMENTS = {
  intro:
    "The whole point at the youth level is reps. Players should be playing as much as possible.",
  slate: [
    {
      title: "6v6 on the weekends",
      detail:
        "Throughout the summer and fall — a core part of how the youngest teams develop and play.",
      appliesTo: "All stages",
    },
    {
      title: "Summer tournaments",
      detail: "At least three tournaments, all local or nearby.",
      appliesTo: "Jumpstart older teams · Launch",
    },
    {
      title: "Fall tournaments",
      detail: "One to two tournaments, played on weekends, local or nearby.",
      appliesTo: "Jumpstart older teams · Launch",
    },
    {
      title: "July travel weekend out East",
      detail:
        "The Launch (2032) team travels with our older teams to the Maryland Cup or the Mid-Atlantic — their first step toward an elite schedule. About $300 additional.",
      appliesTo: "Launch only",
    },
    {
      title: "The national circuit",
      detail: "The full competitive schedule, building toward college.",
      appliesTo: "Elite",
    },
  ],
  note: "Specific tournament names and dates are announced closer to the season.",
} as const;

export const AFTER_TRYOUTS = {
  date: "Saturday, July 11",
  noCuts:
    "At the youth level we are not looking to cut players. Tryouts are about placing girls on the right team and getting them developing and playing.",
  steps: [
    "Families are notified within 2 to 3 days.",
    "Roster confirmation follows.",
    "Practice opportunities begin in mid-August and run through February.",
  ],
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

// Word-for-fact from the master Q&A "Common Questions" section.
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does it cost, and what is included?",
    answer:
      "Fees are all-in, with the $200 roster confirmation (toward jerseys) already inside the number. The fee covers coaching from our college-player staff, practices at the Cincinnati Lacrosse Academy, weekend 6v6, and the tournament slate for the team's stage. Training options run June through February. You can pay in full or in installments. Jumpstart youngest teams (2035–2036) are $1,000; Jumpstart older teams (2033–2034) are $1,200; Launch (2032) is $1,250 plus about $300 for the July travel tournament; Elite is set separately.",
  },
  {
    question: "Are there cuts?",
    answer:
      "No. At the youth level we are not looking to cut players. Tryouts on July 11 are about placement — getting each girl on the right team and developing and playing.",
  },
  {
    question: "Does my daughter have to train at the Cincinnati Lacrosse Academy?",
    answer:
      "Her team practices are held at the Cincinnati Lacrosse Academy, so that is her home base. The Academy's additional intensive training — the strength and extended skill work our older players do — is not expected at the youth age. That becomes more of an expectation once players get older, around 8th grade, when college goals start to solidify. Right now we want her competing, getting as many reps as she can, and enjoying the game. The training ramps up naturally as they grow into it.",
  },
  {
    question: "Can she play other sports?",
    answer:
      "Yes, and we encourage it. Practice blocks are opportunities, not mandates, and the schedule is built to work around other sports. Send us the conflicts and we get ahead of them.",
  },
  {
    question: "What equipment does she need?",
    answer:
      "For a field player: a girls' lacrosse stick, ASTM-rated goggles, a mouthguard (colored, not clear or white), cleats, and no jewelry at practice or games. Goalies need additional gear, and we will walk you through exactly what to get. Not sure what to buy? Ask us first.",
  },
  {
    question: "Is it too late to start, or is she good enough?",
    answer:
      "It is not too late, and she belongs here. The youth stages are built for players growing into the game — beginners and experienced players alike. Our job is to take her from wherever she is today toward wherever she wants to go.",
  },
  {
    question: "What happens after July 11?",
    answer:
      "Families are notified within 2 to 3 days, roster confirmation follows, and practice opportunities begin in mid-August and run through February.",
  },
  {
    question: "How does my daughter move up?",
    answer:
      "The path is Jumpstart to Launch to Elite. Jumpstart is where she builds her game with maximum touches and local play. Launch (the 2032 team) adds her first travel tournament out East. Elite, from 8th grade up, is the full competitive circuit and the push toward college lacrosse. Every family knows what the next step looks like before they get there.",
  },
];
