// You. First Elite Lacrosse — Fee Structure
// ─────────────────────────────────────────
// Edit prices here. Everything flows from this file.

export interface PaymentPlan {
  id: string;
  name: string;
  badge?: string;
  badgeColor: "green" | "blue" | "none";
  /** The amount per payment */
  perPayment: number;
  /** Number of payments (1 for lump sum) */
  payments: number;
  /** Total season cost */
  total: number;
  /** Short description shown under the price */
  schedule: string;
  /** Savings callout (e.g. "Save $350") — shown on card if set */
  savings?: string;
  /** If true, this card is visually elevated */
  featured: boolean;
  /** Stripe Price ID — set when Stripe is configured */
  stripePriceId: string;
}

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: "full-season",
    name: "Full Season",
    badge: "Best Value",
    badgeColor: "green",
    perPayment: 3400,
    payments: 1,
    total: 3400,
    schedule: "One payment, done",
    savings: "Save $350 vs monthly",
    featured: false,
    stripePriceId: "",
  },
  {
    id: "quarterly",
    name: "Quarterly Plan",
    badge: "Most Popular",
    badgeColor: "blue",
    perPayment: 925,
    payments: 4,
    total: 3700,
    schedule: "June 1, Sept 1, Dec 1, March 1",
    featured: true,
    stripePriceId: "",
  },
  {
    id: "monthly",
    name: "Monthly Installments",
    badgeColor: "none",
    perPayment: 375,
    payments: 10,
    total: 3750,
    schedule: "1st of each month, June – March",
    featured: false,
    stripePriceId: "",
  },
];

export const INCLUDED_FEATURES = [
  "Summer & fall tournament entry",
  "Year-round training at The Barn",
  "IMCLA recruiting profile",
  "Team gear package",
  "College recruiting support",
  "Showcase & camp access",
];

export interface IncludedCard {
  title: string;
  description: string;
  icon: string; // SVG path data for a simple icon
}

export const WHATS_INCLUDED: IncludedCard[] = [
  {
    title: "Tournament Entry",
    description:
      "Summer and fall tournament entry fees are covered. Show up, compete, get seen — no extra cost.",
    icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  {
    title: "Year-Round Training",
    description:
      "Access to elite coaching and training sessions at The Barn. Offseason, preseason, in-season — we never stop building.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "Recruiting Support",
    description:
      "IMCLA recruiting profile, film review, coach connections, and guidance through the entire college recruiting process.",
    icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  },
  {
    title: "Team Gear Package",
    description:
      "Full team gear package included — jerseys, shorts, and practice gear so your athlete is ready from day one.",
    icon: "M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.56 6.28l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-11.44z",
  },
  {
    title: "Showcase Access",
    description:
      "Priority access to showcases and elite camps where college coaches are actively recruiting.",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  },
  {
    title: "Personal Development",
    description:
      "Powered by You.Prjct — mental performance, leadership development, and the habits that make elite athletes.",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
];

export interface FAQItem {
  question: string;
  answer: string;
}

export const PAYMENT_FAQ: FAQItem[] = [
  {
    question: "When are payments due?",
    answer:
      "For the Full Season plan, payment is due upon registration. Quarterly payments are due June 1, September 1, December 1, and March 1. Monthly installments are due on the 1st of each month from June through March. You'll receive an email reminder before each payment.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure Stripe payment platform. Bank transfers and ACH payments are also available for qualifying plans.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "We understand that circumstances change. If you need to withdraw before the season begins, we offer a full refund minus a $250 administrative fee. After the season starts, refunds are prorated based on the remaining schedule. Please contact Kathleen directly to discuss your situation — we'll work with you.",
  },
  {
    question: "Are there sibling discounts?",
    answer:
      "Yes! We offer a 10% discount for each additional sibling enrolled in the same season. Contact kathleen@youfirstelitelacrosseclub.com to set up your family discount before registering.",
  },
  {
    question: "What if I need a custom payment arrangement?",
    answer:
      "We believe finances should never prevent a dedicated athlete from competing. If none of the standard plans work for your family, reach out to kathleen@youfirstelitelacrosseclub.com and we'll create a payment schedule that does. No judgment, just solutions.",
  },
];
