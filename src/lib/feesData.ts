// You. First Elite Lacrosse — Fee Structure
// ─────────────────────────────────────────
// Edit prices here. Everything flows from this file.

// ─── Stripe SKU Catalog (portal ticket checkout) ─────────────────────────────

export const STRIPE_PRICE_IDS = {
  roster: "price_1TMcrE8i54MD6kpKyP7QHU2J",
  fall_tournament: "price_1TMcrJ8i54MD6kpKudLe7im9",
  summer_full: "price_1TMcrK8i54MD6kpKs4B0jE5c",
  summer_half: "price_1TMcrN8i54MD6kpKizRM0Mkx",
  summer_quarter: "price_1TMcrO8i54MD6kpKlqmJjUNC",
} as const;

export const TICKET_AMOUNTS_CENTS = {
  roster: 20000,
  fall_tournament: 30000,
  summer_full: 185000,
  summer_half: 92500,
  summer_quarter: 46250,
} as const;

export const TICKET_AMOUNTS_DOLLARS = {
  roster: 200,
  fall_tournament: 300,
  summer_full: 1850,
  summer_half: 925,
  summer_quarter: 462.5,
} as const;

export const TICKET_LABELS = {
  roster: "Roster Fee",
  fall_tournament: "Fall Tournament",
  summer_full: "Summer Tuition",
  summer_half: "Summer Tuition",
  summer_quarter: "Summer Tuition",
} as const;
