import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-toastify";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { sendContactSubmissionAlert } from "../lib/mail";
import { useConfig } from "../hooks/useConfig";
import { cn } from "../lib/utils";

export default function Contact() {
  const { config } = useConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    carModel: "",
    serviceType: "General Service",
    message: "",
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.fullName.trim().length < 3) newErrors.fullName = "Name must be at least 3 characters";
    if (!/^\d{10}$/.test(formData.phone.replace(/[\s-]/g, ""))) newErrors.phone = "Enter a valid 10-digit phone number";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.carModel.trim()) newErrors.carModel = "Tell us what you drive!";
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Form validation failed. Please check the fields.");
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = formData.fullName.trim().length >= 3 && 
                     /^\d{10}$/.test(formData.phone.replace(/[\s-]/g, "")) && 
                     (!formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) && 
                     formData.carModel.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "inquiries"), {
        ...formData,
        status: "open",
        createdAt: serverTimestamp(),
      });
      
      // Trigger notification to support team
      await sendContactSubmissionAlert({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: `[CAR: ${formData.carModel}] [SERVICE: ${formData.serviceType}] ${formData.message}`
      });

      setIsSuccess(true);
      toast.success("Message transmitted successfully!");
      setFormData({ fullName: "", phone: "", email: "", carModel: "", serviceType: "General Service", message: "" });
      setErrors({});
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Error sending inquiry:", error);
      toast.error("Transmission failed. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldValid = (field: string) => {
    if (!formData[field as keyof typeof formData]) return false;
    if (errors[field]) return false;
    return true;
  };

  return (
    <section id="contact" className="py-32 bg-bg-soft text-ink relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-16 py-8"
          >
            <div>
              <div className="inline-block bg-primary-soft text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                 Get in Touch
              </div>
              <h3 className="text-6xl md:text-8xl font-black mb-8 leading-[1] font-display tracking-tight">
                LET'S <br />
                <span className="text-secondary opacity-20">CHAT!</span>
              </h3>
              <p className="text-xl text-text-muted max-w-sm font-medium leading-relaxed">
                 Need help with your car or want a custom quote? We're just a message away! 
              </p>
            </div>

            <div className="grid gap-6">
               <div className="bento-card flex items-center gap-6 p-8 bg-white hover:border-primary transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-primary/10">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Call Us Anytime</p>
                    <p className="text-2xl font-black text-ink">{config.supportPhone || "9831231431"}</p>
                  </div>
               </div>

               <div className="bento-card flex items-center gap-6 p-8 bg-white hover:border-secondary transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-secondary-soft text-secondary flex items-center justify-center group-hover:-rotate-12 transition-transform shadow-lg shadow-secondary/10">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Email Us</p>
                    <p className="text-2xl font-black text-ink">{config.supportEmail || "assist@carmechs.in"}</p>
                  </div>
               </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 md:p-14 bg-white border-4 border-slate-100 rounded-[3rem] shadow-2xl relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-16 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-24 h-24 bg-accent-soft rounded-3xl flex items-center justify-center text-accent mb-8 shadow-xl shadow-accent/20">
                    <CheckCircle size={40} />
                  </div>
                  <h4 className="text-4xl font-black mb-4">Message Sent!</h4>
                  <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                    Thanks for reaching out! One of our experts will call you very soon.
                  </p>
                  <button 
                    onClick={() => setIsSuccess(false)}
                    className="mt-10 bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-12">
                     <h4 className="text-3xl font-black">
                      Book Your Visit
                    </h4>
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  </div>

                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => {
                            setFormData({ ...formData, fullName: e.target.value });
                            if (errors.fullName) validate();
                          }}
                          onBlur={validate}
                          placeholder="Your happy name"
                          className={cn(
                            "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-slate-300 font-bold text-sm focus:bg-white focus:shadow-lg focus:shadow-primary/5",
                             errors.fullName ? "border-rose-500 bg-rose-50/30" : (isFieldValid('fullName') ? "border-emerald-500/30 bg-emerald-50/10" : "border-transparent focus:border-primary")
                          )}
                        />
                        {errors.fullName && <p className="text-[10px] font-black uppercase text-rose-500 ml-2 animate-pulse">{errors.fullName}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            if (errors.phone) validate();
                          }}
                          onBlur={validate}
                          placeholder="+91 Phone"
                          className={cn(
                             "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-slate-300 font-bold text-sm focus:bg-white focus:shadow-lg focus:shadow-secondary/5",
                             errors.phone ? "border-rose-500 bg-rose-50/30" : (isFieldValid('phone') ? "border-emerald-500/30 bg-emerald-50/10" : "border-transparent focus:border-secondary")
                          )}
                        />
                        {errors.phone && <p className="text-[10px] font-black uppercase text-rose-500 ml-2 animate-pulse">{errors.phone}</p>}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your Car</label>
                        <input
                          type="text"
                          value={formData.carModel}
                          onChange={(e) => {
                            setFormData({ ...formData, carModel: e.target.value });
                            if (errors.carModel) validate();
                          }}
                          onBlur={validate}
                          placeholder="Make/Model"
                          className={cn(
                             "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-slate-300 font-bold text-sm focus:bg-white focus:shadow-lg focus:shadow-accent/5",
                             errors.carModel ? "border-rose-500 bg-rose-50/30" : "border-transparent focus:border-accent"
                          )}
                        />
                        {errors.carModel && <p className="text-[10px] font-black uppercase text-rose-500 ml-2 animate-pulse">{errors.carModel}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (errors.email) validate();
                          }}
                          onBlur={validate}
                          placeholder="your@email.com"
                          className={cn(
                             "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-slate-300 font-bold text-sm focus:bg-white focus:shadow-lg focus:shadow-primary/5",
                             errors.email ? "border-rose-500 bg-rose-50/30" : (isFieldValid('email') ? "border-emerald-500/30 bg-emerald-50/10" : "border-transparent focus:border-primary")
                          )}
                        />
                        {errors.email && <p className="text-[10px] font-black uppercase text-rose-500 ml-2 animate-pulse">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Service Type</label>
                        <div className="relative">
                          <select 
                            value={formData.serviceType}
                            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none transition-all font-bold text-sm appearance-none cursor-pointer focus:border-primary focus:bg-white focus:shadow-lg"
                          >
                            <option>General Service</option>
                            <option>Oil Change</option>
                            <option>Detailing</option>
                            <option>Repair Job</option>
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <ChevronRight size={18} className="rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your Message (Optional)</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us what's happening..."
                        rows={3}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-slate-300 font-bold text-sm focus:border-warning focus:bg-white shadow-none focus:shadow-lg resize-none"
                      ></textarea>
                    </div>

                    <button 
                      disabled={isSubmitting || !isFormValid}
                      className={cn(
                        "w-full py-6 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 disabled:opacity-30 disabled:grayscale disabled:scale-100 active:scale-95 group/submit relative overflow-hidden",
                        isSubmitting && "cursor-wait"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          <span>Transmitting Intel...</span>
                          <motion.div 
                            className="absolute bottom-0 left-0 h-1 bg-white/30"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send size={20} className="group-hover/submit:translate-x-1 group-hover/submit:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

