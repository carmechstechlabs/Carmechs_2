import React from "react";
import { ShieldCheck, Zap, Clock, ThumbsUp, MapPin, BadgeCheck } from "lucide-react";
import { motion } from "motion/react";
import { useConfig } from "../hooks/useConfig";
import { cn } from "../lib/utils";

const FEATURES = [
  {
    title: "DOORSTEP PICKUP",
    description: "Personalized doorstep pickup and drop across major cities in India.",
    icon: MapPin,
  },
  {
    title: "EXPRESS SERVICE",
    description: "Get your car serviced and returned within 24 hours for basic maintenance.",
    icon: Zap,
  },
  {
    title: "GENUINE SPARES",
    description: "We only use 100% original OEM/OES spare parts for your safety.",
    icon: ShieldCheck,
  },
  {
    title: "LIVE UPDATES",
    description: "Track your car's progress live with photos and videos from the service floor.",
    icon: Clock,
  },
  {
    title: "CERTIFIED EXPERTS",
    description: "Our mechanics are trained professionals with years of manufacturer experience.",
    icon: BadgeCheck,
  },
  {
    title: "100% TRANSPARENT",
    description: "No hidden costs. Get detailed estimates before any work begins.",
    icon: ThumbsUp,
  },
];

export default function Features() {
  const { config } = useConfig();

  return (
    <section className="py-32 bg-bg-soft relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-24 gap-12">
          <div className="max-w-2xl">
            <div className="inline-block bg-primary-soft text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
               Why You'll Love Us
            </div>
            <h3 className="text-6xl md:text-8xl font-black text-ink leading-[1] mb-8 font-display tracking-tight">
              TOP GEAR <br /> 
              <span className="text-secondary opacity-20">EXPERIENCE</span>
            </h3>
          </div>
          <p className="text-text-muted font-medium max-w-sm leading-relaxed text-lg">
            We've built the best car service experience in India. Fast, honest, and truly professional.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => {
            const themes = [
              { soft: 'bg-primary-soft', text: 'text-primary', iconBg: 'bg-white' },
              { soft: 'bg-secondary-soft', text: 'text-secondary', iconBg: 'bg-white' },
              { soft: 'bg-accent-soft', text: 'text-accent', iconBg: 'bg-white' },
              { soft: 'bg-warning/10', text: 'text-warning', iconBg: 'bg-white' },
              { soft: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-white' },
              { soft: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-white' },
            ];
            const theme = themes[index % themes.length];

            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={cn("bento-card group h-full flex flex-col justify-between p-10", theme.soft)}
              >
                <div className="flex flex-col gap-8">
                  <div className={cn("w-14 h-14 flex items-center justify-center rounded-2xl shadow-sm transition-all group-hover:rotate-12", theme.iconBg, theme.text)}>
                    <feature.icon size={26} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-ink mb-4">{feature.title}</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
