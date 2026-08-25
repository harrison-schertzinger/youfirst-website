import type { ScheduleEvent, UndatedEvent } from "@/lib/calendar";
import { EVENT_LABELS } from "@/lib/calendar";

/**
 * The schedule, on the portal.
 *
 * Two groups, and the split is the point:
 *
 *   DATED — the club has confirmed these. They are in the calendar feed.
 *   DATE TBC — real commitments whose date is not published yet. They render
 *              here so a family can plan around them, and they are deliberately
 *              WITHHELD from the feed. A guessed date on a parent's phone is
 *              worse than no date, because they will act on it.
 *
 * The subscribe link is a webcal:// URL so a phone opens its calendar app
 * rather than downloading a file it doesn't know what to do with.
 */

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function teamsLabel(teams: number[], allCount: number): string {
  if (teams.length === 0 || teams.length >= allCount) return "All teams";
  return teams.join(" · ");
}

export default function PortalSchedule({
  events,
  undated,
  subscribeUrl,
  teamCount,
}: {
  events: ScheduleEvent[];
  undated: UndatedEvent[];
  subscribeUrl: string | null;
  teamCount: number;
}) {
  return (
    <section className="mb-16">
      <p className="section-label mb-3">Schedule</p>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[1.5rem] md:text-[1.75rem] font-bold tracking-tight text-[#1A1A1A] mb-2">
            What&rsquo;s coming up
          </h2>
          <p className="text-[15px] text-[#6B7280] max-w-xl">
            Subscribe once and this schedule lives in your phone&rsquo;s
            calendar. When a practice moves, it moves on your phone too — you
            will not need another email from us.
          </p>
        </div>

        {subscribeUrl && (
          <a
            href={subscribeUrl}
            className="shrink-0 inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#4B9CD3] text-white text-[13px] font-semibold uppercase tracking-[0.08em] shadow-[0_4px_14px_rgba(75,156,211,0.35)] hover:bg-[#3D87BC] transition-colors duration-200"
          >
            Add to my calendar
          </a>
        )}
      </div>

      {events.length > 0 && (
        <ul className="rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] divide-y divide-[#E5E7EB] overflow-hidden">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-4 px-5 py-4 sm:px-6"
            >
              <div className="w-[86px] shrink-0">
                <div
                  className={`text-[14px] font-semibold tracking-tight ${
                    event.isCancelled
                      ? "text-[#9CA3AF] line-through"
                      : "text-[#1A1A1A]"
                  }`}
                >
                  {formatDay(event.startDate)}
                </div>
                {!event.isAllDay && (
                  <div className="text-[12px] text-[#9CA3AF]">
                    {formatTime(event.startTime)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[15px] font-medium ${
                      event.isCancelled
                        ? "text-[#9CA3AF] line-through"
                        : "text-[#1A1A1A]"
                    }`}
                  >
                    {event.title}
                  </span>
                  {event.isCancelled && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded">
                      Cancelled
                    </span>
                  )}
                </div>
                {event.location && (
                  <div className="text-[13px] text-[#6B7280] truncate">
                    {event.location}
                  </div>
                )}
              </div>

              <div className="hidden sm:block shrink-0 text-right">
                <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#9CA3AF]">
                  {EVENT_LABELS[event.eventType]}
                </div>
                <div className="text-[12px] text-[#6B7280]">
                  {teamsLabel(event.teams, teamCount)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {undated.length > 0 && (
        <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F0F1F3]/60 p-5 sm:p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280] mb-3">
            Dates to come
          </div>
          <ul className="space-y-3">
            {undated.map((event) => (
              <li key={event.id} className="flex items-baseline gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] shrink-0 w-[68px]">
                  Date TBC
                </span>
                <span className="min-w-0">
                  <span className="text-[15px] font-medium text-[#1A1A1A]">
                    {event.title}
                  </span>
                  {event.location && (
                    <span className="text-[13px] text-[#6B7280]">
                      {" "}
                      · {event.location}
                    </span>
                  )}
                  {event.dateNote && (
                    <span className="block text-[13px] text-[#6B7280]">
                      {event.dateNote}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-[#6B7280] leading-relaxed">
            These are on the calendar for the club, but the operator has not
            published dates. We will not guess at one — the moment a date is
            confirmed it appears here and in your subscribed calendar.
          </p>
        </div>
      )}
    </section>
  );
}
