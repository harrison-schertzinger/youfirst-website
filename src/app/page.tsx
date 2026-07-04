import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import Hero from "@/components/home/Hero";
import Mission from "@/components/home/Mission";
import CompetitiveEdge from "@/components/home/CompetitiveEdge";
import CollegeCommitments from "@/components/home/CollegeCommitments";
import AllAmerican from "@/components/home/AllAmerican";
import Philosophy from "@/components/home/Philosophy";
import PhotoStrip from "@/components/home/PhotoStrip";
import PlayerJourney from "@/components/home/PlayerJourney";
import CallToAction from "@/components/home/CallToAction";

export default function Home() {
  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main>
        <Hero />
        <Mission />
        <CompetitiveEdge />
        <CollegeCommitments />
        <Philosophy />
        <AllAmerican />
        <PhotoStrip />
        <PlayerJourney />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
