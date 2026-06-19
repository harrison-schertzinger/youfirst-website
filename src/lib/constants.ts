// You. First Elite Lacrosse — Brand Constants

export const SITE_CONFIG = {
  name: "You. First Elite Lacrosse",
  tagline: "Build & Bring the Best Together",
  location: "Cincinnati, Ohio",
  email: "kathleen@youfirstlacrosse.com",
  parent: "Cincinnati Lacrosse Academy",
} as const;

export const NAV_LINKS = [
  { label: "Tryouts", href: "/tryouts" },
  { label: "Schedule", href: "/schedule" },
  { label: "Player Portal", href: "/fees" },
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

// Logo files with school names for alt text
export const COLLEGE_LOGOS = [
  { src: "/images/logos/1.png", name: "You. First Elite Lacrosse" },
  { src: "/images/logos/2.png", name: "Walsh University" },
  { src: "/images/logos/3.png", name: "University of Cincinnati" },
  { src: "/images/logos/4.png", name: "Temple University" },
  { src: "/images/logos/5.png", name: "Stetson University" },
  { src: "/images/logos/6.png", name: "Longwood University" },
  { src: "/images/logos/7.png", name: "Lindenwood University" },
  { src: "/images/logos/8.png", name: "Jacksonville University" },
  { src: "/images/logos/9.png", name: "Winthrop University" },
  { src: "/images/logos/10.png", name: "Shippensburg University" },
  { src: "/images/logos/11.png", name: "Malone University" },
  { src: "/images/logos/12.png", name: "Otterbein College" },
  { src: "/images/logos/13.png", name: "University of Indianapolis" },
  { src: "/images/logos/14.png", name: "Akron University" },
  { src: "/images/logos/15.png", name: "High Point University" },
  { src: "/images/logos/16.png", name: "Flagler College" },
  { src: "/images/logos/17.png", name: "Eastern Michigan University" },
  { src: "/images/logos/18.png", name: "Barton College" },
  { src: "/images/logos/19.png", name: "Elon University" },
  { src: "/images/logos/20.png", name: "Kent State University" },
] as const;
