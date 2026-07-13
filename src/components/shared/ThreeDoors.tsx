import Link from "next/link";
import ScrollReveal from "@/components/home/ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";

// ── The three doors in — ONE shared block used on /get-started and /tryouts.
// Edit copy here once and both pages update together.

// Harrison's placement/film line — sms: opens a text on phones.
const HARRISON_PHONE_DISPLAY = "(513) 575-6174";
const HARRISON_SMS = "sms:+15135756174";

const BTN_PRIMARY =
  "inline-flex items-center justify-center px-7 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300";

function TryoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="7" y="10" width="34" height="31" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M7 20h34" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 30l5 5 9-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilmIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="12" width="26" height="24" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M32 20l10-6v20l-10-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="21" r="2.5" fill="currentColor" />
    </svg>
  );
}

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 40C14 32.5 7.5 26.5 7.5 19.4 7.5 14 11.7 10 16.8 10c2.9 0 5.6 1.4 7.2 3.7C25.6 11.4 28.3 10 31.2 10c5.1 0 9.3 4 9.3 9.4 0 7.1-6.5 13.1-16.5 20.6z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ThreeDoorsProps {
  /** Set false on /tryouts, where the tryout door is the whole page. */
  includeTryoutTile?: boolean;
}

export default function ThreeDoors({ includeTryoutTile = true }: ThreeDoorsProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-6 items-stretch ${
        includeTryoutTile ? "lg:grid-cols-3" : "lg:grid-cols-2 max-w-4xl mx-auto"
      }`}
    >
      {includeTryoutTile && (
        <ScrollReveal className="h-full">
          <div className="card h-full flex flex-col overflow-hidden">
            <div className="relative h-48 sm:h-52">
              <PhotoSlot
                name="getstarted-tryouts.jpg"
                alt="You First players competing at tryouts"
                sizes="(max-width: 1024px) 100vw, 33vw"
                positionClassName="object-[center_15%]"
              />
            </div>
            <div className="p-7 sm:p-8 flex flex-col flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-[-0.01em]">
                  <span className="gradient-text-accent">Come Try Out</span>
                </h2>
                <TryoutIcon className="w-9 h-9 text-accent-blue flex-shrink-0" />
              </div>
              <p className="mt-4 text-[15px] text-[#6B7280] leading-[1.7]">
                Our main tryouts are in the summer, but here is what most clubs
                will not tell you: we add players through the fall and the
                spring too. Missing a summer date does not mean missing your
                chance.
              </p>
              <p className="mt-3 text-[15px] font-semibold text-[#1A1A1A] leading-[1.65] flex-1">
                Tryouts are completely free. Elite (2027–2030): Saturday, July
                25. Youth &amp; development: free evaluations any morning
                through August 7. All at the Cincinnati Lacrosse Academy.
              </p>
              <Link href="/tryouts" className={`${BTN_PRIMARY} mt-6 self-start`}>
                Register for Tryouts
              </Link>
            </div>
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delay={includeTryoutTile ? 120 : 0} className="h-full">
        <div className="card h-full flex flex-col overflow-hidden">
          <div className="relative h-48 sm:h-52">
            <PhotoSlot
              name="getstarted-film.jpg"
              alt="Game film of a You First player"
              sizes="(max-width: 1024px) 100vw, 33vw"
              positionClassName="object-[center_15%]"
            />
          </div>
          <div className="p-7 sm:p-8 flex flex-col flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-[-0.01em]">
                <span className="gradient-text-accent">Missed Tryouts? Send Film</span>
              </h2>
              <FilmIcon className="w-9 h-9 text-accent-blue flex-shrink-0" />
            </div>
            <p className="mt-4 text-[15px] text-[#6B7280] leading-[1.7]">
              We always have room for a great player. If you have missed
              tryouts and want a spot on the team, send your film straight to
              Harrison and we will take it from there.
            </p>
            <p className="mt-3 text-[15px] font-semibold text-[#1A1A1A] leading-[1.65] flex-1">
              From Indiana or Kentucky? Send film.
            </p>
            <a href={HARRISON_SMS} className={`${BTN_PRIMARY} mt-6 self-start`}>
              Text Harrison
            </a>
            <p className="mt-3 text-[14px] font-semibold text-[#1A1A1A] tracking-wide">
              {HARRISON_PHONE_DISPLAY}
            </p>
            <p className="mt-3 text-[12px] text-[#9CA3AF] leading-[1.6] border-t border-[#E5E8EC] pt-3">
              This line is for player placement and film only. For questions,
              use the chat or email below.
            </p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={includeTryoutTile ? 240 : 120} className="h-full">
        <div className="card h-full flex flex-col overflow-hidden">
          <div className="relative h-48 sm:h-52">
            <PhotoSlot
              name="getstarted-fees.jpg"
              alt="You First coaches and families"
              sizes="(max-width: 1024px) 100vw, 33vw"
              positionClassName="object-[center_15%]"
            />
          </div>
          <div className="p-7 sm:p-8 flex flex-col flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-[-0.01em]">
                <span className="gradient-text-accent">Questions &amp; Fees</span>
              </h2>
              <HeartIcon className="w-9 h-9 text-accent-blue flex-shrink-0" />
            </div>
            <p className="mt-4 text-[15px] text-[#6B7280] leading-[1.7]">
              For questions about the program, ask our chat below or read the
              FAQ.
            </p>
            <p className="mt-3 text-[15px] text-[#6B7280] leading-[1.7] flex-1">
              For fees, know this:{" "}
              <span className="font-semibold text-[#1A1A1A]">
                the cost should never be the reason a great player and family
                miss out on this experience.
              </span>{" "}
              We can work with any family. For an arrangement that fits yours,
              reach out to Kathleen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="mailto:kathleen@youfirstlacrosse.com" className={BTN_PRIMARY}>
                Email Kathleen
              </a>
              <Link
                href="/levels"
                className="inline-flex items-center justify-center px-7 py-3.5 border-2 border-accent-blue text-accent-blue text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl hover:bg-accent-wash hover:-translate-y-0.5 transition-all duration-300"
              >
                See the Teams
              </Link>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
