import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import Hero from "@/components/home/Hero";
import ProofBand from "@/components/home/ProofBand";
import ProgramTiers from "@/components/home/ProgramTiers";
import SeasonSection from "@/components/home/SeasonSection";
import TournamentsSection from "@/components/home/TournamentsSection";
import CollegeCommitments from "@/components/home/CollegeCommitments";
import PhotoStrip from "@/components/home/PhotoStrip";
import TryoutsNext from "@/components/home/TryoutsNext";
import FaqSection from "@/components/home/FaqSection";
import AskAnything from "@/components/home/AskAnything";
import ContactSection from "@/components/home/ContactSection";

export default function Home() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar initialTheme="light" />
      <main>
        <Hero />
        <ProofBand />
        <ProgramTiers />
        <SeasonSection />
        <TournamentsSection />
        <CollegeCommitments />
        <PhotoStrip />
        <TryoutsNext />
        <FaqSection />
        <AskAnything />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
