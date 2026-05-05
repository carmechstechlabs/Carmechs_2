import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Shield, Clock, Star, Loader2, CheckCircle, Activity, Zap, Play } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useConfig } from "../hooks/useConfig";
import BookingSystem from "./BookingSystem";

export default function Hero() {
  const { config } = useConfig();
  const [showBooking, setShowBooking] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-soft pt-32 pb-20">
      {/* Dynamic Background Image */}
      {config.heroImage && (
        <div className="absolute inset-0 z-0">
          <img 
            src={config.heroImage} 
            alt="" 
            className="w-full h-full object-cover opacity-10 grayscale hover:grayscale-0 transition-all duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-soft via-transparent to-bg-soft" />
        </div>
      )}

      {/* Playful Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-2 rounded-full mb-8 border border-primary/10">
              <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest">Fastest Service in Town</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-ink leading-[1.1] mb-8 font-display tracking-tight">
              {config.heroTitle || "CAR CARE"} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                {config.heroSubtitle || "SERVICE REIMAGINED"}
              </span>
            </h1>

            <p className="text-xl text-text-muted max-w-lg mb-12 font-medium leading-relaxed">
              Experience the future of automotive care with transparent pricing, certified experts, and a touch of magic. Your car deserves the best, and so do you!
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-stretch sm:items-center">
               <motion.button 
                  onClick={() => setShowBooking(true)}
                  animate={{ 
                    boxShadow: ["0 20px 40px rgba(79, 70, 229, 0.2)", "0 20px 60px rgba(79, 70, 229, 0.4)", "0 20px 40px rgba(79, 70, 229, 0.2)"],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="bg-primary text-white h-[74px] px-12 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/40 group relative overflow-hidden"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <Play size={20} fill="currentColor" className="group-hover:rotate-[360deg] transition-transform duration-700" />
                  BOOK NOW
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
               </motion.button>
               
               <button 
                  type="button"
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-white text-ink h-[74px] px-10 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-95 border-4 border-slate-100 shadow-xl shadow-slate-200/20"
               >
                  Connect Crew
               </button>
            </div>

            <div className="flex items-center gap-6 mt-16">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white overflow-hidden shadow-lg">
                    <img src={`https://picsum.photos/seed/happy-user-${i}/100/100`} alt="" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-bold text-ink">
                <div className="flex text-warning mb-1">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill="currentColor" />)}
                </div>
                5,000+ Happy Drivers
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-6 relative z-10">
               <div className="bento-card bg-primary-soft hover:bg-primary hover:text-white group">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                     <Shield size={24} />
                  </div>
                  <h3 className="text-2xl font-black mb-2 uppercase">Safe</h3>
                  <p className="text-sm opacity-60">Full protection warranty on every single task.</p>
               </div>
               <div className="bento-card translate-y-12 bg-secondary-soft hover:bg-secondary hover:text-white group">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-secondary mb-6 shadow-lg shadow-secondary/20 group-hover:-rotate-12 transition-transform">
                     <Clock size={24} />
                  </div>
                  <h3 className="text-2xl font-black mb-2 uppercase">Fast</h3>
                  <p className="text-sm opacity-60">Doorstep service in under 90 minutes.</p>
               </div>
               <div className="bento-card -translate-y-6 bg-accent-soft hover:bg-accent hover:text-white group">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent mb-6 shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                     <Star size={24} />
                  </div>
                  <h3 className="text-2xl font-black mb-2 uppercase">Expert</h3>
                  <p className="text-sm opacity-60">Certified pros with years of experience.</p>
               </div>
               <div className="bento-card translate-y-6 flex flex-col items-center justify-center bg-warning/10 border-warning/20">
                  <div className="text-4xl font-black text-warning mb-2">4.9</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-warning/60 text-center">Average Rating across India</div>
               </div>
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] z-0 pointer-events-none opacity-20">
               <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,primary,transparent)] animate-spin-slow" />
            </div>
          </motion.div>
        </div>
      </div>
      <AnimatePresence>
        {showBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBooking(false)}
              className="absolute inset-0 bg-ink/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: 50, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.9, opacity: 0 }}
              className="w-full flex justify-center"
            >
              <BookingSystem onClose={() => setShowBooking(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

