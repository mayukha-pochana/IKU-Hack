// OWNER: Member 1
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { Monitoring } from "@/components/landing/Monitoring";
import { Accessibility } from "@/components/landing/Accessibility";
import { CallToAction } from "@/components/landing/CallToAction";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-50 focus:block focus:bg-violet focus:px-4 focus:py-3 focus:text-violet-on focus:font-semibold">Skip to content</a>
      <Navbar />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Benefits />
        <Monitoring />
        <Accessibility />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
