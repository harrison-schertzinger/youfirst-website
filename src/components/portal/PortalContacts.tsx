import type { ClubContact } from "@/lib/club-contacts";

/**
 * Who to email. Deliberately loud.
 *
 * If this section is subtle, families keep using the phone number they already
 * have and the handoff to a club director never actually happens. Names and
 * addresses come from club_contacts — nothing here is hardcoded, so announcing
 * the incoming director is a data change, not a deploy.
 */
export default function PortalContacts({ contacts }: { contacts: ClubContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <section className="mb-16">
      <p className="section-label mb-3">Contact</p>
      <h2 className="text-[1.5rem] md:text-[1.75rem] font-bold tracking-tight text-[#1A1A1A] mb-2">
        Who to email
      </h2>
      <p className="text-[15px] text-[#6B7280] mb-6 max-w-xl">
        Anything about the club goes to one of these addresses. You will get an
        answer from the person whose name is on it.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <a
            key={contact.id}
            href={contact.email ? `mailto:${contact.email}` : undefined}
            className="group block rounded-2xl bg-white border border-[#E5E7EB] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.09)] hover:border-[#4B9CD3]/40 transition-all duration-200"
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#4B9CD3]">
              {contact.role}
            </div>
            {contact.name && (
              <div className="mt-1.5 text-[17px] font-semibold tracking-tight text-[#1A1A1A]">
                {contact.name}
              </div>
            )}
            {contact.blurb && (
              <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                {contact.blurb}
              </p>
            )}
            {contact.email && (
              <div className="mt-4 text-[14px] font-medium text-[#4B9CD3] break-all group-hover:text-[#3D87BC] transition-colors">
                {contact.email}
              </div>
            )}
            {contact.phone && (
              <div className="mt-1 text-[13px] text-[#9CA3AF]">{contact.phone}</div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
