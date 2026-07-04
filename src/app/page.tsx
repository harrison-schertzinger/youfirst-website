import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import Hero from "@/components/home/Hero";
import ProofBand from "@/components/home/ProofBand";
import ProgramTiers from "@/components/home/ProgramTiers";
import SeasonSection from "@/components/home/SeasonSection";
import TournamentsSection from "@/components/home/TournamentsSection";
import GameGallery from "@/components/home/GameGallery";
import CollegeCommitments from "@/components/home/CollegeCommitments";
import TrainingBand from "@/components/home/TrainingBand";
import TryoutsNext from "@/components/home/TryoutsNext";
import FaqSection from "@/components/home/FaqSection";
import ContactSection from "@/components/home/ContactSection";
import FieldDivider from "@/components/graphics/FieldDivider";

export default function Home() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main>
        <Hero />
        <ProofBand />
        <FieldDivider />
        <ProgramTiers />
        <SeasonSection />
        <FieldDivider />
        <TournamentsSection />
        <GameGallery />
        <CollegeCommitments />
        <TrainingBand />
        <TryoutsNext />
        <FieldDivider />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
