import type { ClubResource } from "@/lib/club-resources";

/**
 * What is being built around the player, full width at the foot of the page.
 *
 * These were narrow text rows in the rail, which is the wrong shape for them:
 * a link to somewhere worth going should look like somewhere worth going. Each
 * tile carries the site's own share image, so the Academy and YOU.PRJCT+ arrive
 * looking like themselves rather than as two more grey rows.
 *
 * A tile with no image is not a broken tile — it falls back to a branded panel
 * and still reads as a place to go. Third-party images are rendered with a
 * plain <img> deliberately: next/image would need every one of these hosts
 * declared up front, and this list is meant to be edited by a director without
 * a deploy.
 */
export default function ResourceTiles({
  resources,
}: {
  resources: ClubResource[];
}) {
  if (resources.length === 0) return null;

  return (
    <section id="resources" className="scroll-mt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-4">
        Resources
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {resources.map((r) => (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] hover:border-[#4B9CD3]/40 transition-all duration-200"
            >
              <div className="relative aspect-[16/9] bg-gradient-to-br from-[#EDF5FB] to-[#D8E9F5] overflow-hidden">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center px-6 text-center text-[15px] font-bold tracking-tight text-[#4B9CD3]">
                    {r.label}
                  </span>
                )}
              </div>

              <div className="p-5">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-[14px] font-semibold tracking-tight text-[#1A1A1A]">
                    {r.label}
                  </span>
                  <span className="shrink-0 text-[#9CA3AF] group-hover:text-[#4B9CD3] transition-colors">
                    ↗
                  </span>
                </span>
                {r.description && (
                  <span className="mt-1 block text-[13px] leading-relaxed text-[#6B7280]">
                    {r.description}
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
