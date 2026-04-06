import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import PortalContent from "@/components/portal/PortalContent";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Player Portal | YOU. FIRST Elite Lacrosse",
  description: "View your player's profile, payment history, and account details.",
};

export default async function PortalPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/fees");
  }

  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main className="pt-20 pb-16 min-h-screen bg-background">
        <PortalContent userEmail={user.email!} userId={user.id} />
      </main>
      <Footer />
    </>
  );
}
