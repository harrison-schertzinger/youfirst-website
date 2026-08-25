import RailCard from "./RailCard";

/**
 * Calendar subscription, in the rail.
 *
 * The full schedule is NOT repeated on the portal — /schedule already exists
 * and duplicating it means two places to keep right and one of them silently
 * going stale. What belongs here is the one action a parent takes once:
 * subscribe, so every later change reaches her phone without an email.
 *
 * webcal:// so a phone hands the URL to its calendar app rather than
 * downloading a file it has no idea what to do with.
 */
export default function RailCalendar({
  subscribeUrl,
  nextUp,
}: {
  subscribeUrl: string | null;
  nextUp: { id: string; title: string; when: string }[];
}) {
  return (
    <RailCard label="Schedule">
      {nextUp.length > 0 && (
        <ul className="mb-4 space-y-2.5">
          {nextUp.map((event) => (
            <li key={event.id} className="flex items-baseline gap-3">
              <span className="shrink-0 w-[74px] text-[12px] font-semibold tabular-nums text-[#6B7280]">
                {event.when}
              </span>
              <span className="text-[13px] text-[#1A1A1A] truncate">
                {event.title}
              </span>
            </li>
          ))}
        </ul>
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
