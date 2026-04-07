import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ParentPortal from "@/components/fees/ParentPortal";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "My Account | YOU. FIRST Elite Lacrosse",
  description:
    "Sign in to your YOU. FIRST parent portal. View payment history, account balance, and manage your family's membership.",
  openGraph: {
    title: "My Account | YOU. FIRST Elite Lacrosse",
    description:
      "Sign in to your parent portal to view payment history and account balance.",
  },
};

export default async function FeesPage() {
  // If the parent is already signed in, jump them straight to the portal
  // instead of showing the sign-in form again.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/portal");
  }

  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main>
        <ParentPortal />
      </main>
      <Footer />
    </>
  );
}
