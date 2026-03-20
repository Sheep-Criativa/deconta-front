import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import CtaFormSection from "../components/CtaFormSection";
import Footer from "../components/Footer";
import { useEffect } from "react";

export default function Landing() {
  // Use a smooth scroll effect if desired, or just native
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-[#00CC73] selection:text-white overflow-hidden font-sans text-zinc-900">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CtaFormSection />
      </main>
      <Footer />
    </div>
  );
}
