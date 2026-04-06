// You. First Elite Lacrosse — Brand Constants

export const SITE_CONFIG = {
  name: "You. First Elite Lacrosse",
  tagline: "Build & Bring the Best Together",
  location: "Cincinnati, Ohio",
  email: "kathleen@youfirstelitelacrosseclub.com",
  parent: "Cincinnati Lacrosse Academy",
} as const;

export const NAV_LINKS = [
  { label: "Schedule", href: "/schedule" },
  { label: "Team Fees", href: "/fees" },
  { label: "Register", href: "/register" },
  { label: "Recruiting", href: "/recruiting" },
  { label: "About", href: "/about" },
] as const;

export const COLLEGE_COMMITMENTS = [
  { name: "University of Cincinnati", abbr: "UC", count: 1 },
  { name: "Temple University", abbr: "TEMPLE", count: 1 },
  { name: "Jacksonville University", abbr: "JU", count: 1 },
  { name: "High Point University", abbr: "HPU", count: 1 },
  { name: "Elon University", abbr: "ELON", count: 1 },
  { name: "Eastern Michigan University", abbr: "EMU", count: 1 },
  { name: "Lindenwood University", abbr: "LINDENWOOD", count: 1 },
  { name: "Kent State University", abbr: "KENT ST", count: 2 },
  { name: "Stetson University", abbr: "STETSON", count: 7 },
  { name: "Akron University", abbr: "AKRON", count: 2 },
  { name: "Winthrop University", abbr: "WINTHROP", count: 1 },
  { name: "Walsh University", abbr: "WALSH", count: 1 },
  { name: "University of Indianapolis", abbr: "UINDY", count: 1 },
  { name: "Mercyhurst University", abbr: "MERCYHURST", count: 1 },
  { name: "Longwood University", abbr: "LONGWOOD", count: 1 },
  { name: "Barton College", abbr: "BARTON", count: 2 },
  { name: "Flagler University", abbr: "FLAGLER", count: 1 },
  { name: "Otterbein College", abbr: "OTTERBEIN", count: 1 },
  { name: "Malone University", abbr: "MALONE", count: 1 },
  { name: "Shippensburg University", abbr: "SHIPPENSBURG", count: 1 },
] as const;

// Logo files: 1.png through 20.png in public/images/logos/
export const COLLEGE_LOGO_FILES = Array.from({ length: 20 }, (_, i) => `/images/logos/${i + 1}.png`);
