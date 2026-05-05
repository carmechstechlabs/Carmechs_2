import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Battery, 
  Gauge, 
  Droplets, 
  Disc, 
  Settings, 
  ChevronRight, 
  Shield, 
  ShieldCheck,
  Zap, 
  Activity, 
  Car, 
  Fuel, 
  Thermometer, 
  Settings2,
  CheckCircle2,
  XCircle,
  X,
  Star,
  Quote,
  MessageSquare,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useConfig } from "../hooks/useConfig";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import { ServiceCardSkeleton } from "./ui/Skeleton";
import { useCart } from "../hooks/useCart";

// Add ReviewForm at the bottom
function ReviewForm({ serviceId }: { serviceId: string }) {
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Operational Recall: You must be signed in to submit intelligence.");
      return;
    }
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, "services", serviceId), {
        reviews: arrayUnion({
          userId: user.uid,
          userName: user.displayName || user.email?.split("@")[0],
          rating,
          comment,
          createdAt: new Date().toISOString()
        })
      });
      setComment("");
      setRating(5);
      toast.success("Intelligence documented. Thank you for your feedback.");
    } catch (err) {
      console.error(err);
      toast.error("System failure: Feedback transmission aborted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return (
    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0 italic">Secure session required to post reviews.</p>
    </div>
  );

  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
       <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                   <MessageSquare size={18} />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-ink">Submit Mission Feedback</div>
             </div>
             
             <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="transition-all hover:scale-125"
                  >
                    <Star
                      size={18}
                      className={cn(
                        "transition-colors",
                        s <= rating ? "text-primary fill-primary" : "text-slate-300"
                      )}
                    />
                  </button>
                ))}
             </div>
          </div>

          <div className="relative">
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Operational details, performance notes, overall satisfaction..."
              className="w-full bg-white border border-slate-100 rounded-2xl p-5 text-sm outline-none focus:border-primary transition-all pr-14 placeholder:opacity-50"
              rows={3}
            />
            <button
              disabled={submitting || !comment.trim()}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              <Send size={16} className={submitting ? "animate-pulse" : ""} />
            </button>
          </div>
       </form>
    </div>
  );
}

const ICON_MAP: { [key: string]: any } = {
  Wrench, Battery, Gauge, Droplets, Disc, Settings, Shield, ShieldCheck, Zap, Activity, Car, Fuel, Thermometer, Settings2
};

const CAR_DATA = {
  Maruti: ["Swift", "Baleno", "WagonR", "Ertiga", "Dzire"],
  Hyundai: ["i20", "Creta", "Verna", "Venue"],
  Tata: ["Nexon", "Punch", "Tiago", "Harrier"],
  Mahindra: ["XUV700", "Scorpio", "Thar", "Bolero"],
  Toyota: ["Innova", "Fortuner", "Glanza"],
};

