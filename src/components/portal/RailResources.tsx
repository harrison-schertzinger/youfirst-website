import RailCard from "./RailCard";
import type { ClubResource } from "@/lib/club-resources";

/**
 * What is being built around the player, one tap away.
 *
 * Rows come from club_resources — the director adds a link and it appears here.
 * Only published rows arrive, and the database will not publish one without a
 * URL, so nothing in this list can be a dead end.
 */
export default function RailResources({
  resources,
}: {
  resources: ClubResource[];
}) {
  if (resources.length === 0) return null;

  return (
    <RailCard label="Resources">
      <ul className="space-y-3">
        {resources.map((r) => (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-[#E5E7EB] px-3.5 py-3 hover:border-[#4B9CD3]/50 hover:bg-[#EDF5FB]/40 transition-colors"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#1A1A1A]">
                  {r.label}
                </span>
                <span className="text-[#9CA3AF] group-hover:text-[#4B9CD3] transition-colors">
                  ↗
                </span>
              </span>
              {r.description && (
                <span className="mt-0.5 block text-[12px] leading-relaxed text-[#6B7280]">
                  {r.description}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}
