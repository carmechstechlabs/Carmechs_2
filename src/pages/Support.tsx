import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  LifeBuoy,
  Plus,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";
import { useConfig } from "../hooks/useConfig";
import { db } from "../lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";

export default function Support() {
  const { user } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "medium"
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tickets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Support tickets Repository Error handled:", err.message);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "tickets"), {
        ...formData,
        userId: user.uid,
        userName: user.displayName || "Customer",
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowNewForm(false);
      setFormData({ subject: "", description: "", priority: "medium" });
    } catch (err) {
      console.error(err);
      alert("Intelligence submission failed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-soft flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-bg-soft max-w-md w-full">
           <LifeBuoy size={64} className="text-primary mx-auto mb-6 opacity-20" />
           <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">Auth Required</h2>
           <p className="text-neutral-500 mb-8 font-medium">Synchronize your profile to access our support intelligence network.</p>
           <button 
             onClick={() => navigate("/auth")}
             className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
           >
             Initialize Login
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-soft flex flex-col font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-20 pb-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div>
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                 <LifeBuoy size={24} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Support_Network_Core</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none mb-3">
              Resolution <span className="text-primary italic">Intelligence</span>
            </h1>
            <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-widest pl-1">Global Customer Response Registry</p>
          </div>

          <button 
            onClick={() => setShowNewForm(true)}
            className="group flex items-center gap-3 bg-white text-ink border border-bg-soft px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all hover:border-primary/30"
          >
            <Plus size={18} className="text-primary group-hover:rotate-90 transition-transform" />
            Initialize Ticket
          </button>
        </div>

        <div className="grid gap-6">
          <AnimatePresence>
            {showNewForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-10 rounded-[3rem] border border-bg-soft shadow-2xl relative overflow-hidden"
              >
                <button 
                  onClick={() => setShowNewForm(false)}
                  className="absolute top-8 right-8 text-neutral-300 hover:text-rose-500 transition-colors"
                >
                  <X size={24} />
                </button>

                <h2 className="text-xl font-black italic uppercase tracking-tight mb-8 flex items-center gap-4">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  New Intelligence Request
                </h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Subject Manifest</label>
                      <input 
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g. Engine Calibration Anomaly..."
                        className="w-full bg-bg-soft border border-neutral-100 rounded-2xl px-6 py-4 text-sm font-black italic uppercase tracking-tight text-ink outline-none focus:border-primary transition-all placeholder:text-neutral-300"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Priority Protocol</label>
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full bg-bg-soft border border-neutral-100 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ink outline-none focus:border-primary transition-all cursor-pointer appearance-none"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent Payload</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Detailed Description</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={5}
                      placeholder="Please narrate the specific operational details..."
                      className="w-full bg-bg-soft border border-neutral-100 rounded-3xl p-8 text-sm font-medium leading-relaxed text-ink outline-none focus:border-primary transition-all placeholder:text-neutral-300 shadow-inner"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {submitting ? "SYNCHRONIZING..." : "EXECUTE_SUBMISSION"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-6">
            {tickets.map(ticket => (
              <div 
                key={ticket.id}
                className="bg-white p-8 rounded-[2.5rem] border border-bg-soft shadow-xl group hover:shadow-2xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      ticket.status === "open" ? "bg-rose-50 border-rose-100 text-rose-500" :
                      ticket.status === "in-progress" ? "bg-amber-50 border-amber-100 text-amber-500" :
                      ticket.status === "resolved" ? "bg-emerald-50 border-emerald-100 text-emerald-500" :
                      "bg-neutral-50 border-neutral-100 text-neutral-400"
                    )}>
                      {ticket.status}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      ticket.priority === "urgent" ? "text-rose-500" :
                      ticket.priority === "high" ? "text-amber-500" :
                      ticket.priority === "medium" ? "text-primary" :
                      "text-emerald-500"
                    )}>
                      <AlertCircle size={10} />
                      {ticket.priority}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-300">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <h3 className="text-base font-black italic uppercase italic tracking-tight text-ink group-hover:text-primary transition-colors">
                    {ticket.subject}
                  </h3>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-primary" />
                      {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : "Syncing..."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {ticket.status === "resolved" ? (
                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase italic">
                      <CheckCircle2 size={16} />
                      CLOSED
                    </div>
                  ) : (
                    <div className="text-primary group-hover:translate-x-2 transition-transform">
                      <ChevronRight size={24} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {!loading && tickets.length === 0 && !showNewForm && (
              <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-bg-soft">
                 <MessageSquare size={80} className="text-bg-soft mx-auto mb-8" strokeWidth={1} />
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-ink opacity-20">Registry_Empty</h3>
                 <p className="text-neutral-400 font-bold uppercase text-[9px] tracking-widest">No active support transmissions detected in your node.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Persistent WhatsApp Node */}
      <a 
        href={`https://wa.me/${config.whatsappNumber || "919831231431"}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all z-[100] group"
      >
         <MessageSquare size={28} fill="currentColor" />
         <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 pointer-events-none" />
         <span className="absolute right-full mr-4 bg-white text-ink border border-neutral-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 whitespace-nowrap pointer-events-none">
          Technical Deployment HQ
        </span>
      </a>
    </div>
  );
}
