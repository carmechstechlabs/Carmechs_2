import React, { useEffect } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Services from "../components/Services";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
import WhatsAppButton from "../components/WhatsAppButton";
import CartOverlay from "../components/CartOverlay";
import { useConfig } from "../hooks/useConfig";

import Features from "../components/Features";

export default function Home() {
  const { config } = useConfig();

  useEffect(() => {
    // Update Document Title
    if (config.seoTitle) {
      document.title = config.seoTitle;
    } else {
      document.title = config.logoText ? `${config.logoText} | Premium Car Service` : "CarMechs | Premium Doorstep Car Service";
    }
    
    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    if (config.seoDescription) {
      metaDesc.setAttribute('content', config.seoDescription);
    } else {
      metaDesc.setAttribute('content', "Professional doorstep car maintenance and repair services.");
    }

    // Update Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    if (config.seoKeywords) {
      metaKeywords.setAttribute('content', config.seoKeywords);
    }
  }, [config]);

  return (
    <div className="min-h-screen bg-white text-ink font-sans selection:bg-primary selection:text-white">
      <Navbar />
      <Hero />
      <Features />
      <Services />
      <HowItWorks />
      <Testimonials />
      <Contact />
      <Footer />
      <WhatsAppButton />
      <CartOverlay />
    </div>
  );
}
