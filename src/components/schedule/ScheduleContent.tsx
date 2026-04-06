"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  ScheduleEvent,
  EventType,
  EVENT_COLORS,
} from "@/lib/calendar";
import EventCard from "./EventCard";

const EVENT_TYPE_FILTERS: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "tournament", label: "Tournaments" },
  { value: "practice", label: "Practices" },
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
  { value: 2031, label: "2031" },
];

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDayNumber(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDate();
}

function getUpcomingEvent(events: ScheduleEvent[]): ScheduleEvent | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const upcoming = events
    .filter((e) => e.endDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] || null;
}

function formatUpcomingTime(event: ScheduleEvent): string {
  const [h, m] = event.startTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  const date = new Date(event.startDate + "T00:00:00");
  const dayStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return `${dayStr} at ${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

interface ScheduleContentProps {
  events: ScheduleEvent[];
}

export default function ScheduleContent({ events }: ScheduleContentProps) {
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [teamFilter, setTeamFilter] = useState<number | "all">("all");
  const timelineRef = useRef<HTMLDivElement>(null);

  // Filter events
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      if (teamFilter !== "all" && !e.teams.includes(teamFilter)) return false;
      return true;
    });
  }, [events, typeFilter, teamFilter]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of filtered) {
      const key = getMonthKey(e.startDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filtered]);

  // Up Next card — uses unfiltered events
  const upNext = useMemo(() => getUpcomingEvent(events), [events]);

  // Scroll-reveal observer
  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const els = container.querySelectorAll(".scroll-reveal");
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [filtered]);

  return (
    <div className="pb-24 sm:pb-32 lg:pb-40 bg-background">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        {/* ── Up Next Card ── */}
        {upNext && (
          <div className="mb-10 sm:mb-14">
            <div
              className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              style={{
                borderLeft: `4px solid ${EVENT_COLORS[upNext.eventType]}`,
              }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-[0.04]">
                <svg viewBox="0 0 100 100" fill="currentColor" className="text-accent-blue w-full h-full">
                  <rect x="10" y="15" width="80" height="70" rx="8" />
                  <path d="M30 5v15M70 5v15M10 35h80" />
                </svg>
              </div>
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: EVENT_COLORS[upNext.eventType] }}
                  >
                    {getDayNumber(upNext.startDate)}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-blue">
                      Up Next
                    </p>
                    <p className="text-base font-bold text-[#1A1A1A]">
                      {upNext.title}
                    </p>
                  </div>
                </div>
                <div className="sm:ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#6B7280]">
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
          {/* Type filters */}
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
                      style={{
                        backgroundColor: active
                          ? "#fff"
                          : EVENT_COLORS[f.value as EventType],
                      }}
                    />
                  )}
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Team filters */}
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

        {/* ── Timeline ── */}
        <div ref={timelineRef}>
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#F3F4F6] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="22" height="20" rx="3" />
                  <path d="M9 2v5M19 2v5M3 11h22" />
                  <path d="M11 17l6-4M17 17l-6-4" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#1A1A1A] mb-2">
                No events match your filters
              </p>
              <p className="text-sm text-[#9CA3AF]">
                Try adjusting your event type or team selection.
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([month, monthEvents]) => (
              <div key={month} className="mb-16 last:mb-0">
                {/* Month header */}
                <div className="scroll-reveal mb-8">
                  <h2 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-tight text-[#1A1A1A]">
                    {month}
                  </h2>
                  <div className="mt-2 h-px w-16 bg-accent-blue rounded-full" />
                </div>

                {/* Day-grouped timeline */}
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[23px] top-0 bottom-0 w-px bg-[#E5E7EB] hidden sm:block" />

                  {(() => {
                    // Group events by start date within month
                    const dayMap = new Map<string, ScheduleEvent[]>();
                    for (const e of monthEvents) {
                      if (!dayMap.has(e.startDate))
                        dayMap.set(e.startDate, []);
                      dayMap.get(e.startDate)!.push(e);
                    }
                    let cardIndex = 0;

                    return Array.from(dayMap.entries()).map(
                      ([date, dayEvents]) => (
                        <div key={date} className="relative flex gap-6 mb-8 last:mb-0">
                          {/* Date marker */}
                          <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-[48px]">
                            <div className="w-[48px] h-[48px] rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center relative z-10">
                              <span className="text-[10px] font-semibold uppercase text-[#9CA3AF] leading-none">
                                {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                              </span>
                              <span className="text-lg font-bold text-[#1A1A1A] leading-none mt-0.5">
                                {getDayNumber(date)}
                              </span>
                            </div>
                          </div>

                          {/* Event cards for this day */}
                          <div className="flex-1 space-y-4 min-w-0">
                            {dayEvents.map((event) => {
                              const delay = Math.min(cardIndex * 80, 400);
                              cardIndex++;
                              return (
                                <EventCard
                                  key={event.id}
                                  event={event}
                                  animationDelay={delay}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
