import { ScheduleEvent, EVENT_COLORS, EVENT_LABELS } from "@/lib/calendar";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

interface EventCardProps {
  event: ScheduleEvent;
  animationDelay: number;
}

export default function EventCard({ event, animationDelay }: EventCardProps) {
  const color = EVENT_COLORS[event.eventType];
  const label = EVENT_LABELS[event.eventType];
  const isMultiDay = event.startDate !== event.endDate;

  return (
    <div
      className="scroll-reveal"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        className="group bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="p-5 sm:p-6">
          {/* Top row: type badge + calendar icon */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
              style={{ backgroundColor: color }}
            >
              {label}
            </span>
            <button
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-accent-blue hover:bg-[#F0F7FF] transition-all duration-200"
              aria-label="Add to calendar"
              title="Add to calendar (coming soon)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="14" height="13" rx="2" />
                <path d="M6 1v3M12 1v3M2 7h14" />
                <path d="M9 10v4M7 12h4" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-[#1A1A1A] tracking-[-0.01em] mb-2">
            {event.title}
          </h3>

          {/* Date & Time */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280] mb-2">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-[#9CA3AF]">
                <rect x="1" y="2" width="12" height="11" rx="1.5" />
                <path d="M4.5 0.5v2.5M9.5 0.5v2.5M1 5.5h12" />
              </svg>
              {isMultiDay ? formatDateRange(event.startDate, event.endDate) : formatDate(event.startDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-[#9CA3AF]">
                <circle cx="7" cy="7" r="6" />
                <path d="M7 3.5v4l2.5 1.5" />
              </svg>
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </span>
          </div>

          {/* Location */}
          <p className="text-sm text-[#9CA3AF] mb-3 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[#9CA3AF]">
              <path d="M7 13S2 8.5 2 5.5a5 5 0 0110 0C12 8.5 7 13 7 13z" />
              <circle cx="7" cy="5.5" r="1.5" />
            </svg>
            {event.location}
          </p>

          {/* Description */}
          <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
            {event.description}
          </p>

          {/* Team badges */}
          <div className="flex flex-wrap gap-1.5">
            {event.teams.map((year) => (
              <span
                key={year}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[11px] font-medium text-[#6B7280]"
              >
                {year}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
