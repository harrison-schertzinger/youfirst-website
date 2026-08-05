/**
 * Correcting where a family's email goes. Server only.
 *
 * THE PROBLEM THIS SOLVES, precisely:
 *
 * A resend is rarely "send that identical email again". It is "send it again,
 * to the right place this time" — Elizabeth Woll's confirmation link went to
 * woll.elizabeth@icloud.com, a fifteen-year-old's inbox, instead of her mother
 * Sarah's. Correcting only the token would not survive: issueToken() treats the
 * roster-derived address as truth and rewrites placement_tokens.recipient_email
 * whenever the two disagree, so the next preview or nudge would quietly restore
 * the wrong address and send there again.
 *
 * So a correction has to land on the record the AUDIENCE reads. That record is
 * different per athlete, and this module is the only thing that writes to it:
 *
 *   tryout_registrations   →  tryout_registrations.email
 *   players                →  the guardian chooseGuardian() picks, when that
 *                             guardian has an email column at all; otherwise
 *                             players.fallback_email
 *
 * THE SOURCE IS IDENTIFIED BY RE-EVALUATING THE AUDIENCE'S OWN EXPRESSION, not
 * by matching the address currently in play.
 *
 * The previous version searched the linked guardians for whichever ones held
 * the address the roster was showing, on the theory that matching the value in
 * effect "cannot miss". It could, in exactly one shape: src/lib/rosters/data.ts
 * picks ONE guardian and resolves `chosen?.email ?? player.fallback_email`, so
 * when the chosen guardian has no email and some OTHER linked guardian does,
 * nothing matches the value in play — and the old code fell through to a branch
 * that wrote every other guardian instead. The audience kept reading the chosen
 * guardian, kept falling through to fallback_email, and issueToken re-stamped
 * the token back to the old address on the next pass. The write succeeded, the
 * operator was told "her guardian record" was updated, and nothing changed.
 *
 * Re-evaluating the audience's expression cannot drift, because it IS the
 * expression: chooseGuardian() is imported from the roster module rather than
 * restated here. Note the nullish check below is `!= null`, not a truthiness or
 * validity test — `chosen?.email ?? fallback` also falls through on null and
 * ONLY on null, so an empty or malformed guardian email is still the row the
 * audience reads, and still the row this writes.
 *
 * ONE ROW, NOT EVERY MATCHING ROW. This writes only the record the audience
 * reads. A second parent's guardian row is that parent's own record; rewriting
 * their address because the other parent's was wrong is a side effect nobody
 * asked for, and with a deterministic chooser no unwritten row can win a later
 * lookup anyway.
 *
 * A guardian row can be shared with a sibling. That is DISCLOSED BEFORE the
 * write — describeAddressSource() is a pure read that the drawer calls when it
 * opens, so the operator sees "this also changes it for Elise Swartz" while
 * they can still decide. A disclosure delivered after the commit is a receipt,
 * not a choice.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { chooseGuardian, type GuardianLink } from "@/lib/rosters/data";
import { type SendableAthlete } from "@/lib/placement/audience";

export interface AddressSource {
  /** Which record holds the address, for the operator to read. */
  kind: "registration" | "guardian" | "player_fallback";
  /** A sentence naming what a correction would change. */
  label: string;
  /** Guardian rows to update. Empty for the other two kinds. */
  guardianIds: string[];
  /** Other athletes whose address changes as a side effect. Named, not counted. */
  alsoAffects: string[];
}

interface GuardianRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

/** "  Stella   Straubel " → "stella straubel". Duplicate rows of one athlete
 *  differ by id, never by who they are. */
function normName(raw: string | null): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function displayName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

/**
 * Which record supplies this athlete's address today, and who else reads it.
 * Pure read — nothing here writes, which is what lets the drawer call it to
 * disclose a shared guardian before the operator commits to anything.
 */
export async function describeAddressSource(
  db: SupabaseClient,
  athlete: SendableAthlete,
): Promise<AddressSource> {
  if (athlete.table === "tryout_registrations") {
    return {
      kind: "registration",
      label: "her tryout registration",
      guardianIds: [],
      alsoAffects: [],
    };
  }

  const { data: links, error: linkErr } = await db
    .from("player_guardians")
    .select("guardian_id, is_primary")
    .eq("player_id", athlete.id);
  if (linkErr) throw new Error(`Guardian lookup failed: ${linkErr.message}`);

  const linkRows = (links ?? []) as GuardianLink[];
  if (linkRows.length === 0) {
    return {
      kind: "player_fallback",
      label: "her player record",
      guardianIds: [],
      alsoAffects: [],
    };
  }

  const { data: guardians, error: gErr } = await db
    .from("guardians")
    .select("id, email, first_name, last_name")
    .in(
      "id",
      linkRows.map((l) => l.guardian_id),
    );
  if (gErr) throw new Error(`Guardian read failed: ${gErr.message}`);

  const guardianById = new Map<string, GuardianRow>();
  for (const g of (guardians ?? []) as GuardianRow[]) guardianById.set(g.id, g);

  // The audience's own expression, not an approximation of it.
  const chosen = chooseGuardian(linkRows, guardianById);

  // `chosen?.email ?? player.fallback_email` falls through on null and only on
  // null. Anything else — including "" and a malformed address — means the
  // guardian row is what the audience reads.
  if (!chosen || chosen.email == null) {
    return {
      kind: "player_fallback",
      label: "her player record",
      guardianIds: [],
      alsoAffects: [],
    };
  }

  const who = displayName(chosen.first_name, chosen.last_name);
  return {
    kind: "guardian",
    label: who ? `the guardian record for ${who}` : "her guardian record",
    guardianIds: [chosen.id],
    alsoAffects: await siblingsOf(db, [chosen.id], athlete),
  };
}

