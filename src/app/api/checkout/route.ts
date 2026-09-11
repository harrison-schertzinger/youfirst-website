import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS, TICKET_AMOUNTS_CENTS } from "@/lib/feesData";
import { readPortalSession } from "@/lib/portal-session";
import type { PlayerBalanceRow } from "@/lib/portal-balance";
import { CURRENT_SEASON, normalizeSeason, seasonsEqual } from "@/lib/season";

export const dynamic = "force-dynamic";

// The client supplies only WHICH thing it wants to pay — (playerId, category,
// intent). Every cent is re-derived here, server-side.
//
// Summer is charged as a dynamic amount taken from `player_balances()`: the
// same function the portal renders and the collections email quotes. It is NOT
// a fixed Stripe Price any more. The old code resolved one of three preset
// prices from `installments_total`, which for every live plan meant $1,850 —
// so a family who had already paid part of the season would have been billed
// the whole thing again.

type Category = "roster" | "summer";
type Intent = "full" | "half" | "quarter";

// ── TOURNIQUET · 2026-09-11 · REMOVE WITH THE SEASON BACKFILL ─────────
// Before fdd4771 deployed (2026-09-09 19:38 UTC) the Stripe webhook stamped
// every new payment `season: "2025-26"`. 14 summer payments ($17,775) and 22
// roster payments ($4,400) that were 2026-27 money landed on 2025-26. Until
// those rows are re-tagged, player_season_balances() reports these families
// $0 paid on 2026-27, and this route derives its charge from that figure — it
// has already billed one family twice. Refuse to open a checkout for these
// (player, category) pairs. A blocked family sees a message, not Stripe.
//
// Lists are keyed by players.id, taken from the live ledger on 2026-09-11
// (docs/plans/2026-09-11-season-data-audit.md). An unlisted player is not
// touched by this block at all.
const BLOCKED_SUMMER_PLAYER_IDS = new Set<string>([
  "1d40ecc4-0190-4d48-9bcb-67d3ea41200a", // Camryn Brown
  "6f0c4829-7216-4067-8203-3b8d45eeaae8", // Joan McLean
  "7041eed3-85b3-44e3-94fd-f7950a18b4dd", // Parker Murray
  "7f71feb8-0c6b-40a8-bad3-66b20597c14c", // Mia Lietzow
  "8a8732fa-dfa4-49a1-9d4d-65532f249784", // Cam Bahl
  "9329bd0a-844d-47da-943c-fd3e1a8717b9", // Audrey Noah (already paid twice)
  "94da9567-59b5-42d0-b1cc-aab19bbca11a", // Vivienne Likes
  "aade43b1-d9e9-4cfe-8458-91d3befec9e4", // Adele Cline
  "b454acec-6e02-46d7-9333-40732beda153", // Bri VanVleet
  "b483d0be-1d3b-4cee-8b83-7c4028cb15f5", // Charlotte Anne Gosdin
  "d5b8d178-eadc-48da-bc4c-ebf407aa2d0f", // Claire Thaman
  "d77fb78e-f010-4317-831d-cc23449a3b68", // Alden Long
  "d8303130-80d5-4011-8403-ccca85e9896d", // Emma Mutchler
]);
const BLOCKED_ROSTER_PLAYER_IDS = new Set<string>([
  "0d6b99b7-83bd-4621-b396-b74814fb19ca", // Lola DeBord
  "0ed3fe6b-0588-4f10-bc71-d5584ea3dc3c", // Annabel Dawes
  "1e946cc5-67bf-4149-aaa7-17c3f53df3e3", // Meredith Holdridge
  "1eab58e9-b4e9-4fdd-b5b9-d2f56957752c", // Ella McGrath
  "28206503-b33f-4bdc-b267-12bbb1d19d5b", // Stella Straubel
  "36e8db08-366e-4806-9b4e-01992f113426", // Grace Lanzillotta
  "4392f785-cd5f-48a4-be76-4ff96294fd3a", // Piper Glover
  "496bfdcd-faf4-4cbf-92b8-76a342bccc8b", // Eva Behrens
  "6b86b8d4-1bab-439f-bcb6-d0006631b219", // Elizabeth Vaughn
  "81949525-ff76-44a5-a9e9-54c6cf4b2fee", // Natalie Rogers
  "828e04f1-756a-4459-9526-6e13e570ca19", // Abigail Sansone
  "8a8732fa-dfa4-49a1-9d4d-65532f249784", // Cam Bahl
  "8d62de86-5b56-4de2-ba0f-fefbe118fcdc", // Nora Schuckman
  "aade43b1-d9e9-4cfe-8458-91d3befec9e4", // Adele Cline
  "ae4f7379-ecea-4c5f-977b-9310515f5a50", // Alyson Hackett
  "b65813f6-dd5a-4e5b-9c04-5a87f312e0b1", // Greta VonAllmen
  "bfa2f3be-cd4b-49e1-afe1-ad6fb983e1fb", // Kelsey Lorenzen
  "c27a8be0-c7d7-49e9-8e67-073f3a87c52d", // Reagan Foxbower
  "c9fa1d94-934c-4c3f-8d12-f92d23befaad", // Summer Graupe
  "d5b8d178-eadc-48da-bc4c-ebf407aa2d0f", // Claire Thaman
  "d77fb78e-f010-4317-831d-cc23449a3b68", // Alden Long
  "ff0ddf8e-a3bb-426c-a27e-3082c45b803c", // Lauren Kao
]);
const FALSE_BALANCE_MESSAGE =
  "We already have a payment on file for this athlete that is not showing here yet. Nothing is due right now — please do not pay again. We are correcting the balance. Questions: kathleen@youfirstlacrosse.com.";

