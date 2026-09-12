import { EVENT_COLORS, type ScheduleEvent } from "@/lib/calendar";

/**
 * Dated tournaments and showcases, listed as ranges a parent can read
 * without opening the calendar grid. Practices stay on the grid only.
 *
 * Companion to UndatedEvents: once an operator releases a weekend, the
 * event leaves "Dates to come" and lands here (and on the calendar /
 * subscribed feed).
 */
function formatRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (start === end) {
    return s.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    const month = s.toLocaleDateString("en-US", { month: "short" });
    return `${month} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function ConfirmedTournaments({
  events,
}: {
  events: ScheduleEvent[];
}) {
  const tournaments = events
    .filter(
      (e) =>
        (e.eventType === "tournament" || e.eventType === "showcase") &&
        !e.isCancelled,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (tournaments.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1100px] px-6 pb-10">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          Confirmed dates
        </p>
        <h2 className="mt-1.5 text-[20px] font-bold tracking-tight text-[#1A1A1A]">
          Tournament weekends
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280] max-w-2xl">
          These dates are set. They also appear on the calendar below and on
          any subscribed calendar.
        </p>

        <ul className="mt-7 space-y-4">
          {tournaments.map((event) => (
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
                <span className="block text-[14px] font-semibold text-[#1A1A1A] mt-0.5">
                  {formatRange(event.startDate, event.endDate)}
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
    </section>
  );
}
