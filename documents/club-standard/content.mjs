/**
 * THE CLUB STANDARD — content.
 *
 * Two variants sharing most pages. A section body is either `shared` (both
 * documents get it) or keyed by variant.
 *
 * MARKER: `[[ ... ]]` is copy Harrison has not written. The build stamps a
 * DRAFT rule across every page while any block survives, so a draft can never
 * be mistaken for the finished document — including if one gets attached to a
 * receipt by accident.
 *
 * NAMING LAW (from the roster standard): the rosters are Elite, Blue, the Elite
 * Youth Program and the Elite Training Group. "Development" never labels a
 * person.
 */

export const CLUB = {
  name: "YOU. FIRST Elite Lacrosse",
  region: "Southern Ohio",
  location: "Cincinnati, Ohio",
  season: "2026–27",
  email: "kathleen@youfirstlacrosse.com",
  site: "youfirstlacrosse.com",
};

export const VARIANTS = {
  tournament: {
    key: "tournament",
    title: "Tournament Rosters",
    subtitle: "Elite · Blue",
    file: "club-standard-tournament.pdf",
  },
  elite_youth: {
    key: "elite_youth",
    title: "Elite Youth Program",
    subtitle: "The youngest classes",
    file: "club-standard-elite-youth.pdf",
  },
};

/** The four pillars. Leads are the club's, bodies are Harrison's to write. */
const PILLARS = [
  {
    lead: "Own development in this area.",
    body: "[[ WHAT THE CLUB COMMITS TO — two or three sentences. ]]",
  },
  {
    lead: "Build the best players.",
    body: "[[ WHAT THE CLUB COMMITS TO — two or three sentences. ]]",
  },
  {
    lead: "Take our teams to the best tournaments.",
    body: "[[ WHAT THE CLUB COMMITS TO — two or three sentences. ]]",
  },
  {
    lead: "Play at the highest level.",
    body: "[[ WHAT THE CLUB COMMITS TO — two or three sentences. ]]",
  },
];

