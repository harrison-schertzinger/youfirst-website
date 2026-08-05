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
 *   players                →  the linked guardian currently supplying the
 *                             address, else players.fallback_email
 *
 * THE SOURCE IS IDENTIFIED BY MATCHING THE CURRENT ADDRESS, never by guessing
 * which guardian is "primary". src/lib/rosters/data.ts resolves a player's email
 * as `guardian?.email ?? player.fallback_email`; if this module picked a
 * different guardian than that expression does, the write would appear to
 * succeed and change nothing. Matching on the value that is actually in effect
 * cannot miss.
 *
 * A guardian row can be shared with a sibling. That is disclosed to the
 * operator rather than prevented — a parent who changed their email changed it
 * for both daughters — but it is never done silently.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { usableEmail, type SendableAthlete } from "@/lib/placement/audience";

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

interface GuardianLink {
  guardian_id: string;
  is_primary: boolean | null;
}

/**
 * Which record supplies this athlete's address today, and who else reads it.
 * Pure read — nothing here writes.
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

  const guardianRows = (guardians ?? []) as {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  }[];

  // The guardian rows CURRENTLY SUPPLYING the address — matched on the value
  // the audience is using, so the write cannot land on a row nobody reads.
  const current = athlete.email;
  const supplying = current
    ? guardianRows.filter((g) => usableEmail(g.email) === current)
    : [];

  if (supplying.length === 0) {
    // Either she has no address at all, or it comes from the player record
    // because no guardian has one. Writing fallback_email is only effective in
    // the second case — and in the first there is nothing else to write.
    const anyGuardianHasEmail = guardianRows.some((g) => usableEmail(g.email));
    if (!anyGuardianHasEmail) {
      return {
        kind: "player_fallback",
        label: "her player record",
        guardianIds: [],
        alsoAffects: [],
      };
    }
    // A guardian has an address but it is not the one in play. Correct every
    // linked guardian rather than leave a stale row to win the next lookup.
    const ids = guardianRows.filter((g) => usableEmail(g.email)).map((g) => g.id);
    return {
      kind: "guardian",
      label: "her guardian record",
      guardianIds: ids,
      alsoAffects: await siblingsOf(db, ids, athlete.id),
    };
  }

  const ids = supplying.map((g) => g.id);
  const name = supplying[0];
  const who = [name.first_name, name.last_name].filter(Boolean).join(" ").trim();
  return {
    kind: "guardian",
    label: who ? `the guardian record for ${who}` : "her guardian record",
    guardianIds: ids,
    alsoAffects: await siblingsOf(db, ids, athlete.id),
  };
}

/** Other athletes linked to the same guardian rows. Named, so nothing is a surprise. */
async function siblingsOf(
  db: SupabaseClient,
  guardianIds: string[],
  selfPlayerId: string,
): Promise<string[]> {
  if (guardianIds.length === 0) return [];
  const { data, error } = await db
    .from("player_guardians")
    .select("player_id")
    .in("guardian_id", guardianIds);
  if (error) return [];

  const otherIds = Array.from(
    new Set(
      ((data ?? []) as { player_id: string }[])
        .map((r) => r.player_id)
        .filter((id) => id !== selfPlayerId),
    ),
  );
  if (otherIds.length === 0) return [];

  const { data: players } = await db
    .from("players")
    .select("first_name, last_name")
    .in("id", otherIds);
  return ((players ?? []) as { first_name: string; last_name: string }[]).map(
    (p) => `${p.first_name} ${p.last_name}`.trim(),
  );
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

  if (source.kind === "registration") {
    const { error } = await db
      .from("tryout_registrations")
      .update({ email: next })
      .eq("id", athlete.id);
    if (error) throw new Error(`Could not save the address: ${error.message}`);
  } else if (source.kind === "guardian") {
    const { error } = await db
      .from("guardians")
      .update({ email: next })
      .in("id", source.guardianIds);
    if (error) throw new Error(`Could not save the address: ${error.message}`);
  } else {
    const { error } = await db
      .from("players")
      .update({ fallback_email: next })
      .eq("id", athlete.id);
    if (error) throw new Error(`Could not save the address: ${error.message}`);
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
