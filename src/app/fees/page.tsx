import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import PricingCards from "@/components/fees/PricingCards";
import WhatsIncluded from "@/components/fees/WhatsIncluded";
import PaymentFAQ from "@/components/fees/PaymentFAQ";
import TrustBadge from "@/components/fees/TrustBadge";
import FeesHero from "@/components/fees/FeesHero";
import CheckoutToast from "@/components/fees/CheckoutToast";

export const metadata: Metadata = {
  title: "Team Fees & Payment Plans | YOU. FIRST Elite Lacrosse",
  description:
    "Transparent pricing for YOU. FIRST Elite Lacrosse. Full season, quarterly, and monthly payment plans. Tournament entry, year-round training, recruiting support, and gear included.",
  openGraph: {
    title: "Team Fees & Payment Plans | YOU. FIRST Elite Lacrosse",
    description:
      "Invest in your daughter's development. Three flexible payment plans — same elite experience.",
  },
};

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main>
        {params.success && <CheckoutToast type="success" />}
        {params.canceled && <CheckoutToast type="canceled" />}
        <FeesHero />
        <PricingCards />
        <WhatsIncluded />
        <PaymentFAQ />
        <TrustBadge />
      </main>
      <Footer />
    </>
  );
}
