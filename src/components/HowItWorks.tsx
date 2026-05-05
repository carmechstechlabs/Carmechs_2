import React from "react";
import { Calendar, UserCheck, CheckCircle, Car, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useConfig } from "../hooks/useConfig";
import { cn } from "../lib/utils";

export default function HowItWorks() {
  const { config } = useConfig();

  const steps = [
    {
      title: "Book Online",
      description: "Quickly pick your service and choice of time slot through our simple app.",
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary-soft"
    },
    {
      title: "Get Expert",
      description: "We assign a top-rated, certified mechanic just for your specific car needs.",
      icon: UserCheck,
      color: "text-secondary",
      bg: "bg-secondary-soft"
    },
    {
      title: "Easy Pickup",
      description: "We collect your car from your home or office, and service it with total care.",
      icon: Car,
      color: "text-accent",
      bg: "bg-accent-soft"
    },
    {
      title: "Drive Happy",
      description: "Receive your perfectly serviced car back with a full quality check report.",
      icon: CheckCircle,
      color: "text-warning",
      bg: "bg-warning/10"
    },
  ];

  return (
    <section id="how-it-works" className="py-32 bg-white text-ink overflow-hidden relative">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="max-w-2xl mb-24">
          <div className="inline-block bg-secondary-soft text-secondary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
             Easy & Simple
          </div>
          <h3 className="text-6xl md:text-8xl font-black mb-8 leading-[1] font-display tracking-tight">
            HOW IT <br />
            <span className="text-primary opacity-20">WORKS</span>
          </h3>
          <p className="text-xl text-text-muted font-medium leading-relaxed max-w-lg">
             Getting your car serviced has never been this easy. Follow these four simple steps and relax!
          </p>
        </div>

        <div className="relative">
          <div className="grid lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className="bento-card flex flex-col h-full p-10 hover:shadow-2xl transition-all duration-500">
                  <div className="flex justify-between items-start mb-12">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-12", step.bg, step.color)}>
                      <step.icon size={26} />
                    </div>
                    <div className={cn("text-6xl font-black opacity-10 font-display transition-all group-hover:opacity-100", step.color)}>
                      {index + 1}
                    </div>
                  </div>
                  
                  <h4 className="text-2xl font-black mb-4">{step.title}</h4>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-24 p-12 bg-primary-soft rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-12 group transition-all hover:bg-primary hover:text-white">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-all">
              <Zap size={32} />
            </div>
            <div>
              <p className="text-primary font-black text-[10px] uppercase tracking-widest mb-2 group-hover:text-white/60">Ready to start?</p>
              <h4 className="text-3xl font-black tracking-tight">Join Thousands of Happy Car Owners</h4>
            </div>
          </div>
          <button 
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full md:w-auto bg-primary text-white group-hover:bg-white group-hover:text-primary px-12 py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </section>
  );
}
