import type { Metadata } from "next";
import LevelsPage from "../levels/page";

// /youth — the clean shareable address for the youth landing page.
// Renders the exact same page as /levels so there is one source of truth.
export const metadata: Metadata = {
  title: "Youth Lacrosse | YOU. FIRST Elite Lacrosse",
  description:
    "YOU. FIRST youth teams, classes 2032 to 2034. The most development-focused club in the area. Tryouts July 11 at the Cincinnati Lacrosse Academy.",
};

export default LevelsPage;
