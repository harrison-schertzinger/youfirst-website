import type { Metadata } from "next";
import LevelsPage from "../levels/page";

// /youth — the clean shareable address for the youth landing page.
// Renders the exact same page as /levels so there is one source of truth.
export const metadata: Metadata = {
  title: "Youth Lacrosse | YOU. FIRST Elite Lacrosse",
  description:
    "YOU. FIRST development teams, classes 2032 & 2033 — 2034s who are ready can play up. The most development-focused club in the area. Free evaluations any morning through August 7 at the Cincinnati Lacrosse Academy.",
};

export default LevelsPage;
