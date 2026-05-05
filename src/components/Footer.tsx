import React from "react";
import { Link } from "react-router-dom";
import { Wrench, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { useConfig } from "../hooks/useConfig";

export default function Footer() {
  const { config } = useConfig();

  return (
    <footer className="bg-white text-ink pt-32 pb-16 overflow-hidden relative border-t-4 border-slate-50">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-5 gap-16 pb-20 border-b-2 border-slate-50">
          <div className="lg:col-span-2 space-y-10">
            <Link to="/" className="flex items-center gap-3 group">
              {config.logoUrl ? (
                <img 
                  src={config.logoUrl} 
                  alt={config.logoText || "Logo"} 
                  className="h-12 w-auto object-contain transition-transform group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                  <Wrench size={24} />
                </div>
              )}
              <span className="text-3xl font-black tracking-tight text-ink">
                {config.logoText || "CarMechs"}
              </span>
            </Link>
            
            <p className="text-lg text-text-muted max-w-sm font-medium leading-relaxed">
              {config.footerText || "We're making car care fun and easy for everyone in India. Simple, honest, and expert-led."}
            </p>

            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] uppercase font-black text-primary tracking-widest mb-10">
               Quick Links
            </h5>
            <ul className="space-y-5">
              {(config.footerQuickLinks || []).map((item: any) => (
                <li key={item.name}>
                  {item.href.startsWith('http') || item.href.startsWith('#') ? (
                    <a href={item.href} className="text-sm font-bold text-slate-400 hover:text-primary transition-all flex items-center gap-2 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary scale-0 group-hover:scale-100 transition-transform" />
                      {item.name}
                    </a>
                  ) : (
                    <Link to={item.href} className="text-sm font-bold text-slate-400 hover:text-primary transition-all flex items-center gap-2 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary scale-0 group-hover:scale-100 transition-transform" />
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
             <h5 className="text-[11px] uppercase font-black text-secondary tracking-widest mb-10">Legal Stuff</h5>
            <ul className="space-y-5">
              {(config.footerLegalLinks || []).map((item: any) => (
                <li key={item.name}>
                   {item.href.startsWith('http') || item.href.startsWith('#') ? (
                     <a href={item.href} className="text-sm font-bold text-slate-400 hover:text-secondary transition-all">
                      {item.name}
                    </a>
                   ) : (
                     <Link to={item.href} className="text-sm font-bold text-slate-400 hover:text-secondary transition-all">
                      {item.name}
                    </Link>
                   )}
                </li>
              ))}
            </ul>
          </div>

          <div className="bento-card p-10 bg-slate-50 lg:self-start">
             <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-6">Our Hubs</div>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <div className="text-sm font-bold text-ink">Kolkata</div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <div className="text-sm font-bold text-ink">Howrah</div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-slate-300" />
                   <div className="text-sm font-bold text-slate-400">Jharkhand (Soon!)</div>
                </div>
             </div>
          </div>
        </div>

        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xs font-bold text-slate-400 flex items-center gap-4">
            <span>© {new Date().getFullYear()} CarMechs. All rights reserved.</span>
            <Link to="/admin" className="hover:text-primary transition-colors uppercase tracking-widest text-[10px] font-black">Admin Portal</Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-pink-500 bg-pink-50 px-4 py-2 rounded-full">
            Made with lots of car love ❤️
          </div>
        </div>
      </div>
    </footer>
  );
}
