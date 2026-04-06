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

export const COLLEGE_LOGOS = [
  "UNC", "OHIO ST", "DUKE", "MICHIGAN", "NOTRE DAME", "STANFORD",
  "VIRGINIA", "MARYLAND", "PENN ST", "SYRACUSE", "BC", "FLORIDA",
] as const;
