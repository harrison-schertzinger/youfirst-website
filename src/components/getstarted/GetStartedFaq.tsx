import ScrollReveal from "@/components/home/ScrollReveal";

// Word-for-fact from the master Q&A (src/content/master-qa.md).
const FAQ_ITEMS = [
  {
    q: "What does it cost, and what is included?",
    a: "Fees are all-in, with the $200 roster confirmation (toward jerseys) already inside the number. The fee covers coaching from our college-player staff, practices at the Cincinnati Lacrosse Academy, weekend 6v6, and the tournament slate for the team's stage. Training options run June through February. You can pay in full or in installments. See the Levels page for the number by stage.",
  },
  {
    q: "Are there cuts?",
    a: "No. At the youth level we are not looking to cut players. Tryouts on July 11 are about placement, getting each girl on the right team and developing and playing.",
  },
  {
    q: "Does my daughter have to train at the Cincinnati Lacrosse Academy?",
    a: "Her team practices are held at the Cincinnati Lacrosse Academy, so that is her home base. The Academy's additional intensive training, the strength and extended skill work our older players do, is not expected at the youth age. That becomes more of an expectation once players get older, around 8th grade, when college goals start to solidify. Right now we want her competing, getting as many reps as she can, and enjoying the game. The training ramps up naturally as they grow into it.",
  },
  {
    q: "Can she play other sports?",
    a: "Yes, and we encourage it. Practice blocks are opportunities, not mandates, and the schedule is built to work around other sports. Send us the conflicts and we get ahead of them.",
  },
  {
    q: "Is it too late to start, or is she good enough?",
    a: "It is not too late, and she belongs here. The youth stages are built for players growing into the game, beginners and experienced players alike. Our job is to take her from wherever she is today toward wherever she wants to go.",
  },
  {
    q: "What equipment does she need?",
    a: "For a field player: a girls' lacrosse stick, ASTM-rated goggles, a mouthguard (colored, not clear or white), cleats, and no jewelry at practice or games. Goalies need additional gear, and we will walk you through exactly what to get. Not sure what to buy? Ask us first.",
  },
  {
    q: "What happens after July 11?",
    a: "Families are notified within 2 to 3 days, roster confirmation follows, and practice opportunities begin in mid-August and run through February.",
  },
];

export default function GetStartedFaq() {
  return (
    <section className="py-20 sm:py-24 bg-surface scroll-mt-20" id="faq">
      <div className="mx-auto max-w-[880px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="section-label mb-5">Common Questions</p>
            <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08]">
              <span className="text-[#1A1A1A]">The</span>{" "}
              <span className="gradient-text-accent">quick reads.</span>
            </h2>
          </div>
        </ScrollReveal>
        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, i) => (
            <ScrollReveal key={item.q} delay={Math.min(i, 4) * 80}>
              <details className="group bg-white rounded-2xl border border-[#E5E8EC] shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 sm:px-7 py-5 transition-shadow duration-300 open:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] sm:text-base font-bold text-[#1A1A1A] leading-snug">
                    {item.q}
                  </span>
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-wash text-accent-blue flex items-center justify-center transition-transform duration-300 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-[15px] text-[#6B7280] leading-[1.75]">{item.a}</p>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