export const SECTIONS = [
  {
    n: 1,
    title: "Who we are",
    shared: [
      { type: "lede", text: `The premier girls lacrosse club of ${CLUB.region}.` },
      { type: "p", text: "[[ WHO WE ARE — the club in three or four paragraphs. Where it came from, what it is now, and why it exists. This is the first page a parent reads. ]]" },
      { type: "h", text: "What we are building" },
      { type: "pillars", items: PILLARS },
    ],
  },
  {
    n: 2,
    title: "Structure",
    tournament: [
      { type: "lede", text: "Every class carries two tournament rosters." },
      { type: "p", text: "[[ HOW THE TWO ROSTERS RELATE — what Elite is, what Blue is, and the honest answer to why an athlete is on one and not the other. ]]" },
      {
        type: "table",
        head: ["Roster", "Who it is for", "What she plays"],
        rows: [
          ["Elite", "[[ WHO ]]", "[[ WHAT SHE PLAYS ]]"],
          ["Blue", "[[ WHO ]]", "[[ WHAT SHE PLAYS ]]"],
          ["Elite Training Group", "[[ WHO ]]", "[[ WHAT SHE PLAYS ]]"],
        ],
      },
      { type: "h", text: "How athletes move" },
      { type: "p", text: "[[ MOVEMENT BETWEEN ROSTERS — when it is looked at, who decides, and what a family should expect to be told. Movement is not a punishment and should not read like one. ]]" },
    ],
    elite_youth: [
      { type: "lede", text: "One program for the youngest classes." },
      { type: "p", text: "[[ WHAT THE ELITE YOUTH PROGRAM IS — how it is organised, how many athletes, and how it differs from the tournament rosters. ]]" },
      { type: "h", text: "The path forward" },
      { type: "p", text: "[[ HOW AN ATHLETE MOVES FROM THE ELITE YOUTH PROGRAM ONTO A TOURNAMENT ROSTER — what is looked at and when. ]]" },
    ],
  },
  {
    n: 3,
    title: `The ${CLUB.season} standard`,
    shared: [
      { type: "lede", text: "Every team is on the platform. Everything that matters is measured." },
      { type: "p", text: "[[ THE PLATFORM — what it is, what it does, and what a family sees. ]]" },
      { type: "h", text: "What gets measured" },
      { type: "list", items: [
        "[[ MEASURE ONE ]]",
        "[[ MEASURE TWO ]]",
        "[[ MEASURE THREE ]]",
        "[[ MEASURE FOUR ]]",
      ] },
      { type: "note", text: "[[ WHAT WE DO WITH IT — how the staff uses what is measured, and what an athlete gets back. ]]" },
    ],
  },
  {
    n: 4,
    title: "Offseason expectations",
    shared: [
      { type: "lede", text: "Consistency on skill work is the whole thing." },
      { type: "p", text: "[[ WHAT IS EXPECTED OF AN ATHLETE BETWEEN SEASONS — stated plainly, as a number and a cadence, not as a mood. ]]" },
      { type: "h", text: "What that looks like in a week" },
      { type: "list", items: [
        "[[ EXPECTATION ONE ]]",
        "[[ EXPECTATION TWO ]]",
        "[[ EXPECTATION THREE ]]",
      ] },
      { type: "p", text: "[[ WHAT HAPPENS IF SHE DOES THE WORK, AND WHAT HAPPENS IF SHE DOES NOT. ]]" },
    ],
  },
  {
    n: 5,
    title: "Summer training and resources",
    shared: [
      { type: "p", text: "[[ SUMMER TRAINING — where, when, how often, who runs it, and what it costs if anything. ]]" },
      { type: "h", text: "What is new this year" },
      { type: "list", items: [
        "[[ RESOURCE ONE ]]",
        "[[ RESOURCE TWO ]]",
        "[[ RESOURCE THREE ]]",
      ] },
    ],
  },
  {
    n: 6,
    title: "Coaching staff",
    shared: [
      { type: "p", text: `[[ THE ${CLUB.season} STAFF — one short block per coach: name, role, and what they have done. Families decide on coaches; give them enough to decide. ]]` },
      {
        type: "table",
        head: ["Coach", "Role", "Background"],
        rows: [
          ["[[ NAME ]]", "[[ ROLE ]]", "[[ BACKGROUND ]]"],
          ["[[ NAME ]]", "[[ ROLE ]]", "[[ BACKGROUND ]]"],
          ["[[ NAME ]]", "[[ ROLE ]]", "[[ BACKGROUND ]]"],
        ],
      },
    ],
  },
  {
    n: 7,
    title: "Tournament and season calendar",
    tournament: [
      { type: "p", text: "[[ THE SEASON, MONTH BY MONTH — what a family should put on the fridge. ]]" },
      {
        type: "table",
        head: ["When", "What", "Where"],
        rows: [
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
        ],
      },
      { type: "note", text: "[[ TRAVEL — which events involve travel, and roughly what a family should budget. ]]" },
    ],
    elite_youth: [
      { type: "p", text: "[[ THE ELITE YOUTH YEAR — training blocks, any play dates, and what a family should put on the fridge. ]]" },
      {
        type: "table",
        head: ["When", "What", "Where"],
        rows: [
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
          ["[[ MONTH ]]", "[[ EVENT ]]", "[[ WHERE ]]"],
        ],
      },
    ],
  },
  {
    n: 8,
    title: "Contacts",
    shared: [
      { type: "p", text: "Anything about registration, fees, uniforms or scheduling reaches a real person at the address below — replies to any club email land in the same place." },
      {
        type: "table",
        head: ["For", "Who", "Where"],
        rows: [
          ["Registration, fees, uniforms", "[[ NAME ]]", CLUB.email],
          ["Placement, film, evaluation", "[[ NAME ]]", "[[ EMAIL ]]"],
          ["Everything else", "The club", `${CLUB.site}`],
        ],
      },
    ],
  },
];

export function blocksFor(section, variant) {
  return section.shared ?? section[variant] ?? [];
}
