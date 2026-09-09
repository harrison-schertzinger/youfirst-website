import WarRoomBoard from "@/components/admin/warroom/WarRoomBoard";
import OpsContacts from "@/components/admin/warroom/OpsContacts";
import TeamReadiness from "@/components/admin/rosters/TeamReadiness";
import { buildRosterData, getServiceClient } from "@/lib/rosters/data";
import { buildReadiness } from "@/lib/rosters/readiness";
import type { WarRoomCard } from "@/lib/war-room";
import type { OpsContact } from "@/lib/ops-contacts";

export const dynamic = "force-dynamic";

/**
 * THE WAR ROOM — Luke's one page.
 *
 * Harrison handed day-to-day direction of the club to Luke; Harrison and Henry
 * stay on culture and coaching. This is the shared operating picture all three
 * of them look at, and the whole handoff fits on it: what is being worked on,
 * what is blocked on a decision, where the rosters are thin, and who to call.
 *
 * ON ADDING A ROUTE, given docs/ADMIN-MAP.md says not to:
 *
 * That rule exists because /admin was once a thin landing page hiding the real
 * instrument at /admin/rosters — two surfaces for ONE job, with no signpost
 * between them. This is not that. The roster screen answers "who is on which
 * team"; this answers "what does the club owe attention to this week", and it
 * is read by a different person for a different reason. Folding a whiteboard
 * and a phone book into a 2,000-line roster client would bury both.
 *
 * What the rule DOES bind here, and what is honoured: roster capability stays
 * on /admin. The readiness strip below is the SAME component, fed by the SAME
 * buildReadiness() reduction, that renders on /admin — one implementation, two
 * mounts, so the two screens can never report a different count for a team.
 */

interface Loaded {
  cards: WarRoomCard[];
  contacts: OpsContact[];
  failed: boolean;
}

async function loadBoard(): Promise<Loaded> {
  // Same service client the roster screen uses — one place that knows how the
  // service-role key is picked up, rather than a fourth copy of that snippet.
  const admin = getServiceClient();
  if (!admin) return { cards: [], contacts: [], failed: true };

  const [cardsRes, contactsRes] = await Promise.all([
    admin
      .from("war_room_cards")
      .select("id, board_column, title, body, added_by, created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    admin
      .from("ops_contacts")
      .select("id, name, contact_for, notes, added_by, created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
  ]);

  if (cardsRes.error) console.error("[war-room cards]", cardsRes.error);
  if (contactsRes.error) console.error("[war-room contacts]", contactsRes.error);

  return {
    cards: (cardsRes.data ?? []) as WarRoomCard[],
    contacts: (contactsRes.data ?? []) as OpsContact[],
    failed: Boolean(cardsRes.error || contactsRes.error),
  };
}

export default async function WarRoomPage() {
  const { cards, contacts, failed } = await loadBoard();

  // Readiness is a garnish on THIS page — the board is the page. If the roster
  // read throws, the board still renders, exactly as /admin lets the KPI strip
  // fail without taking the roster down with it.
  let teams: ReturnType<typeof buildReadiness> = [];
  let rosterFailed = false;
  try {
    const supabase = getServiceClient();
    if (!supabase) throw new Error("no service client");
    teams = buildReadiness(await buildRosterData(supabase));
  } catch (e) {
    console.error("[war-room readiness]", e);
    rosterFailed = true;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-[#0A0A0B]">
          The War Room
        </h1>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          What the club is working on, what is waiting on a decision, and who to
          call. Harrison, Henry and Luke all write to this board.
        </p>
      </header>

      {failed && (
        <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-4 text-[12px] text-[#EF4444]">
          Part of this page couldn&apos;t load. What you see below may be
          incomplete — refresh before acting on it.
        </div>
      )}

      <WarRoomBoard initial={cards} />

      {rosterFailed ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-[12px] text-[#6B7280]">
          Roster readiness couldn&apos;t load. The rosters themselves are fine —
          open the Command Center to see them.
        </div>
      ) : (
        <TeamReadiness teams={teams} />
      )}

      <OpsContacts initial={contacts} />
    </div>
  );
}
