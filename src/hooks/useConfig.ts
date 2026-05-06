import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NavLink {
  name: string;
  href: string;
  isPage?: boolean;
}

export interface FooterLink {
  name: string;
  href: string;
}

export interface UIConfig {
  primaryColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  logoText: string;
  footerText: string;
  navLinks: NavLink[];
  footerQuickLinks: FooterLink[];
  footerLegalLinks: FooterLink[];
  logoUrl?: string;
  cashOnServiceEnabled: boolean;
  fontFamily: string;
  baseFontSize: number;
  fontColor?: string;
  headingColor?: string;
}

const DEFAULT_CONFIG: UIConfig = {
  primaryColor: "#6366F1",
  heroTitle: "EXPERT MECHANICS",
  heroSubtitle: "HONEST PRICING",
  heroImage: "https://images.unsplash.com/photo-1486006396113-c7b3497d3361?auto=format&fit=crop&q=80&w=1920&h=1080",
  supportEmail: "assist@carmechs.in",
  supportPhone: "9831231431",
  whatsappNumber: "9831231431",
  whatsappEnabled: true,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  logoText: "CARMECHS",
  footerText: "Premium doorstep car services.",
  navLinks: [
    { name: "Services", href: "#services" },
    { name: "Process", href: "#how-it-works" },
    { name: "Support Hub", href: "/support", isPage: true },
    { name: "Contact", href: "#contact" },
  ],
  footerQuickLinks: [
    { name: "Our Home", href: "/" },
    { name: "Services", href: "#services" },
    { name: "How it Works", href: "#how-it-works" },
  ],
  footerLegalLinks: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Use", href: "/terms" },
  ],
  logoUrl: "",
  cashOnServiceEnabled: true,
  fontFamily: "Inter",
  baseFontSize: 16,
  fontColor: "#1e293b",
  headingColor: "#0f172a",
};

export function useConfig() {
  const [config, setConfig] = useState<UIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "ui"), (d) => {
      if (d.exists()) {
        const data = d.data() as Partial<UIConfig>;
        setConfig({ ...DEFAULT_CONFIG, ...data });
        
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--color-primary', data.primaryColor);
        }
        if (data.fontFamily) {
          document.body.style.fontFamily = data.fontFamily;
        }
        if (data.baseFontSize) {
          document.documentElement.style.fontSize = `${data.baseFontSize}px`;
        }
        if (data.fontColor) {
          document.documentElement.style.setProperty('--color-text-main', data.fontColor);
          document.body.style.color = data.fontColor;
        }
        if (data.headingColor) {
          document.documentElement.style.setProperty('--color-heading', data.headingColor);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Config fetch error:", err);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { config, loading };
}
