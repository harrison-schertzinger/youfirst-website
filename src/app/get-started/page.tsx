import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ScrollReveal from "@/components/home/ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";
import ChatWidget from "@/components/getstarted/ChatWidget";

export const metadata: Metadata = {
  title: "Get Started | YOU. FIRST Elite Lacrosse",
  description:
    "There is always room for a great player. Tryouts are the front door, not the only door — here is how to find your place with You. First.",
};

// TODO: Harrison will provide the real number — swap it in here.
const HARRISON_SMS = "sms:PHONE_PLACEHOLDER";

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

const BTN_PRIMARY =
  "inline-flex items-center justify-center px-7 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(75,156,211,0.4)] hover:bg-accent-blue-hover hover:-translate-y-0.5 transition-all duration-300";

export default function GetStartedPage() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main className="bw-site">
        {/* Hero — dark band, exact copy */}
        <section className="bg-[#0A0A0B] pt-40 pb-20 sm:pt-48 sm:pb-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8 text-center">
            <p className="section-label mb-5">Join You. First</p>
            <h1 className="text-[2.6rem] sm:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-[-0.025em] leading-[1.04] text-white">
              There is always room
              <span className="block">
                for <span className="gradient-text-blue">a great player.</span>
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/70 leading-[1.7] max-w-2xl mx-auto">
              Tryouts are the front door, not the only door. Wherever you are
              starting from, here is how to find your place with us.
            </p>
          </div>
        </section>

        {/* Ask us anything — chat */}
        <section className="py-20 sm:py-24 bg-surface scroll-mt-20" id="ask">
          <div className="mx-auto max-w-[880px] px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <p className="section-label mb-5">Ask Us Anything</p>
                <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08]">
                  <span className="text-[#1A1A1A]">Straight answers,</span>{" "}
                  <span className="gradient-text-accent">instantly.</span>
                </h2>
                <p className="mt-5 text-[17px] sm:text-lg text-[#6B7280] leading-[1.8]">
                  Type a question and get a straight answer, instantly. Our
                  assistant knows the program, the levels, the season, and the
                  details.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <ChatWidget />
            </ScrollReveal>
          </div>
        </section>
        {/* Three doors */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Tile 1 — Come try out */}
              <ScrollReveal className="h-full">
                <div className="card h-full flex flex-col overflow-hidden">
                  <div className="relative h-48 sm:h-52">
                    <PhotoSlot
                      name="getstarted-tryouts.jpg"
                      positionClassName="object-[center_15%]"
                      alt="You First players competing at tryouts"
                      sizes="(max-width: 1024px) 100vw, 33vw"
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
                      Our main tryouts are in the summer, but here is what most
                      clubs will not tell you: we add players through the fall
                      and the spring too. Missing a summer date does not mean
                      missing your chance.
                    </p>
                    <p className="mt-3 text-[15px] font-semibold text-[#1A1A1A] leading-[1.65] flex-1">
                      First tryout: Saturday, July 11. Makeup tryouts: August 3
                      to 7. Both at the Cincinnati Lacrosse Academy.
                    </p>
                    <Link href="/tryouts" className={`${BTN_PRIMARY} mt-6 self-start`}>
                      Register for Tryouts
                    </Link>
                  </div>
                </div>
              </ScrollReveal>

              {/* Tile 2 — Missed tryouts? Send film */}
              <ScrollReveal delay={120} className="h-full">
                <div className="card h-full flex flex-col overflow-hidden">
                  <div className="relative h-48 sm:h-52">
                    <PhotoSlot
                      name="getstarted-film.jpg"
                      positionClassName="object-[center_15%]"
                      alt="Game film of a You First player"
                      sizes="(max-width: 1024px) 100vw, 33vw"
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
                      tryouts and want a spot on the team, send your film
                      straight to Harrison and we will take it from there.
                    </p>
                    <p className="mt-3 text-[15px] font-semibold text-[#1A1A1A] leading-[1.65] flex-1">
                      From Indiana or Kentucky? Send film.
                    </p>
                    <a href={HARRISON_SMS} className={`${BTN_PRIMARY} mt-6 self-start`}>
                      Text Harrison
                    </a>
                    <p className="mt-4 text-[12px] text-[#9CA3AF] leading-[1.6] border-t border-[#E5E8EC] pt-3">
                      This line is for player placement and film only. For
                      questions, use the chat or email below.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Tile 3 — Questions & fees */}
              <ScrollReveal delay={240} className="h-full">
                <div className="card h-full flex flex-col overflow-hidden">
                  <div className="relative h-48 sm:h-52">
                    <PhotoSlot
                      name="getstarted-fees.jpg"
                      positionClassName="object-[center_15%]"
                      alt="You First coaches and families"
                      sizes="(max-width: 1024px) 100vw, 33vw"
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
                      For questions about the program, ask our chat below or
                      read the FAQ.
                    </p>
                    <p className="mt-3 text-[15px] text-[#6B7280] leading-[1.7] flex-1">
                      For fees, know this:{" "}
                      <span className="font-semibold text-[#1A1A1A]">
                        the cost should never be the reason a great player and
                        family miss out on this experience.
                      </span>{" "}
                      We can work with any family. For an arrangement that fits
                      yours, reach out to Kathleen.
                    </p>
                    <a
                      href="mailto:kathleen@youfirstlacrosse.com"
                      className={`${BTN_PRIMARY} mt-6 self-start`}
                    >
                      Email Kathleen
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
