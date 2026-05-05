import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useConfig } from "../hooks/useConfig";

export default function NotFound() {
  const { config } = useConfig();

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-white font-sans selection:bg-red-600">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full text-center"
      >
        <div className="relative mb-12">
          <motion.h1 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[15rem] font-black leading-none tracking-tighter opacity-10 blur-sm select-none"
            style={{ color: config.primaryColor }}
          >
            404
          </motion.h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="p-8 rounded-[2rem] shadow-2xl rotate-3 flex items-center justify-center"
              style={{ backgroundColor: config.primaryColor, boxShadow: `0 20px 50px -10px ${config.primaryColor}40` }}
            >
              <AlertCircle size={80} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <h2 className="text-4xl font-black mb-6 uppercase italic tracking-tighter">Coordinates Lost in Transit</h2>
        <p className="text-neutral-400 text-lg mb-12 font-medium leading-relaxed">
          The tactical resource you are looking for has been decommissioned or moved to a classified location. 
          Please return to the main operations hub.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-200 transition-all active:scale-95"
          >
            <Home size={20} />
            Back to Base
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-3 bg-white/5 border-2 border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
            Previous Node
          </button>
        </div>

        <div className="mt-20 pt-10 border-t border-white/5 flex justify-center gap-12 opacity-40">
          <div className="text-[10px] font-black uppercase tracking-[0.3em]">Code: ERR_PATH_NULL</div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Status: Terminal</div>
        </div>
      </motion.div>
    </div>
  );
}
