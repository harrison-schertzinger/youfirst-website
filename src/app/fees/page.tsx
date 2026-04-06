import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ParentPortal from "@/components/fees/ParentPortal";

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

export default function FeesPage() {
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