/**
 * Other athletes linked to the same guardian rows. Named, so nothing is a
 * surprise.
 *
 * THROWS RATHER THAN RETURNING EMPTY. This used to swallow its error and return
 * [], which meant a failed lookup reported "this affects nobody" while the write
 * went ahead and changed a shared row regardless — the disclosure failing open
 * while the write failed closed, which is backwards. If we cannot say who else
 * is affected, the caller must not proceed as though the answer were "nobody".
 *
 * De-duplicated BY NAME, not by row. Stella Straubel has three player rows
 * sharing one pair of guardians; listing her own duplicates back to the operator
 * as two other people is worse than saying nothing. Rows are not filtered by
 * player status — an archived record still shares the address, and under-
 * disclosing is the failure this function exists to prevent.
 */
async function siblingsOf(
  db: SupabaseClient,
  guardianIds: string[],
  self: SendableAthlete,
): Promise<string[]> {
  if (guardianIds.length === 0) return [];

  const { data, error } = await db
    .from("player_guardians")
    .select("player_id")
    .in("guardian_id", guardianIds);
  if (error) throw new Error(`Shared-guardian lookup failed: ${error.message}`);

  const otherIds = Array.from(
    new Set(
      ((data ?? []) as { player_id: string }[])
        .map((r) => r.player_id)
        .filter((id) => id !== self.id),
    ),
  );
  if (otherIds.length === 0) return [];

  const { data: players, error: pErr } = await db
    .from("players")
    .select("first_name, last_name")
    .in("id", otherIds);
  if (pErr) throw new Error(`Shared-guardian lookup failed: ${pErr.message}`);

  const selfKey = normName(self.name);
  const seen = new Set<string>();
  const names: string[] = [];
  for (const p of (players ?? []) as {
    first_name: string | null;
    last_name: string | null;
  }[]) {
    const name = displayName(p.first_name, p.last_name);
    const key = normName(name);
    // Her own duplicate rows are not other people.
    if (!key || key === selfKey || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export interface AddressCorrection {
  from: string | null;
  to: string;
  /** What was written, for the log and for the operator. */
  label: string;
  alsoAffects: string[];
}

/**
 * Point this athlete's email at a new address, everywhere that decides where
 * her email goes: the source record the audience reads, and the placement
 * token, so a later confirmation files the right parent address.
 *
 * EVERY WRITE IS VERIFIED TO HAVE MATCHED A ROW. Supabase returns error: null
 * for an UPDATE that matched nothing, so without the .select() below a
 * correction against a record that had been merged or deleted since the roster
 * was read would report success and change nothing — the same silent-no-op
 * class of failure this module was built to close, arriving by a different door.
 *
 * The token is updated LAST and non-fatally: it is a mirror of the source
 * record, and issueToken will re-derive it from the source on the next pass
 * anyway. The source write is the one that must succeed, and it throws if it
 * does not — a resend that reports a corrected address it failed to save is
 * worse than one that refuses.
 */
export async function correctAddress(
  db: SupabaseClient,
  athlete: SendableAthlete,
  tokenId: string,
  next: string,
): Promise<AddressCorrection> {
  const source = await describeAddressSource(db, athlete);

  const table =
    source.kind === "registration"
      ? "tryout_registrations"
      : source.kind === "guardian"
        ? "guardians"
        : "players";

  const query =
    source.kind === "registration"
      ? db.from("tryout_registrations").update({ email: next }).eq("id", athlete.id)
      : source.kind === "guardian"
        ? db.from("guardians").update({ email: next }).in("id", source.guardianIds)
        : db.from("players").update({ fallback_email: next }).eq("id", athlete.id);

  const { data: updated, error } = await query.select("id");
  if (error) throw new Error(`Could not save the address: ${error.message}`);
  if (!updated || updated.length === 0) {
    throw new Error(
      `Could not save the address: no ${table} row matched, so nothing was ` +
        `changed. Her record may have been merged or removed since this screen ` +
        `loaded — reload the send screen and check her on the roster.`,
    );
  }

  const { error: tokenErr } = await db
    .from("placement_tokens")
    .update({ recipient_email: next })
    .eq("id", tokenId);
  if (tokenErr) {
    console.error("[placement/address] token mirror failed:", tokenErr);
  }

  return {
    from: athlete.email,
    to: next,
    label: source.label,
    alsoAffects: source.alsoAffects,
  };
}
