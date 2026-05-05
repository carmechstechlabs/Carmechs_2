import React from "react";
import { Star, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useConfig } from "../hooks/useConfig";
import { cn } from "../lib/utils";

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Honda City Owner",
    text: "Used CarMechs for my annual service. The mechanic was professional and the transparent pricing was a breath of fresh air compared to traditional workshops.",
    stars: 5,
  },
  {
    name: "Sneha Sharma",
    role: "Hyundai i20 Owner",
    text: "Super convenient! They picked up my car from my office and dropped it back before my login. Quality of service is top-notch.",
    stars: 5,
  },
  {
    name: "Amit Patel",
    role: "SUV Enthusiast",
    text: "Had a difficult engine issue. CarMechs diagnosed it quickly and saved me a lot of money on parts. Highly recommended for any car lover.",
    stars: 5,
  },
];

export default function Testimonials() {
  const { config } = useConfig();

  return (
    <section id="testimonials" className="py-32 bg-white overflow-hidden text-ink relative">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-24 gap-12">
          <div className="max-w-2xl">
            <div className="inline-block bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
               What Our Customers Say
            </div>
            <h3 className="text-6xl md:text-8xl font-black mb-8 leading-[1] font-display tracking-tight">
              HAPPY <br />
              <span className="text-secondary opacity-20">DRIVERS</span>
            </h3>
            <p className="text-xl text-text-muted font-medium leading-relaxed max-w-lg">
               Don't just take our word for it—listen to the thousands of car owners who trust us with their ride!
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-100 group">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-white overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                  <img src={`https://picsum.photos/seed/user-happy-${i}/100/100`} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex text-warning gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill="currentColor" />
                ))}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Join 5,000+ Happy Owners
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, index) => {
             const themes = [
                { soft: 'bg-primary-soft', text: 'text-primary', icon: 'text-primary/10' },
                { soft: 'bg-secondary-soft', text: 'text-secondary', icon: 'text-secondary/10' },
                { soft: 'bg-accent-soft', text: 'text-accent', icon: 'text-accent/10' },
             ];
             const theme = themes[index % themes.length];

             return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group h-full"
              >
                <div className={cn("bento-card h-full p-12 relative overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500", theme.soft)}>
                  <div className={cn("absolute -top-6 -right-6 opacity-20 transition-transform group-hover:scale-110 group-hover:-rotate-12", theme.text)}>
                    <MessageSquare size={120} />
                  </div>

                  <div className="flex text-warning gap-1 mb-10">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} fill="currentColor" />
                    ))}
                  </div>
                  
                  <p className="text-xl text-ink font-bold leading-relaxed mb-12 relative z-10 flex-1 italic">
                    "{t.text}"
                  </p>

                  <div className="flex items-center gap-6 pt-10 border-t border-black/5 mt-auto">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-black/10 transition-all duration-500 group-hover:rotate-6">
                      <img src={`https://picsum.photos/seed/user-${t.name}/100/100`} alt={t.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-black text-ink uppercase tracking-tight text-xl leading-none mb-1">{t.name}</div>
                      <div className={cn("text-[10px] font-black uppercase tracking-widest", theme.text)}>{t.role}</div>
                    </div>
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
