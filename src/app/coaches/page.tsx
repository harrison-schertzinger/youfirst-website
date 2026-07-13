import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ScrollReveal from "@/components/home/ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";

export const metadata: Metadata = {
  title: "Coaches | YOU. FIRST Elite Lacrosse",
  description:
    "Every coach here is a college player. This is the certainty behind the culture — exactly who she trains with, every step of the way.",
};

/**
 * Coach photos live in /public/images/coaches/ (optimized through the same
 * sharp pipeline as the slot photos). `pos` tunes the object-position so each
 * face sits right in the card crop. Wave-two trainers + Brett's photo render
 * through PhotoSlot placeholders until their files land in /images/slots/.
 */

// Small, visible marker for the details Harrison still owes — never invent.
function Pending({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F1F3F6] text-[#9CA3AF] text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap">
      {label} · Pending Harrison
    </span>
  );
}

interface HeadCoach {
  name: string;
  role: string;
  bio: string;
  img: string;
  pos: string;
}

const HEAD_COACHES: HeadCoach[] = [
  {
    name: "Ruben Toble",
    role: "Head Coach · 2028 (oldest team)",
    bio: "Everybody's favorite coach.",
    img: "/images/coaches/ruben.jpg",
    pos: "object-[55%_40%]",
  },
  {
    name: "Harrison Schertzinger",
    role: "Head Coach · 2029",
    bio: "Played at North Carolina. Director of You. First Elite.",
    img: "/images/coaches/Harrison.JPG",
    pos: "object-[center_28%]",
  },
  {
    name: "Henry Schertzinger",
    role: "Head Coach · 2030",
    bio: "Played at North Carolina. Head of the Cincinnati Lacrosse Academy.",
    img: "/images/coaches/henry.jpg",
    pos: "object-[center_30%]",
  },
];

interface DevCoach {
  name: string;
  school: string;
  position: string;
  team: string;
  teamNote?: string;
  img: string;
  pos: string;
}

const DEV_COACHES: DevCoach[] = [
  {
    name: "Ryley Heilmann",
    school: "Stetson",
    position: "Attack",
    team: "Team 2031",
    img: "/images/coaches/Ryley.JPEG",
    pos: "object-[center_22%]",
  },
  {
    name: "Jane Muller",
    school: "Mercyhurst",
    position: "Defense",
    team: "Team 2031",
    img: "/images/coaches/Jane.jpg",
    pos: "object-[center_20%]",
  },
  {
    name: "Ashley Filburn",
    school: "Kent State",
    position: "Midfielder",
    team: "Team 2032",
    img: "/images/coaches/Ashley.jpg",
    pos: "object-[center_18%]",
  },
  {
    name: "Marin Bode",
    school: "High Point",
    position: "Midfield",
    team: "Teams 2033 & 2034",
    teamNote: "Youngest team, with 2034 play-ups",
    img: "/images/coaches/Marin.JPEG",
    pos: "object-[center_22%]",
  },
];

interface SkillCoach {
  name: string;
  school: string;
  position: string;
  img: string;
  pos: string;
}

const SKILL_COACHES: SkillCoach[] = [
  {
    name: "Reilyn Brennan",
    school: "Stetson",
    position: "Midfielder",
    img: "/images/coaches/reilyn.jpg",
    pos: "object-[center_22%]",
  },
  {
    name: "Lily Kaplan",
    school: "Elon",
    position: "Attack",
    img: "/images/coaches/lily.jpg",
    pos: "object-[center_28%]",
  },
  {
    name: "Sophie Haugh",
    school: "Stetson",
    position: "Defense",
    img: "/images/coaches/sophie.jpg",
    pos: "object-[center_24%]",
  },
  {
    name: "Piper Farrell",
    school: "Jacksonville",
    position: "Midfielder",
    img: "/images/coaches/piper.jpg",
    pos: "object-[60%_22%]",
  },
];

/** The Carolina veil PhotoSlot puts over filled photos — same treatment here. */
function CoachPhoto({
  src,
  alt,
  pos,
  sizes,
}: {
  src: string;
  alt: string;
  pos: string;
  sizes: string;
}) {
  return (
    <>
      <Image src={src} alt={alt} fill className={`object-cover ${pos}`} sizes={sizes} />
      <div
        className="absolute inset-0 bg-gradient-to-tr from-[#4B9CD3]/[0.16] via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </>
  );
}

