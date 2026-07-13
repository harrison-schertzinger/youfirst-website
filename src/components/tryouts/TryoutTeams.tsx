import Link from "next/link";
import ScrollReveal from "@/components/home/ScrollReveal";

// ── The teams behind the tryout — condensed cards mirroring the Teams page.
// Development first; structure kept unmistakable. Full detail lives on /levels.

const TEAMS = [
  {
    name: "Development",
    grades: "Classes 2032 & 2033 · 2034s who are ready play up.",
    body: "Debuts with three tournaments next June; optional training starts September.",
  },
  {
    name: "Elite",
    grades: "Rising 8th grade and up · Classes 2028–2031.",
    body: "Full competitive team, competing this year.",
  },
];

export default function TryoutTeams() {
  return (
    <section className="py-20 sm:py-24 bg-surface">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <ScrollReveal>
            <p className="section-label mb-5">The Teams</p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-[2rem] sm:text-[2.75rem] font-bold tracking-tight leading-[1.08] text-[#1A1A1A]">
              Teams You&apos;re <span className="gradient-text-accent">Trying Out For.</span>
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {TEAMS.map((team, i) => (
            <ScrollReveal key={team.name} delay={i * 120}>
              <div className="card h-full p-8 sm:p-10 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent-wash text-accent-blue-hover text-[11px] font-semibold uppercase tracking-[0.15em]">
                    {team.name}
                  </span>
                  <span className="h-px flex-1 bg-[#E5E8EC]" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-[-0.015em]">
                  <span className="gradient-text-accent">{team.name}</span>
                </h3>
                <p className="mt-2 text-sm font-medium text-[#6B7280]">{team.grades}</p>
                <p className="mt-4 text-[15px] text-[#1A1A1A] font-medium leading-[1.7] flex-1">
                  {team.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <p className="mt-9 text-center">
            <Link
              href="/levels"
              className="arrow-link inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors duration-200"
            >
              See the Teams — every price published
              <span className="arrow">&rarr;</span>
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
