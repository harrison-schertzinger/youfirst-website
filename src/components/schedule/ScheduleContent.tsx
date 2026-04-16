"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ScheduleEvent,
  EventType,
  EVENT_COLORS,
  EVENT_LABELS,
} from "@/lib/calendar";

// ── Constants ──

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthRange(events: ScheduleEvent[]): { year: number; month: number }[] {
  if (events.length === 0) return [];
  const months = new Set<string>();
  for (const e of events) {
    const d = new Date(e.startDate + "T00:00:00");
    months.add(`${d.getFullYear()}-${d.getMonth()}`);
    // Also include end-date month for multi-day events
    if (e.endDate !== e.startDate) {
      const ed = new Date(e.endDate + "T00:00:00");
      months.add(`${ed.getFullYear()}-${ed.getMonth()}`);
    }
  }
  return Array.from(months)
    .map((k) => {
      const [y, m] = k.split("-").map(Number);
      return { year: y, month: m };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

const EVENT_TYPE_FILTERS: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "tournament", label: "Tournaments" },
  { value: "practice", label: "Practices" },
  { value: "training", label: "Training" },
  { value: "camp", label: "Camps" },
  { value: "showcase", label: "Showcases" },
  { value: "meeting", label: "Meetings" },
];

const TEAM_FILTERS = [
  { value: "all" as const, label: "All Teams" },
  { value: 2027, label: "2027" },
  { value: 2028, label: "2028" },
  { value: 2029, label: "2029" },
  { value: 2030, label: "2030" },
];

const MAX_VISIBLE = 2;

// ── Calendar helpers ──

interface CalendarDay {
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  const prevLast = new Date(year, month, 0).getDate();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevLast - i;
    days.push({
      dateStr: toDateStr(new Date(year, month - 1, d)),
      day: d,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      dateStr: toDateStr(new Date(year, month, d)),
      day: d,
      isCurrentMonth: true,
    });
  }

  const rem = 7 - (days.length % 7);
  if (rem < 7) {
    for (let d = 1; d <= rem; d++) {
      days.push({
        dateStr: toDateStr(new Date(year, month + 1, d)),
        day: d,
        isCurrentMonth: false,
      });
    }
  }

  return days;
}

function eventsForDate(events: ScheduleEvent[], dateStr: string): ScheduleEvent[] {
  return events.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);
}

