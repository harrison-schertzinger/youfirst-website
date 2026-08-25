import RailCard from "./RailCard";
import type { ClubContact } from "@/lib/club-contacts";

/**
 * Who to email, in the rail — visible beside the money rather than buried at
 * the bottom of a scroll. If a parent cannot find this, she uses the phone
 * number she already has and the handoff to a director never happens.
 *
 * Names and addresses are rows in club_contacts, so announcing someone new is
 * publishing a row, not shipping code.
 */
export default function RailContacts({ contacts }: { contacts: ClubContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <RailCard label="Who to email">
      <ul className="space-y-4">
        {contacts.map((contact) => (
          <li key={contact.id}>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#4B9CD3]">
              {contact.role}
            </div>
            {contact.name && (
              <div className="mt-0.5 text-[14px] font-semibold text-[#1A1A1A]">
                {contact.name}
              </div>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-[13px] text-[#6B7280] hover:text-[#4B9CD3] break-all transition-colors"
              >
                {contact.email}
              </a>
            )}
          </li>
        ))}
      </ul>
    </RailCard>
  );
}