function isFalseBalanceBlocked(playerId: string, category: Category): boolean {
  return category === "summer"
    ? BLOCKED_SUMMER_PLAYER_IDS.has(playerId)
    : BLOCKED_ROSTER_PLAYER_IDS.has(playerId);
}
// ── end tourniquet ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Payment system is being configured. Please contact kathleen@youfirstlacrosse.com.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { playerId, category, intent, season } = (body ?? {}) as {
    playerId?: string;
    category?: string;
    intent?: string;
    season?: string;
  };

  if (typeof playerId !== "string" || !playerId) {
    return NextResponse.json({ error: "Missing playerId." }, { status: 400 });
  }
  if (category !== "roster" && category !== "summer") {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const safeCategory: Category = category;

  // A stale page (or an older client) may not send an intent. Defaulting to
  // the full remaining balance is always the safe read — it can never charge
  // more than what is actually owed.
  const safeIntent: Intent =
    intent === "quarter" ? "quarter" : intent === "half" ? "half" : "full";

  // ── Authenticate: portal token (parents are NOT on Supabase Auth) ──
  const portalSession = readPortalSession(request);
  if (!portalSession) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // TOURNIQUET (see top of file). Before any balance is read or any Stripe
  // object is created. 409 so FeesPanel renders the message inline.
  if (isFalseBalanceBlocked(playerId, safeCategory)) {
    console.warn("[checkout] false-balance block refused checkout", {
      playerId,
      category: safeCategory,
    });
    return NextResponse.json({ error: FALSE_BALANCE_MESSAGE }, { status: 409 });
  }

  // Any signed-in parent may pay for any player — intentionally not gated
  // (divorced/step-parent families etc.). The amount is still re-derived
  // server-side below, so the payer can never influence what is charged.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Derive the amount server-side ──────────────────────────────────
  let lineItem: {
    price?: string;
    price_data?: {
      currency: string;
      unit_amount: number;
      product_data: { name: string };
    };
    quantity: number;
  };
  let ticketId: string;
  let amountCents: number;
  let ledgerSeason = normalizeSeason(season) ?? CURRENT_SEASON;

  if (safeCategory === "roster") {
    // Fixed $200, settled by money received — for THIS season only.
    // Last year's roster payment must not close this year's fee.
    const { data: rosterPayments, error: rosterErr } = await admin
      .from("payments")
      .select("amount_cents, season")
      .eq("player_id", playerId)
      .eq("payment_category", "roster")
      .eq("status", "completed");

    if (rosterErr) {
      console.error("[checkout] roster payments lookup failed:", rosterErr);
      return NextResponse.json(
        { error: "Couldn’t start checkout." },
        { status: 500 },
      );
    }

    const paidCents = (rosterPayments ?? [])
      .filter((p) => seasonsEqual(p.season, ledgerSeason))
      .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
    if (paidCents >= TICKET_AMOUNTS_CENTS.roster) {
      return NextResponse.json(
        { error: "Roster fee already paid." },
        { status: 409 },
      );
    }

    amountCents = TICKET_AMOUNTS_CENTS.roster;
    lineItem = { price: STRIPE_PRICE_IDS.roster, quantity: 1 };
    ticketId = `${playerId}-roster-${ledgerSeason}`;
  } else {
    // ── Summer: the amount IS the balance. One source of truth. ──────
    //
    // A SEASON MAY BE NAMED, and it matters. The portal shows a tab per season
    // and a family with an unpaid 2025-26 balance can pay it from that tab.
    // player_balances() returns only the MOST RECENT plan, so without this a
    // parent settling last season's $154 would have been charged this season's
    // $1,850. The season is validated against her own plans below — it selects
    // which of her balances to read, and can never introduce one.
    const rpc = season
      ? await admin.rpc("player_season_balances", { p_player_id: playerId })
      : await admin.rpc("player_balances", { p_player_id: playerId });

    if (rpc.error) {
      console.error("[checkout] balance lookup failed:", rpc.error);
      return NextResponse.json(
        { error: "Couldn’t start checkout." },
        { status: 500 },
      );
    }

    const rows = (rpc.data as PlayerBalanceRow[] | null) ?? [];
    const balance = season
      ? rows.find((r) => seasonsEqual(r.season, season))
      : rows[0];

    if (!balance) {
      return NextResponse.json(
        { error: "No summer payment plan for this player." },
        { status: 404 },
      );
    }

    if (balance.remaining_cents <= 0) {
      return NextResponse.json(
        { error: "Summer tuition is already settled." },
        { status: 409 },
      );
    }

    ledgerSeason = normalizeSeason(balance.season) ?? ledgerSeason;

    if (safeIntent === "full") {
      amountCents = balance.remaining_cents;
      ticketId = `${playerId}-summer-${balance.season ?? "current"}-balance`;
    } else {
      // An installment is a fraction of what the SEASON costs, not of what is
      // left — otherwise "pay a quarter" would mean a different, shrinking
      // number every time a family came back, and four payments would never
      // actually clear the balance.
      //
      // Derived from charged_cents rather than the hardcoded 46250 that
      // player_balances() returns. That constant is a quarter of $1,850 and is
      // correct only while every family pays exactly $1,850 — which stops being
      // true the moment 2026-27 fees vary by age. Verified against live data
      // before the change: all 59 plans are charged $1,850, so the derived
      // quarter is $462.50 for every one of them and no existing family's
      // amount moves.
      const divisor = safeIntent === "half" ? 2 : 4;
      const installment = Math.round(balance.charged_cents / divisor);

      // If an installment would settle the balance anyway, it is not an
      // installment — refuse rather than dress a full payment up as a plan.
      if (installment <= 0 || installment >= balance.remaining_cents) {
        return NextResponse.json(
          {
            error:
              "That payment option isn’t available on this balance — pay the remaining balance instead.",
          },
          { status: 409 },
        );
      }
      amountCents = installment;
      ticketId = `${playerId}-summer-${balance.season ?? "current"}-${safeIntent}`;
    }

    // Belt and braces: never let a computed amount exceed what is owed, and
    // never hand Stripe a non-positive amount.
    if (amountCents <= 0 || amountCents > balance.remaining_cents) {
      console.error("[checkout] refusing implausible summer amount", {
        playerId,
        amountCents,
        remaining: balance.remaining_cents,
      });
      return NextResponse.json(
        { error: "Couldn’t start checkout." },
        { status: 500 },
      );
    }

    lineItem = {
      price_data: {
        currency: "usd",
        unit_amount: amountCents,
        product_data: {
          name:
            safeIntent === "quarter"
              ? "You. First — Summer Tuition (partial payment)"
              : "You. First — Summer Tuition (remaining balance)",
        },
      },
      quantity: 1,
    };
  }

  // ── Look up player name for the receipt ────────────────────────────
  const { data: player } = await admin
    .from("players")
    .select("first_name, last_name")
    .eq("id", playerId)
    .single();

  const playerName = player
    ? `${player.first_name} ${player.last_name}`
    : "Player";

  // ── Create Stripe Checkout Session ─────────────────────────────────
  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      customer_email: portalSession.email || undefined,
      // Stripe's default is 24h. A session holds the amount that was owed when
      // it was created, so a long-lived one can be completed after a payment
      // has already reduced the balance. One hour is long enough to finish
      // checkout and short enough that a forgotten tab expires. (Stripe allows
      // 30 minutes to 24 hours.)
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      metadata: {
        player_id: playerId,
        guardian_id: portalSession.guardianId,
        ticket_id: ticketId,
        category: safeCategory,
        player_name: playerName,
        // Recorded for reconciliation: what we believed was owed at the
        // moment this session was created.
        amount_cents: String(amountCents),
        intent: safeCategory === "summer" ? safeIntent : "full",
        // The season this payment belongs to. The webhook used to hardcode
        // 2025-26, which credited last year with this year's money.
        season: ledgerSeason,
      },
      success_url: `${origin}/portal?paid=${encodeURIComponent(ticketId)}`,
      cancel_url: `${origin}/portal?canceled=${encodeURIComponent(ticketId)}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session create failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't reach the payment system. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
