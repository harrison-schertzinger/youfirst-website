import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import { cookies } from "next/headers";
import PortalContent from "@/components/portal/PortalContent";
import PaymentBanner from "@/components/portal/PaymentBanner";
import { PORTAL_COOKIE_NAME, verifyPortalToken } from "@/lib/portal-session";

export const metadata: Metadata = {
  title: "Player Portal | YOU. FIRST Elite Lacrosse",
  description: "View your player's profile, payment history, and account details.",
};

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const store = await cookies();
  const session = verifyPortalToken(store.get(PORTAL_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/fees");
  }

  const params = await searchParams;
  const paidTicket = typeof params.paid === "string" ? params.paid : null;
  const canceledTicket = typeof params.canceled === "string" ? params.canceled : null;

  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main className="pt-20 pb-16 min-h-screen bg-background">
        {(paidTicket || canceledTicket) && (
          <PaymentBanner paid={paidTicket} canceled={canceledTicket} />
        )}
        <PortalContent />
      </main>
      <Footer />
    </>
  );
}
