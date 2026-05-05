import React, { useState } from "react";
import { ShoppingCart, X, Trash2, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../hooks/useCart";
import { cn } from "../lib/utils";

export default function CartOverlay() {
  const { items, removeFromCart, total, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      {/* Floating Badge */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-32 right-10 z-[100] bg-slate-900 text-white p-5 rounded-full shadow-2xl flex items-center gap-4 group border-4 border-white"
      >
        <div className="relative">
          <ShoppingCart size={28} />
          <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {items.length}
          </span>
        </div>
        <div className="hidden group-hover:block transition-all">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Queue Total</div>
          <div className="text-lg font-black italic leading-none">₹{total}</div>
        </div>
      </motion.button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Service Manifest</div>
                  <h3 className="text-2xl font-black text-ink uppercase italic tracking-tighter">Your Selection</h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-ink transition-colors shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className="group bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-primary transition-all relative overflow-hidden"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Zap size={24} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <h4 className="text-sm font-black text-ink uppercase italic tracking-tight">{item.title}</h4>
                           <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{item.category}</div>
                        
                        <div className="flex items-center justify-between">
                           <div className="text-lg font-black text-primary italic">₹{item.price}</div>
                           {item.variant && (
                             <div className="px-2 py-1 bg-primary-soft text-primary text-[8px] font-black uppercase rounded-md">
                               {item.variant.make} Match
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-10 border-t border-slate-100 bg-slate-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-slate-400 text-xs font-black uppercase tracking-widest">Aggregate Total</div>
                  <div className="text-4xl font-black text-ink italic tracking-tighter">₹{total}</div>
                </div>

                <div className="grid gap-4">
                   <button 
                    onClick={() => {
                      setIsOpen(false);
                      window.location.hash = "contact";
                    }}
                    className="w-full py-6 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                   >
                     Initiate Checkout
                     <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                   <button 
                    onClick={clearCart}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-rose-500 transition-colors"
                   >
                     Clear Manifest
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