export default function CoachesPage() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main className="bw-site">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="pt-32 sm:pt-40 pb-14 sm:pb-16 bg-background">
          <div className="mx-auto max-w-[880px] px-6 lg:px-8 text-center">
            <ScrollReveal>
              <p className="section-label mb-5">The Coaches</p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.0] mb-6 tracking-tight text-[#1A1A1A]">
                Meet Her <span className="gradient-text-accent">Coaches.</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p className="text-lg text-[#6B7280] leading-[1.75] max-w-2xl mx-auto">
                Every coach here is a college player. This is the certainty
                behind the culture — exactly who she trains with, every step of
                the way.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Tier 1 · Head coaches ────────────────────────────────────── */}
        <section className="pb-20 sm:pb-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                <p className="section-label mb-5">The Staff</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                  Head <span className="gradient-text-accent">Coaches.</span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {HEAD_COACHES.map((coach, i) => (
                <ScrollReveal key={coach.name} delay={i * 120} className="h-full">
                  <div className="card h-full flex flex-col overflow-hidden">
                    <div className="relative h-72 sm:h-80 keep-color">
                      <CoachPhoto
                        src={coach.img}
                        alt={`${coach.name} — ${coach.role}`}
                        pos={coach.pos}
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-7 sm:p-8">
                      <h3 className="text-xl font-bold tracking-[-0.01em]">
                        <span className="gradient-text-accent">{coach.name}</span>
                      </h3>
                      <p className="mt-2 text-sm font-medium text-[#6B7280]">{coach.role}</p>
                      <p className="mt-3 text-[15px] text-[#6B7280] leading-[1.7]">{coach.bio}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal>
              <p className="mt-9 text-center text-[15px] sm:text-base font-medium text-[#1A1A1A]">
                Harrison &amp; Henry coach and train every team.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Tier 2 · Development coaches ─────────────────────────────── */}
        <section className="py-20 sm:py-24 bg-surface">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                <p className="section-label mb-5">Development Coaches</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                  Our College <span className="gradient-text-accent">Players.</span>
                </h2>
                <p className="mt-5 text-lg text-[#6B7280] leading-[1.75]">
                  All High School All-Americans — the All-Americans we&apos;ve
                  trained now coach here.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {DEV_COACHES.map((coach, i) => (
                <ScrollReveal key={coach.name} delay={i * 100} className="h-full">
                  <div className="card h-full flex flex-col overflow-hidden">
                    <div className="relative h-64 sm:h-72 keep-color">
                      <CoachPhoto
                        src={coach.img}
                        alt={`${coach.name} — ${coach.school} ${coach.position}, ${coach.team}`}
                        pos={coach.pos}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-6 sm:p-7 flex flex-col flex-1">
                      <h3 className="text-xl font-bold tracking-[-0.01em]">
                        <span className="gradient-text-accent">{coach.name}</span>
                      </h3>
                      <p className="mt-3 text-sm font-medium text-[#1A1A1A]">
                        {coach.school} · {coach.position}
                      </p>
                      <span className="mt-3 inline-flex items-center self-start px-3 py-1.5 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold uppercase tracking-[0.15em]">
                        High School All-American
                      </span>
                      <p className="mt-3 text-sm font-medium text-[#6B7280]">{coach.team}</p>
                      {coach.teamNote && (
                        <p className="mt-1 text-[13px] text-[#9CA3AF] leading-[1.6]">
                          {coach.teamNote}
                        </p>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tier 3 · Skill & small-group trainers (wave two) ─────────── */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                <p className="section-label mb-5">Skill &amp; Small-Group Trainers</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                  For Players Who Want <span className="gradient-text-accent">More.</span>
                </h2>
                <p className="mt-5 text-lg text-[#6B7280] leading-[1.75]">
                  Small-group skill sessions run two evenings a week on
                  off-practice days — tons of extra opportunity to work.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {SKILL_COACHES.map((coach, i) => (
                <ScrollReveal key={coach.name} delay={i * 100} className="h-full">
                  <div className="card h-full flex flex-col overflow-hidden">
                    <div className="relative h-64 sm:h-72 keep-color">
                      <CoachPhoto
                        src={coach.img}
                        alt={`${coach.name} — ${coach.school} ${coach.position}`}
                        pos={coach.pos}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-6 sm:p-7">
                      <h3 className="text-xl font-bold tracking-[-0.01em]">
                        <span className="gradient-text-accent">{coach.name}</span>
                      </h3>
                      <p className="mt-3 text-sm font-medium text-[#1A1A1A]">
                        {coach.school} · {coach.position}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tier 4 · Strength & performance ──────────────────────────── */}
        <section className="py-20 sm:py-24 bg-surface">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                <p className="section-label mb-5">Strength &amp; Performance</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                  The Extra <span className="gradient-text-accent">Work.</span>
                </h2>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <div className="card max-w-md mx-auto overflow-hidden">
                <div className="relative h-72 sm:h-80 keep-color">
                  <PhotoSlot
                    name="coach-brett.jpg"
                    alt="Brett Finnie — Strength Trainer"
                    sizes="(max-width: 640px) 100vw, 448px"
                    positionClassName="object-[center_26%]"
                  />
                </div>
                <div className="p-7 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.01em]">
                    <span className="gradient-text-accent">Brett Finnie</span>
                  </h3>
                  <p className="mt-3 text-sm font-medium text-[#1A1A1A]">Strength Trainer</p>
                  <p className="mt-2 text-[15px] text-[#6B7280] leading-[1.75]">
                    Strength, conditioning, and any extra work the players need.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Closing ──────────────────────────────────────────────────── */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[760px] px-6 text-center">
            <ScrollReveal>
              <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
                What We Mean by <span className="gradient-text-accent">Certainty.</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <p className="mt-6 text-lg text-[#6B7280] leading-[1.75]">
                Real coaches, real college players, built around her
                development.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="mt-10">
                <Link
                  href="/levels"
                  className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300"
                >
                  See the Teams
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
