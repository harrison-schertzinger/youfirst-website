import RailCard from "./RailCard";
import { EVENT_COLORS, type EventType } from "@/lib/calendar";

/**
 * The next Saturdays, as blocks.
 *
 * Every Saturday is a four-hour commitment in two parts — the Academy hour at
 * 10, then YOU. FIRST practice at 12 — and a flat list of titles hid that. Days
 * are grouped, each block carries its real time, and the colour bar matches the
 * schedule page so the two surfaces teach the same thing: light Carolina is the
 * Academy, deep Carolina is the club's own session.
 *
 * The full schedule is NOT duplicated here — /schedule owns that, and two copies
 * means one of them goes stale. This is the next thing plus the one action worth
 * taking: subscribe, so every later change reaches the phone by itself.
 */

export interface RailEvent {
  id: string;
  title: string;
  startDate: string;
  startTime: string;
  endTime: string;
  eventType: EventType;
  isAllDay: boolean;
}

function time(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, "0")}${period}`;
}

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function RailCalendar({
  subscribeUrl,
  events,
}: {
  subscribeUrl: string | null;
  events: RailEvent[];
}) {
  // Group into days, preserving order.
  const days: { date: string; events: RailEvent[] }[] = [];
  for (const event of events) {
    const last = days[days.length - 1];
    if (last && last.date === event.startDate) last.events.push(event);
    else days.push({ date: event.startDate, events: [event] });
  }

  return (
    <RailCard label="Schedule">
      {days.length > 0 && (
        <div className="mb-4 space-y-3.5">
          {days.map((day) => (
            <div key={day.date}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF] mb-1.5">
                {dayLabel(day.date)}
              </p>
              <ul className="space-y-1.5">
                {day.events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-stretch gap-2.5 rounded-lg bg-[#FAFBFC] py-2 pr-2.5"
                  >
                    <span
                      aria-hidden
                      className="w-[3px] rounded-full shrink-0 ml-2"
                      style={{ backgroundColor: EVENT_COLORS[event.eventType] }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium text-[#1A1A1A] truncate">
                        {event.title}
                      </span>
                      {!event.isAllDay && (
                        <span className="block text-[11.5px] tabular-nums text-[#6B7280]">
                          {time(event.startTime)} – {time(event.endTime)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {subscribeUrl && (
        <a
          href={subscribeUrl}
          className="block w-full text-center px-4 py-2.5 rounded-xl bg-[#4B9CD3] text-white text-[12px] font-semibold uppercase tracking-[0.08em] hover:bg-[#3D87BC] transition-colors duration-200"
        >
          Add to my calendar
        </a>
      )}
      <p className="mt-2.5 text-[12px] leading-relaxed text-[#9CA3AF]">
        Subscribe once. When a practice moves, it moves on your phone.
      </p>

      <a
        href="/schedule"
        className="mt-4 inline-block text-[12px] font-medium text-[#4B9CD3] hover:text-[#3D87BC] transition-colors"
      >
        See the full schedule →
      </a>
    </RailCard>
  );
}