// ── Formatting ──

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDateLong(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDateLong(start);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`;
}

function getDayNumber(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDate();
}

function getUpcomingEvent(events: ScheduleEvent[]): ScheduleEvent | null {
  const todayStr = toDateStr(new Date());
  const upcoming = events
    .filter((e) => e.endDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] || null;
}

function formatUpcomingTime(event: ScheduleEvent): string {
  const date = new Date(event.startDate + "T00:00:00");
  const dayStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  if (event.isAllDay) return dayStr;
  const [h, m] = event.startTime.split(":").map(Number);
  return `${dayStr} at ${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Component ──

interface ScheduleContentProps {
  events: ScheduleEvent[];
}

export default function ScheduleContent({ events }: ScheduleContentProps) {
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [teamFilter, setTeamFilter] = useState<number | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [dayEvents, setDayEvents] = useState<{ events: ScheduleEvent[]; label: string } | null>(null);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      if (teamFilter !== "all" && !e.teams.includes(teamFilter)) return false;
      return true;
    });
  }, [events, typeFilter, teamFilter]);

  const upNext = useMemo(() => getUpcomingEvent(events), [events]);
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  // Derive month range from events and pre-compute grids
  const monthGrids = useMemo(
    () => getMonthRange(events).map((m) => ({
      ...m,
      label: new Date(m.year, m.month).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      days: getCalendarDays(m.year, m.month),
    })),
    [events]
  );

  // Close modals on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedEvent(null);
        setDayEvents(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const modalOpen = !!(selectedEvent || dayEvents);
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  const openEvent = useCallback((e: ScheduleEvent) => {
    setDayEvents(null);
    setSelectedEvent(e);
  }, []);

  const openDay = useCallback((dayEvts: ScheduleEvent[], dateStr: string) => {
    const label = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    setSelectedEvent(null);
    setDayEvents({ events: dayEvts, label });
  }, []);

  return (
    <div className="pt-12 sm:pt-16 pb-24 sm:pb-32 lg:pb-40 bg-background">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* ── Up Next Card ── */}
        {upNext && (
          <div className="mb-10 sm:mb-14">
            <div
              className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300"
              style={{ borderLeft: `4px solid ${EVENT_COLORS[upNext.eventType]}` }}
              onClick={() => openEvent(upNext)}
            >
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-[0.04]">
                <svg viewBox="0 0 100 100" fill="currentColor" className="text-accent-blue w-full h-full">
                  <rect x="10" y="15" width="80" height="70" rx="8" />
                  <path d="M30 5v15M70 5v15M10 35h80" />
                </svg>
              </div>
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: EVENT_COLORS[upNext.eventType] }}
                  >
                    {getDayNumber(upNext.startDate)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-blue">Up Next</p>
                    <p className="text-base font-bold text-[#1A1A1A] break-words">{upNext.title}</p>
                  </div>
                </div>
                <div className="sm:ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#6B7280] min-w-0">
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-[#9CA3AF]">
                      <circle cx="7" cy="7" r="6" />
                      <path d="M7 3.5v4l2.5 1.5" />
                    </svg>
                    {formatUpcomingTime(upNext)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-[#9CA3AF]">
                      <path d="M7 13S2 8.5 2 5.5a5 5 0 0110 0C12 8.5 7 13 7 13z" />
                      <circle cx="7" cy="5.5" r="1.5" />
                    </svg>
                    {upNext.location}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="mb-10 sm:mb-14 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
            {EVENT_TYPE_FILTERS.map((f) => {
              const active = typeFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold uppercase tracking-[0.08em] border transition-all duration-300 ${
                    active
                      ? "bg-accent-blue text-white border-accent-blue shadow-[0_2px_8px_rgba(74,144,217,0.3)]"
                      : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#D1D5DB] hover:text-[#1A1A1A]"
                  }`}
                >
                  {f.value !== "all" && (
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: active ? "#fff" : EVENT_COLORS[f.value as EventType] }}
                    />
                  )}
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
            {TEAM_FILTERS.map((f) => {
              const active = teamFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setTeamFilter(f.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold uppercase tracking-[0.08em] border transition-all duration-300 ${
                    active
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                      : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#D1D5DB] hover:text-[#1A1A1A]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Color Legend ── */}
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2">
          {(Object.entries(EVENT_LABELS) as [EventType, string][]).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: EVENT_COLORS[type] }} />
              <span className="text-[11px] text-[#9CA3AF] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Stacked Month Grids ── */}
        <div className="space-y-14 sm:space-y-16">
          {monthGrids.map((mg) => (
            <section key={mg.label}>
              {/* Month header */}
              <h2 className="text-[1.75rem] sm:text-[2.25rem] font-bold tracking-tight text-[#1A1A1A] mb-4">
                {mg.label}
              </h2>

              <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {DAY_NAMES.map((d) => (
                    <div
                      key={d}
                      className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {mg.days.map((day, i) => {
                    const dayEvts = eventsForDate(filtered, day.dateStr);
                    const isToday = day.dateStr === todayStr;
                    const isWeekEnd = i % 7 === 0 || i % 7 === 6;
                    const showBorderRight = i % 7 !== 6;
                    const showBorderBottom = i < mg.days.length - 7;

                    return (
                      <div
                        key={day.dateStr + "-" + i}
                        className={`relative min-h-[72px] sm:min-h-[100px] lg:min-h-[110px] p-1 sm:p-1.5 ${
                          day.isCurrentMonth ? "bg-white" : "bg-[#FAFBFC]"
                        } ${showBorderRight ? "border-r border-[#F0F1F3]" : ""} ${
                          showBorderBottom ? "border-b border-[#F0F1F3]" : ""
                        } ${isWeekEnd && day.isCurrentMonth ? "bg-[#FDFDFE]" : ""}`}
                      >
                        <div className="flex justify-end sm:justify-start mb-0.5 sm:mb-1">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 text-[11px] sm:text-xs font-medium rounded-full ${
                              isToday
                                ? "bg-accent-blue text-white font-bold"
                                : day.isCurrentMonth
                                ? "text-[#374151]"
                                : "text-[#D1D5DB]"
                            }`}
                          >
                            {day.day}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          {dayEvts.slice(0, MAX_VISIBLE).map((event) => (
                            <button
                              key={event.id + day.dateStr}
                              onClick={() => openEvent(event)}
                              className="w-full text-left group/pill"
                            >
                              <div
                                className="hidden sm:flex items-center rounded-md px-1.5 py-[3px] text-[10px] lg:text-[11px] font-medium text-white truncate transition-all duration-200 group-hover/pill:brightness-110 group-hover/pill:shadow-sm"
                                style={{ backgroundColor: EVENT_COLORS[event.eventType] }}
                              >
                                <span className="truncate">{event.title}</span>
                              </div>
                              <div
                                className="sm:hidden h-[5px] rounded-full transition-all duration-200 group-hover/pill:brightness-110"
                                style={{ backgroundColor: EVENT_COLORS[event.eventType] }}
                              />
                            </button>
                          ))}
                          {dayEvts.length > MAX_VISIBLE && (
                            <button
                              onClick={() => openDay(dayEvts, day.dateStr)}
                              className="w-full text-left px-1 sm:px-1.5"
                            >
                              <span className="text-[10px] sm:text-[11px] font-semibold text-accent-blue hover:text-accent-blue-hover transition-colors duration-200">
                                +{dayEvts.length - MAX_VISIBLE} more
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto shadow-[0_24px_80px_rgba(0,0,0,0.15)] animate-fade-in-up"
            style={{ animationDuration: "0.3s" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F3F4F6] transition-all duration-200 z-10"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>

            <div
              className="h-1.5 rounded-t-2xl"
              style={{ backgroundColor: EVENT_COLORS[selectedEvent.eventType] }}
            />

            <div className="p-6 sm:p-8">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] text-white mb-4"
                style={{ backgroundColor: EVENT_COLORS[selectedEvent.eventType] }}
              >
                {EVENT_LABELS[selectedEvent.eventType]}
              </span>

              <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-[-0.01em] mb-5">
                {selectedEvent.title}
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                    <path d="M5 0.5v3M11 0.5v3M1.5 6.5h13" />
                  </svg>
                  <span className="text-[#374151]">
                    {formatDateRange(selectedEvent.startDate, selectedEvent.endDate)}
                  </span>
                </div>

                {selectedEvent.isAllDay ? (
                  <div className="flex items-start gap-3 text-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 4v4.5l3 1.5" />
                    </svg>
                    <span className="text-[#374151]">All day</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 4v4.5l3 1.5" />
                    </svg>
                    <span className="text-[#374151]">
                      {formatTime(selectedEvent.startTime)} – {formatTime(selectedEvent.endTime)}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="M8 15S2.5 9.5 2.5 6a5.5 5.5 0 0111 0C13.5 9.5 8 15 8 15z" />
                    <circle cx="8" cy="6" r="1.5" />
                  </svg>
                  <div>
                    <p className="text-[#374151] font-medium">{selectedEvent.location}</p>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">{selectedEvent.address}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
                {selectedEvent.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {selectedEvent.teams.map((year) => (
                  <span
                    key={year}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#F3F4F6] text-[11px] font-semibold text-[#6B7280]"
                  >
                    Class of {year}
                  </span>
                ))}
              </div>

              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:text-accent-blue hover:border-accent-blue/30 hover:bg-[#F0F7FF] transition-all duration-200"
                aria-label="Add to calendar (coming soon)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                  <path d="M5 0.5v3M11 0.5v3M1.5 6.5h13" />
                  <path d="M8 9v3M6.5 10.5h3" />
                </svg>
                Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Day Events Modal ── */}
      {dayEvents && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDayEvents(null)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-auto shadow-[0_24px_80px_rgba(0,0,0,0.15)] animate-fade-in-up"
            style={{ animationDuration: "0.3s" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDayEvents(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F3F4F6] transition-all duration-200 z-10"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>

            <div className="p-6 sm:p-8">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-5">
                {dayEvents.label}
              </h3>

              <div className="space-y-3">
                {dayEvents.events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => openEvent(event)}
                    className="w-full text-left group rounded-xl border border-[#E5E7EB] p-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
                    style={{ borderLeft: `4px solid ${EVENT_COLORS[event.eventType]}` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.06em] text-white"
                        style={{ backgroundColor: EVENT_COLORS[event.eventType] }}
                      >
                        {EVENT_LABELS[event.eventType]}
                      </span>
                    </div>
                    <p className="font-semibold text-[#1A1A1A] text-sm mb-1">
                      {event.title}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {event.isAllDay
                        ? `All day · ${event.location}`
                        : `${formatTime(event.startTime)} – ${formatTime(event.endTime)} · ${event.location}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