export default function Services() {
  const { config } = useConfig();
  const [services, setServices] = useState<any[]>([]);
  const [carData, setCarData] = useState<Record<string, { logo: string, models: { name: string, logo: string }[] }>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState<string[]>(["All"]);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [selectedCar, setSelectedCar] = useState({ make: "", model: "", fuel: "" });
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [sortBy, setSortBy] = useState<"none" | "price-asc" | "price-desc" | "title-asc" | "title-desc">("none");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const q = query(collection(db, "services"), where("isActive", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Public Services Repository Warning:", err.message);
    });

    const unsubCarHub = onSnapshot(collection(db, "carBrands"), (snapshot) => {
      if (!snapshot.empty) {
        const migrated: Record<string, any> = {};
        snapshot.docs.forEach(d => {
          const brand = d.id;
          const val = d.data();
          if (Array.isArray(val)) {
            migrated[brand] = { logo: "", models: val.map(m => ({ name: m, logo: "" })) };
          } else if (val.models && val.models.length > 0 && typeof val.models[0] === 'string') {
            migrated[brand] = { ...val, models: val.models.map((m: string) => ({ name: m, logo: "" })) };
          } else {
            migrated[brand] = val;
          }
        });
        setCarData(migrated);
      } else {
        // Fallback for demo
        setCarData({
          Maruti: { 
            logo: "https://www.marutisuzuki.com/content/dam/msil/images/logo.png", 
            models: [
              { name: "Swift", logo: "" },
              { name: "Baleno", logo: "" },
              { name: "WagonR", logo: "" },
              { name: "Ertiga", logo: "" },
              { name: "Dzire", logo: "" }
            ] 
          },
          Hyundai: { 
            logo: "https://www.hyundai.com/content/dam/hyundai/in/en/data/find-a-car/Hyundai-Logo.png", 
            models: [
              { name: "i20", logo: "" },
              { name: "Creta", logo: "" },
              { name: "Verna", logo: "" },
              { name: "Venue", logo: "" }
            ] 
          },
          Tata: { 
            logo: "https://www.tatamotors.com/wp-content/themes/tatamotors/assets/images/header-logo.png", 
            models: [
              { name: "Nexon", logo: "" },
              { name: "Punch", logo: "" },
              { name: "Tiago", logo: "" },
              { name: "Harrier", logo: "" }
            ] 
          },
          Mahindra: { 
            logo: "https://www.mahindra.com/sites/default/files/2021-08/Mahindra-Logo.png", 
            models: [
              { name: "XUV700", logo: "" },
              { name: "Scorpio", logo: "" },
              { name: "Thar", logo: "" },
              { name: "Bolero", logo: "" }
            ] 
          },
          Toyota: { 
            logo: "https://www.toyota.com/content/dam/toyota/logos/toyota_logo.png", 
            models: [
              { name: "Innova", logo: "" },
              { name: "Fortuner", logo: "" },
              { name: "Glanza", logo: "" }
            ] 
          },
        });
      }
      setLoading(false);
    }, (err) => {
      console.warn("Public CarHub Repository Warning:", err.message);
      setLoading(false);
    });

    return () => {
      unsub();
      unsubCarHub();
    };
  }, []);

  const getDynamicVariant = (service: any) => {
    if (!selectedCar.make || !selectedCar.model || !selectedCar.fuel) return null;
    
    const variants = service.variants || [];
    const lowerMake = selectedCar.make.toLowerCase();
    const lowerModel = selectedCar.model.toLowerCase();
    const lowerFuel = selectedCar.fuel.toLowerCase();

    // Strategy: Return the most specific match first
    return variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === lowerFuel
    ) || 
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === "all"
    ) ||
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === lowerFuel
    ) ||
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === "all"
    ) ||
    variants.find((v: any) => 
      v.make.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === lowerFuel
    );
  };

  const toggleCategory = (cat: string) => {
    if (cat === "All") {
      setActiveCategories(["All"]);
      return;
    }
    
    setActiveCategories(prev => {
      const filtered = prev.filter(c => c !== "All");
      if (filtered.includes(cat)) {
        const next = filtered.filter(c => c !== cat);
        return next.length === 0 ? ["All"] : next;
      }
      return [...filtered, cat];
    });
  };

  const derivedCategories = ["All", ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];
  const derivedFeatures = Array.from(new Set(services.flatMap(s => s.features || []))).sort();
  
  const filteredServices = services
    .filter(s => {
      const catMatch = activeCategories.includes("All") || activeCategories.includes(s.category);
      const featMatch = activeFeatures.length === 0 || activeFeatures.every(f => (s.features || []).includes(f));
      return catMatch && featMatch;
    })
    .sort((a, b) => {
      if (sortBy === "none") return 0;
      
      if (sortBy.startsWith("title")) {
        return sortBy === "title-asc" 
          ? a.title.localeCompare(b.title) 
          : b.title.localeCompare(a.title);
      }

      const getPrice = (s: any) => {
        const variant = getDynamicVariant(s);
        return variant ? variant.price : s.price;
      };
      return sortBy === "price-asc" ? getPrice(a) - getPrice(b) : getPrice(b) - getPrice(a);
    });

  if (loading && services.length === 0) return null;

  return (
    <section id="services" className="py-32 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        {/* Car Selector Header */}
        <div className="mb-24 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            onClick={() => setShowCarPicker(true)}
            className="inline-flex items-center gap-6 bg-slate-50 px-10 py-6 rounded-3xl border-2 border-slate-100 cursor-pointer hover:bg-white hover:border-primary transition-all group shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-soft flex items-center justify-center text-primary group-hover:rotate-12 transition-all">
              <Car size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Your Selected Vehicle</div>
              <div className="text-2xl font-black text-ink flex items-center gap-4">
                {selectedCar.make ? (
                   <div className="flex flex-col items-center">
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                       {selectedCar.make} {selectedCar.model}
                     </span>
                     <span className="text-[10px] font-black uppercase text-slate-400 -mt-1 tracking-widest">{selectedCar.fuel} ENGINE</span>
                   </div>
                ) : "No car selected yet"}
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                   <ChevronRight size={20} className="text-primary" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-12">
          <div className="max-w-2xl">
            <div className="inline-block bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
               Our Expert Services
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-ink mb-8 leading-[1.1]">
              Quality Care <br />
              <span className="text-secondary opacity-20">For Your Car</span>
            </h2>
            <p className="text-lg text-text-muted font-medium leading-relaxed max-w-lg">
               Choose from our wide range of professional services. From quick checkups to complete restorations, we've got you covered.
            </p>
          </div>

            <div className="flex flex-col gap-6 items-end">
      {/* Sorting and Protocol Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-12 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100">
        <div className="flex flex-col gap-6 w-full lg:w-auto">
          {/* Category Filter */}
          <div className="space-y-3">
             <div className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
               <Settings2 size={12} /> Service Category Protocol
             </div>
             <div className="flex flex-wrap gap-2">
               {derivedCategories.map((cat: string) => (
                 <button
                   key={cat}
                   onClick={() => toggleCategory(cat)}
                   className={cn(
                     "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2",
                     activeCategories.includes(cat) 
                       ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105" 
                       : "bg-white text-slate-400 border-slate-100 hover:bg-slate-100 hover:text-slate-600"
                   )}
                 >
                   {cat}
                   {activeCategories.includes(cat) && cat !== "All" && (
                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                   )}
                 </button>
               ))}
             </div>
          </div>

          {/* Features Filter */}
          <div className="space-y-3">
             <div className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
               <Activity size={12} /> Operational Feature Toggles
             </div>
             <div className="flex flex-wrap gap-2 items-center">
               <div className="relative group">
                 <select 
                   onChange={(e) => {
                     const feat = e.target.value;
                     if (feat && !activeFeatures.includes(feat)) {
                       setActiveFeatures([...activeFeatures, feat]);
                     }
                     e.target.value = "";
                   }}
                   className="bg-white border border-slate-100 rounded-xl px-5 py-3 text-[9px] font-black uppercase tracking-[0.2em] outline-none focus:border-primary shadow-sm min-w-[200px] appearance-none cursor-pointer pr-10"
                 >
                   <option value="">+ TAG FEATURE</option>
                   {derivedFeatures
                     .filter(f => !activeFeatures.includes(f))
                     .map(f => (
                       <option key={f} value={f}>{f}</option>
                     ))
                   }
                 </select>
                 <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" />
               </div>

               {activeFeatures.map(feat => (
                 <button
                   key={feat}
                   onClick={() => setActiveFeatures(prev => prev.filter(f => f !== feat))}
                   className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-lg flex items-center gap-2 hover:bg-rose-500 transition-all group"
                 >
                   {feat}
                   <X size={10} className="group-hover:rotate-90 transition-transform" />
                 </button>
               ))}
               {activeFeatures.length > 0 && (
                 <button 
                   onClick={() => setActiveFeatures([])} 
                   className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline ml-2"
                 >
                   Reset Tags
                 </button>
               )}
             </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm w-full lg:w-auto">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap size={12} className="text-primary" /> Sequencing Logic
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setSortBy(sortBy === "price-asc" ? "none" : "price-asc")}
              className={cn(
                "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border-2",
                sortBy === "price-asc" ? "bg-primary border-primary text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
              )}
            >
              Price: Low-High
            </button>
            <button 
              onClick={() => setSortBy(sortBy === "price-desc" ? "none" : "price-desc")}
              className={cn(
                "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border-2",
                sortBy === "price-desc" ? "bg-primary border-primary text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
              )}
            >
              Price: High-Low
            </button>
            <button 
              onClick={() => setSortBy(sortBy === "title-asc" ? "none" : "title-asc")}
              className={cn(
                "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border-2",
                sortBy === "title-asc" ? "bg-secondary border-secondary text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
              )}
            >
              Title: A-Z
            </button>
            <button 
              onClick={() => setSortBy(sortBy === "title-desc" ? "none" : "title-desc")}
              className={cn(
                "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border-2",
                sortBy === "title-desc" ? "bg-secondary border-secondary text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
              )}
            >
              Title: Z-A
            </button>
          </div>
        </div>
      </div>

          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <ServiceCardSkeleton count={6} />
          ) : (
            filteredServices.map((service, index) => {
            const Icon = ICON_MAP[service.icon] || Settings;
            const matchedVariant = getDynamicVariant(service);
            const displayPrice = matchedVariant ? matchedVariant.price : service.price;
            const isExpanded = expandedId === service.id;
            
            // Assign a color theme based on index
            const themes = [
              { soft: 'bg-primary-soft', text: 'text-primary', border: 'border-primary/10' },
              { soft: 'bg-secondary-soft', text: 'text-secondary', border: 'border-secondary/10' },
              { soft: 'bg-accent-soft', text: 'text-accent', border: 'border-accent/10' },
              { soft: 'bg-warning/10', text: 'text-warning', border: 'border-warning/10' },
            ];
            const theme = themes[index % themes.length];

             return (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ 
                  scale: isExpanded ? 1.01 : 1.08, 
                  y: isExpanded ? 0 : -12,
                  transition: { type: "spring", stiffness: 500, damping: 12 }
                }}
                whileTap={{ scale: 0.95 }}
                viewport={{ once: true }}
                onClick={() => setExpandedId(isExpanded ? null : service.id)}
                className={cn(
                  "bento-card group flex flex-col hover:shadow-2xl hover:shadow-primary/20 p-0 overflow-hidden cursor-pointer transition-all duration-500 border-2",
                  isExpanded ? "border-primary lg:col-span-2 shadow-2xl scale-[1.01] hover:scale-[1.01]" : "border-transparent shadow-xl shadow-slate-100"
                )}
              >
                <div className={cn("flex flex-col h-full", isExpanded && "md:flex-row")}>
                  <div className={cn("relative overflow-hidden bg-slate-100", isExpanded ? "md:w-1/2 h-full" : "h-48")}>
                    <AnimatePresence mode="wait">
                      {service.imageUrl ? (
                        <motion.img 
                          key="image"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          src={service.imageUrl} 
                          alt={service.title} 
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <motion.div 
                          key="placeholder"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"
                        >
                          <Car size={64} strokeWidth={1} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {isExpanded && (
                      <div className="absolute top-6 left-6 flex flex-col gap-2">
                        <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur text-ink shadow-lg")}>
                           {service.category}
                        </div>
                        {service.variants && service.variants.length > 0 && (
                          <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-lg">
                            {service.variants.length} Optional Variants
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("flex flex-col p-8", isExpanded ? "md:w-1/2" : "flex-1")}>
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", theme.soft, theme.text)}>
                          <Icon size={24} />
                      </div>
                      {!isExpanded && (
                         <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest", theme.soft, theme.text)}>
                            {service.category}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-3xl font-black text-ink group-hover:text-primary transition-colors uppercase italic">
                        {service.title}
                      </h4>
                      {isExpanded && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(null);
                          }}
                          className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>

                    {service.excerpt && (
                      <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                        {service.excerpt}
                      </p>
                    )}

                    <p className={cn(
                      "text-text-muted leading-relaxed mb-4 text-sm font-medium transition-all",
                      isExpanded ? "" : "line-clamp-2"
                    )}>
                      {service.description}
                    </p>

                    {!isExpanded && (
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(service.id);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:gap-2 transition-all mb-6 bg-primary-soft/50 py-2 px-4 rounded-xl w-fit"
                      >
                        Read Full Manifest <ChevronRight size={12} />
                      </motion.button>
                    )}

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-6"
                        >
                          {matchedVariant ? (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-6 bg-primary-soft/30 rounded-[2.5rem] border-2 border-primary/20 flex items-center justify-between shadow-lg shadow-primary/5"
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Tailored for Your Vehicle</span>
                                <h5 className="text-xl font-black text-ink italic uppercase tracking-tight">
                                  {selectedCar.make} {selectedCar.model} <span className="text-primary">•</span> {selectedCar.fuel}
                                </h5>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowCarPicker(true); }}
                                className="w-10 h-10 rounded-xl bg-white border border-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                              >
                                <Settings2 size={18} />
                              </button>
                            </motion.div>
                          ) : (
                            <div 
                              onClick={(e) => { e.stopPropagation(); setShowCarPicker(true); }}
                              className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-between group/picker cursor-pointer hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 group-hover/picker:text-primary transition-all">
                                  <Car size={24} />
                                </div>
                                <div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Not seeing your car?</div>
                                  <div className="text-sm font-black text-ink uppercase tracking-tight">Identify vehicle for precise pricing</div>
                                </div>
                              </div>
                              <ChevronRight size={20} className="text-slate-300 group-hover/picker:translate-x-1 transition-all" />
                            </div>
                          )}

                          {/* Reviews Section */}
                          <div className="pt-8 border-t border-slate-100">
                             <div className="flex items-center justify-between mb-6">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Feedback</h5>
                                <div className="flex items-center gap-1 text-primary">
                                   <Star size={12} fill="currentColor" />
                                   <span className="text-xs font-black italic">
                                     {service.reviews?.length > 0 
                                       ? (service.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / service.reviews.length).toFixed(1)
                                       : "New"}
                                   </span>
                                </div>
                             </div>

                             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                                {service.reviews && service.reviews.length > 0 ? (
                                  service.reviews.map((review: any, i: number) => (
                                    <div key={i} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                       <div className="flex items-center justify-between mb-2">
                                          <div className="text-xs font-black text-ink uppercase italic">{review.userName || "Customer"}</div>
                                          <div className="flex gap-0.5">
                                             {[1,2,3,4,5].map(s => (
                                               <Star key={s} size={10} className={s <= review.rating ? "text-primary fill-primary" : "text-slate-300"} />
                                             ))}
                                          </div>
                                       </div>
                                       <p className="text-xs text-text-muted leading-relaxed italic">"{review.comment}"</p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-10 opacity-40">
                                     <Quote size={24} className="mx-auto mb-2" />
                                     <div className="text-[10px] font-black uppercase tracking-widest">No reviews yet. Be the first!</div>
                                  </div>
                                )}
                             </div>

                             <ReviewForm serviceId={service.id} />
                          </div>

                          {service.variants && service.variants.length > 0 && (
                            <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Market Price Index</h5>
                              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                {service.variants.map((v: any, i: number) => {
                                  const isSelected = selectedCar.make.toLowerCase() === v.make.toLowerCase() && 
                                                 (v.model.toLowerCase() === 'all' || selectedCar.model.toLowerCase() === v.model.toLowerCase()) &&
                                                 (v.fuel.toLowerCase() === 'all' || selectedCar.fuel.toLowerCase() === v.fuel.toLowerCase());
                                  return (
                                    <div 
                                      key={i} 
                                      className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                        isSelected ? "bg-white border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/5" : "bg-white/40 border-slate-100"
                                      )}
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-ink uppercase italic">{v.make} {v.model}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.fuel} Variance</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className={cn("text-sm font-black italic", isSelected ? "text-primary" : "text-slate-400")}>₹{v.price}</span>
                                        {isSelected && <Zap size={14} className="text-primary animate-pulse" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {(isExpanded || (service.features && service.features.length > 0)) && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mb-10 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <ShieldCheck size={16} />
                            </div>
                            <h5 className="text-[11px] font-black text-ink uppercase tracking-[0.2em] italic">Full Service Parameters & Features</h5>
                          </div>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(isExpanded ? service.features : service.features.slice(0, 3)).map((feature: string, i: number) => (
                              <motion.li 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={i} 
                                className="flex items-start gap-4 text-xs font-bold text-slate-600 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-primary/30"
                              >
                                <div className="mt-0.5">
                                  <CheckCircle2 size={16} className="text-emerald-500" />
                                </div>
                                <span className="leading-tight">{feature}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 mt-auto gap-6">
                      <div className="flex flex-col w-full sm:w-auto">
                        <span className="text-[10px] uppercase font-black text-slate-300 tracking-[0.1em] mb-1">
                          {matchedVariant ? "Vehicle-Specific Pricing" : "Est. Starting From"}
                        </span>
                         <div className="flex items-baseline gap-3 relative">
                          <span className={cn(
                            "text-5xl font-black text-ink tracking-tighter transition-all duration-500",
                            matchedVariant && "text-primary italic"
                          )}>
                             ₹{displayPrice}
                          </span>
                          {matchedVariant && (
                            <motion.div
                              initial={{ opacity: 0, x: -20, scale: 0.8 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              className="px-4 py-1.5 rounded-full bg-primary text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 flex items-center gap-2 group/match"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              Variant Match
                              <Zap size={10} className="group-hover/match:animate-bounce" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart({
                              id: service.id,
                              title: service.title,
                              price: displayPrice,
                              category: service.category,
                              icon: service.icon,
                              imageUrl: service.imageUrl,
                              variant: matchedVariant
                            });
                          }}
                          className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2 group/cart"
                        >
                          <Zap size={14} className="group-hover/cart:animate-bounce" />
                          Add to Cart
                        </button>
                        
                        {isExpanded && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.hash = "contact";
                            }}
                            className="flex-1 sm:flex-none bg-primary text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            Inquire Now
                          </button>
                        )}
                        <div className={cn("hidden sm:flex w-12 h-12 rounded-2xl items-center justify-center transition-all group/btn", theme.soft, theme.text, "hover:scale-110", isExpanded && "rotate-90")}>
                          <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }))}
        </div>
      </div>

      <AnimatePresence>
        {showCarPicker && (
          <CarPicker 
            carData={carData}
            selectedCar={selectedCar} 
            setSelectedCar={setSelectedCar} 
            onClose={() => setShowCarPicker(false)} 
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// Car Picker Modal
function CarPicker({ carData, selectedCar, setSelectedCar, onClose }: any) {
  const [step, setStep] = useState(() => {
    if (selectedCar.fuel) return 3;
    if (selectedCar.model) return 3; // Show fuel choice if model is picked
    if (selectedCar.make) return 2;
    return 1;
  });
  const makes = Object.keys(carData);
  const models = selectedCar.make ? (carData as any)[selectedCar.make]?.models || [] : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: 50, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 pb-0">
          <div className="flex items-center justify-between mb-8">
             <div className="inline-flex items-center gap-2 bg-primary-soft text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <span className="opacity-50">Step</span> {step} <span className="opacity-50">/</span> 3
             </div>
             <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-ink transition-colors">
               <X size={20} />
             </button>
          </div>
          <h3 className="text-4xl font-black text-ink mb-2">
            {step === 1 && "Select Brand"}
            {step === 2 && "Select Model"}
            {step === 3 && "Fuel Variant"}
          </h3>
          <p className="text-slate-500 font-medium text-sm">
            {step === 1 && "Which master engineer built your machine?"}
            {step === 2 && `Choosing a model for your ${selectedCar.make}`}
            {step === 3 && "Petrol, Diesel or Electric? Tell us your power source."}
          </p>
        </div>

        <div className="p-8 pt-10 h-[400px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-3">
            {step === 1 && makes.map(make => {
              const brandData = (carData as any)[make];
              const isSelected = selectedCar.make === make;
              return (
                <button
                  key={make}
                  onClick={() => { 
                    const brandModels = (carData as any)[make]?.models || [];
                    const firstModel = brandModels.length > 0 ? brandModels[0].name : "";
                    setSelectedCar({ ...selectedCar, make, model: firstModel }); 
                    if (firstModel) {
                      setStep(3); // Pre-select first model and advance to fuel
                    } else {
                      setStep(2);
                    }
                  }}
                  className={cn(
                    "p-6 rounded-2xl transition-all font-bold text-lg flex items-center justify-between group border-2",
                    isSelected 
                      ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02] ring-4 ring-primary/10" 
                      : "bg-slate-50 text-ink border-transparent hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all shadow-sm overflow-hidden p-2",
                      isSelected ? "bg-white" : "bg-white"
                    )}>
                      {brandData?.logo ? (
                        <img src={brandData.logo} alt={make} className="w-full h-full object-contain" />
                      ) : (
                        <Car size={24} className="text-primary" />
                      )}
                    </div>
                    {make}
                  </div>
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <motion.span 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-full border border-white/30"
                      >
                        CURRENT UNIT
                      </motion.span>
                    )}
                    {isSelected ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white text-primary rounded-full p-1.5 shadow-xl">
                        <CheckCircle2 size={24} />
                      </motion.div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-300 group-hover:bg-white/20 transition-all">
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {step === 2 && models.length > 0 && models.map((model: any) => {
              const isSelected = selectedCar.model === model.name;
              return (
                <button
                  key={model.name}
                  onClick={() => { 
                    setSelectedCar({ ...selectedCar, model: model.name }); 
                    setStep(3); 
                  }}
                  className={cn(
                    "p-6 rounded-2xl transition-all font-bold text-lg flex items-center justify-between group border-2",
                    isSelected 
                      ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02] ring-4 ring-primary/10" 
                      : "bg-slate-50 text-ink border-transparent hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm overflow-hidden p-1 bg-white",
                      isSelected ? "bg-white/20" : "bg-white"
                    )}>
                      {model.logo ? (
                        <img src={model.logo} alt={model.name} className="w-full h-full object-contain" />
                      ) : (
                        <Activity size={20} className={isSelected ? "text-white" : "text-primary"} />
                      )}
                    </div>
                    {model.name}
                  </div>
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <motion.span 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-full border border-white/30"
                      >
                        MATCHED
                      </motion.span>
                    )}
                    {isSelected ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white text-primary rounded-full p-1.5 shadow-xl">
                        <CheckCircle2 size={24} />
                      </motion.div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-300 group-hover:bg-white/20 transition-all">
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {step === 2 && models.length === 0 && (
              <div className="text-center py-20">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle size={32} className="text-slate-300" />
                </div>
                <h4 className="text-xl font-black text-ink">No Models Found</h4>
                <p className="text-slate-500 text-sm mt-2">Try a different brand or contact support.</p>
              </div>
            )}

            {step === 3 && ["Petrol", "Diesel", "CNG", "Electric"].map(fuel => (
              <button
                key={fuel}
                onClick={() => { setSelectedCar({ ...selectedCar, fuel }); onClose(); }}
                className={cn(
                  "p-6 rounded-2xl transition-all font-bold text-lg flex items-center justify-between group border-2",
                  selectedCar.fuel === fuel 
                    ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                    : "bg-slate-50 text-ink border-transparent hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <Fuel size={20} className={selectedCar.fuel === fuel ? "text-white" : "text-primary"} />
                  {fuel}
                </div>
                <div className="flex items-center gap-3">
                  {selectedCar.fuel === fuel && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white text-primary rounded-full p-1 shadow-md">
                       <CheckCircle2 size={20} />
                    </motion.div>
                  )}
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedCar.fuel === fuel ? "bg-white border-white scale-110" : "border-slate-200"
                  )}>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      selectedCar.fuel === fuel ? "bg-primary" : "bg-transparent"
                    )} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
           {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="text-sm font-black uppercase tracking-widest text-primary hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                 <ChevronRight size={16} className="rotate-180" /> Back to prev step
              </button>
           ) : (
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select your car's brand to start</div>
           )}
           
           {selectedCar.make && selectedCar.model && step < 3 && (
             <button onClick={() => setStep(step + 1)} className="text-sm font-black uppercase tracking-widest text-ink hover:text-primary transition-colors flex items-center gap-2">
               Next <ChevronRight size={16} />
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}
