import { EVENT_COLORS, type UndatedEvent } from "@/lib/calendar";

/**
 * Tournaments the club is committed to, whose dates the operators have not
 * released.
 *
 * These are real commitments and a family plans a summer around them, so hiding
 * them until a date exists is not neutral — it reads as "no tournaments". But
 * they are deliberately WITHHELD FROM THE CALENDAR FEED: a date on a phone gets
 * acted on, and a guessed one sends a family to Pennsylvania on the wrong
 * weekend. Visible here, absent there, until somebody confirms.
 */
export default function UndatedEvents({ events }: { events: UndatedEvent[] }) {
  if (events.length === 0) return null;

  const fall = events.filter((e) => (e.dateNote ?? "").includes("Fall"));
  const summer = events.filter((e) => !(e.dateNote ?? "").includes("Fall"));

  return (
    <section className="mx-auto max-w-[1100px] px-6 pb-20">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          Dates to come
        </p>
        <h2 className="mt-1.5 text-[20px] font-bold tracking-tight text-[#1A1A1A]">
          Tournaments we are committed to
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280] max-w-2xl">
          The operators have not released dates for these yet. They are on the
          calendar for the club, and the moment a date is confirmed it appears
          here and on any subscribed calendar. We will not put an estimate on
          your phone.
        </p>

        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          {[
            ["Fall 2026", fall],
            ["Summer 2027", summer],
          ].map(([label, list]) => {
            const items = list as UndatedEvent[];
            if (items.length === 0) return null;
            return (
              <div key={label as string}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] mb-3">
                  {label as string}
                </p>
                <ul className="space-y-3">
                  {items.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-1.5 w-[3px] shrink-0 rounded-full self-stretch"
                        style={{ backgroundColor: EVENT_COLORS[event.eventType] }}
                      />
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-[#1A1A1A]">
                          {event.title}
                        </span>
                        <span className="block text-[13px] text-[#6B7280]">
                          {event.teams.length > 0
                            ? event.teams.join(" · ")
                            : "All teams"}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                        {event.description && (
                          <span className="mt-0.5 block text-[13px] text-[#9CA3AF]">
                            {event.description}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
