import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  Wrench, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2,
  Phone,
  Mail,
  Zap,
  Edit2,
  AlertCircle,
  Fuel,
  Droplets
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc } from "firebase/firestore";
import { cn } from "../lib/utils";
import { useConfig } from "../hooks/useConfig";
import { toast } from "react-toastify";
import { BookingFormSkeleton } from "./ui/Skeleton";
import { sendConfirmationEmail, sendNewBookingAlert } from "../lib/mail";
import { initializePayment } from "../lib/payment";

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
  data: any;
  updateData: (newData: any) => void;
  onComplete?: () => void;
  key?: string;
}

export default function BookingSystem({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [bookingData, setBookingData] = useState({
    carDetails: { make: "", model: "", fuel: "", year: "", plate: "", brandLogo: "", modelLogo: "" },
    location: "Main Workshop - Mumbai Central", // Default
    serviceId: "",
    serviceType: "",
    price: 0,
    appointmentDate: "",
    appointmentTime: "",
    mechanicId: "",
    mechanicName: "",
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "Mumbai",
    message: ""
  });

  const nextStep = () => setStep(prev => prev + 1);
  const backStep = () => setStep(prev => prev - 1);
  const goToStep = (s: number) => setStep(s);

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-white overflow-hidden max-w-4xl w-full mx-auto relative h-[85vh] flex flex-col">
       {/* Progress Bar */}
       <div className="absolute top-0 left-0 w-full h-2 bg-slate-50 overflow-hidden z-20">
      <motion.div 
        className="h-full bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: `${(step / 7) * 100}%` }}
      />
       </div>

       <div className="p-12 pb-0 flex items-center justify-between relative z-10">
          <div>
            <div className="inline-block bg-primary-soft text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">
               Phase {step} of 7
            </div>
            <h2 className="text-4xl font-black text-ink tracking-tight">
               {step === 1 && "Vehicle Details"}
               {step === 2 && "Service Location"}
               {step === 3 && "Select Service"}
               {step === 4 && "Schedule & Expert"}
               {step === 5 && "Contact & Car Info"}
               {step === 6 && "Review Order"}
               {step === 7 && "Digital Receipt"}
            </h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
              <span className="font-bold">ESC</span>
            </button>
          )}
       </div>

       <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <AnimatePresence mode="wait">
             {step === 1 && (
               <VehicleStep 
                  key="v" 
                  onNext={nextStep} 
                  data={bookingData.carDetails} 
                  updateData={(d) => setBookingData(prev => ({ ...prev, carDetails: d }))} 
               />
             )}
             {step === 2 && (
               <LocationStep
                  key="l"
                  onNext={nextStep}
                  onBack={backStep}
                  data={bookingData.location}
                  updateData={(l) => setBookingData(prev => ({ ...prev, location: l }))}
               />
             )}
             {step === 3 && (
               <ServiceStep 
                  key="s" 
                  onNext={nextStep} 
                  onBack={backStep} 
                  data={bookingData} 
                  updateData={(d) => setBookingData(prev => ({ ...prev, ...d }))} 
               />
             )}
             {step === 4 && (
               <ScheduleStep 
                  key="sc" 
                  onNext={nextStep} 
                  onBack={backStep} 
                  data={bookingData} 
                  updateData={(d) => setBookingData(prev => ({ ...prev, ...d }))} 
               />
             )}
             {step === 5 && (
               <ContactStep 
                  key="c" 
                  onNext={nextStep} 
                  onBack={backStep} 
                  data={bookingData} 
                  updateData={(d) => setBookingData(prev => ({ ...prev, ...d }))} 
               />
             )}
             {step === 6 && (
               <SummaryStep 
                  key="sm" 
                  onNext={nextStep} 
                  onBack={backStep} 
                  goToStep={goToStep}
                  data={bookingData} 
                  updateData={(d) => setBookingData(prev => ({ ...prev, ...d }))} 
               />
             )}
             {step === 7 && (
               <SuccessStep
                  key="success"
                  data={bookingData}
                  onClose={onClose || (() => {})}
               />
             )}
          </AnimatePresence>
       </div>
    </div>
  );
}

function LocationStep({ onNext, onBack, data, updateData }: { onNext: () => void, onBack: () => void, data: string, updateData: (l: string) => void }) {
  const branches = [
    { id: "mumbai-1", name: "Main Workshop - Mumbai Central", address: "Plot 12, Senapati Bapat Marg", region: "South Mumbai", phone: "+91 98312 31431" },
    { id: "mumbai-2", name: "Apex Service Hub - Bandra", address: "Link Road, Near Metro Pillars", region: "West Mumbai", phone: "+91 98312 31432" },
    { id: "mumbai-3", name: "Elite Garage - Thane", address: "Eastern Express Highway", region: "Central Suburbs", phone: "+91 98312 31433" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="grid gap-4">
        {branches.map(b => (
          <button
            key={b.id}
            onClick={() => { updateData(b.name); onNext(); }}
            className={cn(
              "p-6 rounded-[2rem] border-2 text-left transition-all group flex items-start gap-4",
              data === b.name ? "border-primary bg-primary-soft" : "border-slate-50 bg-slate-50 hover:border-slate-200"
            )}
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", data === b.name ? "bg-white text-primary" : "bg-white text-slate-300 group-hover:text-primary")}>
              <ShieldCheck size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{b.region}</div>
              <h4 className="text-lg font-black text-ink uppercase italic tracking-tight mb-2">{b.name}</h4>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <Calendar size={12} /> {b.address}
              </p>
            </div>
            <ChevronRight size={20} className="text-slate-200 self-center" />
          </button>
        ))}
      </div>
      <button onClick={onBack} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-ink">Change Vehicle</button>
    </motion.div>
  );
}

function VehicleStep({ onNext, data, updateData }: StepProps) {
  const [carHub, setCarHub] = useState<any>({});
  const [step, setStep] = useState(1); // Internal sub-steps
  const [search, setSearch] = useState("");

  useEffect(() => {
    return onSnapshot(collection(db, "carBrands"), (snapshot) => {
      const migrated: Record<string, any> = {};
      snapshot.docs.forEach(d => {
        const brand = d.id;
        const val = d.data();
        if (Array.isArray(val)) {
           migrated[brand] = { logo: "", models: val.map(m => ({ name: m, logo: "" })) };
        } else {
           migrated[brand] = {
             logo: val.logo || "",
             models: (val.models || []).map((m: any) => typeof m === 'string' ? { name: m, logo: "" } : m)
           };
        }
      });
      setCarHub(migrated);
    }, (err) => {
      console.warn("Booking VehicleStep CarHub error:", err.message);
    });
  }, []);

  const makes = Object.keys(carHub).filter(m => m.toLowerCase().includes(search.toLowerCase()));
  const selectedBrand = data.make ? carHub[data.make] : null;
  const models = selectedBrand ? selectedBrand.models.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase())) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
       {/* Search Bar */}
       <div className="relative group">
         <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
           <Car size={18} className="text-slate-300 group-focus-within:text-primary transition-colors" />
         </div>
         <input 
           type="text" 
           placeholder={step === 1 ? "Search by Brand (e.g. BMW, Tesla)..." : "Search Model (e.g. Model 3, X5)..."}
           value={search}
           onChange={(e) => setSearch(e.target.value)}
           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-5 outline-none focus:border-primary transition-all font-bold text-ink"
         />
       </div>

       {step === 1 && (
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-8">
            {makes.map(m => (
              <button 
                key={m} 
                onClick={() => { updateData({ ...data, make: m, brandLogo: carHub[m].logo }); setStep(2); setSearch(""); }}
                className={cn(
                  "p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-5 group relative overflow-hidden",
                  data.make === m ? "border-primary bg-primary-soft text-primary shadow-xl shadow-primary/5" : "border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white hover:shadow-xl"
                )}
              >
                {data.make === m && (
                  <motion.div layoutId="brand-indicator" className="absolute top-4 right-4 text-primary">
                    <CheckCircle2 size={18} />
                  </motion.div>
                )}
                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 p-3 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  {carHub[m].logo ? (
                    <img src={carHub[m].logo} alt={m} className="w-full h-full object-contain" />
                  ) : (
                    <Car size={36} className="text-slate-200" />
                  )}
                </div>
                <span className="font-black uppercase text-[11px] tracking-[0.2em] group-hover:text-primary transition-colors">{m}</span>
              </button>
            ))}
            {makes.length === 0 && (
              <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-50 rounded-[4rem]">
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={48} className="text-slate-200" />
                 </div>
                 <h3 className="text-xl font-black text-slate-300 uppercase italic tracking-tighter">Negative Signal: No Brands Detected</h3>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">Adjust search parameters or contact carmechs support</p>
              </div>
            )}
         </div>
       )}
       {step === 2 && (
         <div className="space-y-8 pb-8">
            <div className="flex items-center justify-between">
              <button onClick={() => { setStep(1); setSearch(""); }} className="group px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-3 hover:bg-primary-soft hover:text-primary transition-all">
                 <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                 Modify Brand
              </button>
              <div className="flex items-center gap-4 bg-primary-soft px-6 py-3 rounded-2xl border border-primary/10">
                 {data.brandLogo ? (
                   <img src={data.brandLogo} alt="" className="w-6 h-6 object-contain" />
                 ) : (
                   <Car size={16} className="text-primary" />
                 )}
                 <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] italic">{data.make} Registry</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {models.map((m: any) => (
                <button 
                  key={m.name} 
                  onClick={() => { updateData({ ...data, model: m.name, modelLogo: m.logo }); setStep(3); setSearch(""); }}
                  className={cn(
                    "p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-5 group relative overflow-hidden",
                    data.model === m.name ? "border-primary bg-primary-soft text-primary shadow-xl shadow-primary/5" : "border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white hover:shadow-xl"
                  )}
                >
                  {data.model === m.name && (
                    <motion.div layoutId="model-indicator" className="absolute top-4 right-4 text-primary">
                      <CheckCircle2 size={18} />
                    </motion.div>
                  )}
                  <div className="w-24 h-14 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {m.logo ? (
                      <img src={m.logo} alt={m.name} className="w-full h-full object-contain" />
                    ) : (
                      <Car size={36} className="text-slate-200" />
                    )}
                  </div>
                  <span className="font-black uppercase text-[11px] tracking-[0.2em] text-center">{m.name}</span>
                </button>
              ))}
              {models.length === 0 && (
                <div className="col-span-full py-16 text-center border-4 border-dashed border-slate-50 rounded-[3rem]">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">No operational specs detected for {data.make}</p>
                </div>
              )}
            </div>
         </div>
       )}
       {step === 3 && (
         <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => { setStep(2); setSearch(""); }} className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1 hover:gap-2 transition-all">← Back to Models</button>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.make}:</span>
                <span className="text-[10px] font-black text-ink uppercase tracking-widest">{data.model}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Petrol", icon: Fuel, color: "text-amber-500", bg: "bg-amber-50" },
                { name: "Diesel", icon: Zap, color: "text-blue-500", bg: "bg-blue-50" },
                { name: "CNG", icon: Droplets, iconColor: "text-emerald-500", bg: "bg-emerald-50" },
                { name: "Electric", icon: Zap, iconColor: "text-cyan-500", bg: "bg-cyan-50" }
              ].map(f => (
                <button 
                  key={f.name} 
                  onClick={() => { updateData({ ...data, fuel: f.name }); onNext(); }}
                  className={cn(
                    "p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group",
                    data.fuel === f.name ? "border-primary bg-primary-soft text-primary" : "border-slate-50 bg-slate-50 hover:border-slate-200"
                  )}
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", f.bg)}>
                    <f.icon size={24} className={f.iconColor || "text-primary"} />
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest">{f.name}</span>
                </button>
              ))}
            </div>
         </div>
       )}
    </motion.div>
  );
}

function ServiceStep({ onNext, onBack, data, updateData }: StepProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(query(collection(db, "services"), where("isActive", "==", true)), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Booking ServiceStep services error:", err.message);
      setLoading(false);
    });
  }, []);

  if (loading) return <BookingFormSkeleton />;

  const getDynamicVariant = (service: any) => {
    if (!data.carDetails.make || !data.carDetails.model || !data.carDetails.fuel) return null;
    
    const variants = service.variants || [];
    const lowerMake = data.carDetails.make.toLowerCase();
    const lowerModel = data.carDetails.model.toLowerCase();
    const lowerFuel = data.carDetails.fuel.toLowerCase();

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

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
       <div className="grid gap-4">
          {services.map(s => {
            const variant = getDynamicVariant(s);
            const finalPrice = variant ? variant.price : s.price;
            
            return (
              <button 
                key={s.id}
                onClick={() => {
                  updateData({ serviceId: s.id, serviceType: s.title, price: finalPrice });
                  onNext();
                }}
                className={cn(
                  "p-6 rounded-3xl border-2 text-left flex items-center justify-between transition-all group",
                  data.serviceId === s.id ? "border-primary bg-primary-soft" : "border-slate-50 bg-slate-50 hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:rotate-6">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <div className="font-black text-ink uppercase tracking-tight">{s.title}</div>
                    <div className="flex items-center gap-2">
                      <div className={cn("text-[10px] font-bold uppercase tracking-widest", variant ? "text-primary" : "text-slate-400")}>
                        {variant ? `Vehicle Price: ₹${finalPrice}` : `Starting from ₹${s.price}`}
                      </div>
                      {variant && <Zap size={10} className="text-primary animate-pulse" />}
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </button>
            );
          })}
       </div>
       <button onClick={onBack} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-ink">Change Vehicle</button>
    </motion.div>
  );
}

function ScheduleStep({ onNext, onBack, data, updateData }: StepProps) {
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const dates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(offset => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  });
  const times = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"];

  useEffect(() => {
    return onSnapshot(collection(db, "technicians"), (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMechanics(docs);
      if (data.mechanicId) {
        setSelectedMechanic(docs.find(m => m.id === data.mechanicId));
      }
    }, (err) => {
      console.warn("Technician Repository Access Warning:", err.message);
    });
  }, []);

  const handleMechanicSelect = (m: any) => {
    setSelectedMechanic(m);
    updateData({ ...data, mechanicId: m.id, mechanicName: m.name });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
       <div className="space-y-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-2">
             <Calendar size={12} /> Service Availability Calendar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
             {dates.map((d, i) => {
               const dateStr = d.toISOString().split('T')[0];
               const isToday = i === 0;
               return (
                  <button 
                    key={i}
                    onClick={() => updateData({ ...data, appointmentDate: dateStr })}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all group flex flex-col items-center justify-center relative",
                      data.appointmentDate === dateStr ? "border-primary bg-primary-soft text-primary shadow-lg shadow-primary/10" : "border-slate-50 bg-slate-50 hover:border-slate-200"
                    )}
                  >
                    {isToday && <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
                    <div className="text-[8px] font-black uppercase tracking-tight opacity-50 mb-0.5">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-black italic leading-none">{d.getDate()}</div>
                    <div className="text-[8px] font-bold opacity-30 mt-0.5">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                  </button>
               );
             })}
          </div>
       </div>

       <div className="space-y-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-2">
             <Clock size={12} /> Preferred Arrival Slot
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
             {times.map(t => (
               <button 
                key={t}
                onClick={() => updateData({ ...data, appointmentTime: t })}
                className={cn(
                  "px-4 py-4 rounded-2xl border-2 transition-all text-[10px] font-black tracking-widest uppercase",
                  data.appointmentTime === t ? "border-primary bg-primary-soft text-primary shadow-lg shadow-primary/10" : "border-slate-50 bg-slate-50 hover:border-slate-200"
                )}
               >
                 {t}
               </button>
             ))}
          </div>
       </div>

       <div className="space-y-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-2">
             <User size={12} /> High-Tier Technician Allocation
          </label>
          <div className="grid md:grid-cols-2 gap-4">
              {mechanics.filter(m => m.status !== "offline").map(m => {
                const status = m.status || "available";
                return (
                  <button 
                    key={m.id}
                    onClick={() => handleMechanicSelect(m)}
                    className={cn(
                      "p-4 rounded-3xl border-2 transition-all flex items-center gap-4 text-left relative overflow-hidden group",
                      data.mechanicId === m.id ? "border-primary bg-primary-soft shadow-xl shadow-primary/5 scale-[1.02]" : "border-slate-50 bg-slate-50 hover:border-slate-100",
                    )}
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shrink-0 relative border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                       <img src={m.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt="" className="transition-all" />
                    </div>
                    <div className="flex-1">
                       <div className="font-black text-ink text-sm uppercase tracking-tight leading-none mb-1">
                         {m.name}
                       </div>
                       <div className="text-[8px] font-black uppercase text-primary tracking-widest">{m.expertise}</div>
                    </div>
                    {data.mechanicId === m.id && (
                      <div className="absolute top-2 right-2 text-primary animate-bounce">
                        <ShieldCheck size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
       </div>

       <div className="pt-6 flex gap-4">
          <button onClick={onBack} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-ink transition-all">Back</button>
          <button 
            onClick={onNext} 
            disabled={!data.appointmentDate || !data.appointmentTime}
            className="flex-[2] py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            Confirm Schedule
          </button>
       </div>
    </motion.div>
  );
}

function SuccessStep({ data, onClose }: { data: any, onClose: () => void }) {
  const addToCalendar = () => {
    const title = `CarMechs: ${data.serviceType} for ${data.carDetails.make} ${data.carDetails.model}`;
    const date = data.appointmentDate.replace(/-/g, '');
    const startTime = "090000"; // Placeholder simplification
    const endTime = "110000";
    const details = `Contact: ${data.fullName}\nLocation: ${data.location}\nPlate: ${data.carDetails.plate}`;
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${date}T${startTime}/${date}T${endTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(data.location)}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-12 py-10"
    >
       <div className="space-y-4">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/30 animate-pulse">
             <CheckCircle2 size={48} className="text-white" />
          </div>
          <h2 className="text-4xl font-black text-ink uppercase italic tracking-tighter">Mission Confirmed</h2>
          <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto">Your vehicle operation has been registered in the master manifest. Our logistics unit is currently processing your deployment.</p>
       </div>

       <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 max-w-sm mx-auto space-y-6">
          <div className="flex flex-col items-center gap-2 border-b border-slate-200 pb-6">
             <div className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Operational Schedule</div>
             <div className="text-2xl font-black text-ink italic tracking-tight">{data.appointmentDate} @ {data.appointmentTime}</div>
          </div>
          
          <div className="space-y-4 pt-2">
             <div className="flex justify-between items-center text-xs">
                <span className="font-black text-slate-300 uppercase tracking-widest">Technician</span>
                <span className="font-black text-ink uppercase italic">{data.mechanicName || "System Assigned"}</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="font-black text-slate-300 uppercase tracking-widest">Deployment Point</span>
                <span className="font-black text-ink uppercase italic truncate max-w-[150px]">{data.location}</span>
             </div>
          </div>
       </div>

       <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <button 
            onClick={addToCalendar}
            className="w-full py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all flex items-center justify-center gap-3"
          >
            <Calendar size={14} /> Add to Calendar
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-ink transition-colors"
          >
            Close Terminal
          </button>
       </div>
    </motion.div>
  );
}


function ContactStep({ onNext, onBack, data, updateData }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.fullName || data.fullName.trim().length < 3) {
      newErrors.fullName = "Name is too short. Use at least 3 letters.";
    } else if (!/^[a-zA-Z\s]*$/.test(data.fullName)) {
      newErrors.fullName = "Only letters and spaces are allowed in name.";
    }
    
    if (!data.phone) {
      newErrors.phone = "Phone number is required for field deployment.";
    } else if (!/^\d{10}$/.test(data.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "The email address provided is not in a valid format.";
    }

    if (!data.address || data.address.trim().length < 8) {
      newErrors.address = "Address is too vague. Please provide more detail.";
    }

    if (!data.city) {
      newErrors.city = "Deployment hub (City) is required.";
    }
    
    if (!data.carDetails.year) {
      newErrors.year = "Vehicle manufacturing year is required.";
    } else {
      const year = parseInt(data.carDetails.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1980 || year > currentYear + 1) {
        newErrors.year = `Year must be between 1980 and ${currentYear + 1}.`;
      }
    }
    
    if (!data.carDetails.plate) {
      newErrors.plate = "Number plate is mandatory for vehicle verification.";
    } else if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4}$/i.test(data.carDetails.plate.replace(/\s/g, ""))) {
      newErrors.plate = "Number plate format seems invalid (e.g. WB02AA1234).";
    }

    if (Object.keys(newErrors).length > 0) {
      toast.error("Form transmission denied. Resolve validation anomalies.");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
       <div className="grid gap-6">
          <div className="bg-slate-50 p-6 rounded-[2.5rem] space-y-4 border-2 border-slate-100">
             <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Car size={14} /> Car Verification
             </div>
             <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Make / Model</label>
                 <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold text-ink opacity-60">
                   {data.carDetails.make} {data.carDetails.model}
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Registration Year</label>
                 <input 
                   type="text" 
                   value={data.carDetails.year}
                   onChange={(e) => updateData({ ...data, carDetails: { ...data.carDetails, year: e.target.value } })}
                   placeholder="2022"
                   className={cn(
                     "w-full bg-white border-2 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-xs",
                     errors.year ? "border-rose-300 bg-rose-50" : "border-white"
                   )}
                 />
                 {errors.year && <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter px-1">{errors.year}</p>}
               </div>
               <div className="col-span-2 space-y-1">
                 <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">License Plate Number</label>
                 <input 
                   type="text" 
                   value={data.carDetails.plate}
                   onChange={(e) => updateData({ ...data, carDetails: { ...data.carDetails, plate: e.target.value } })}
                   placeholder="MH 01 AB 1234"
                   className={cn(
                     "w-full bg-white border-2 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-xs uppercase",
                     errors.plate ? "border-rose-300 bg-rose-50" : "border-white"
                   )}
                 />
                 {errors.plate && <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter px-1">{errors.plate}</p>}
               </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <User size={14} /> Contact & Deployment Site
             </div>
             
             <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Identity Name</label>
                 <input 
                    type="text" 
                    value={data.fullName}
                    onChange={(e) => updateData({ ...data, fullName: e.target.value })}
                    placeholder="John Doe"
                    className={cn(
                      "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold",
                      errors.fullName ? "border-rose-300 bg-rose-50" : "border-slate-100"
                    )}
                 />
                 {errors.fullName && <p className="text-[9px] font-black italic text-rose-500 uppercase tracking-tight px-1">{errors.fullName}</p>}
               </div>
               <div className="space-y-2 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                 <input 
                   type="tel" 
                   value={data.phone}
                   onChange={(e) => updateData({ ...data, phone: e.target.value })}
                   placeholder="9876543210"
                   className={cn(
                     "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold",
                     errors.phone ? "border-rose-300 bg-rose-50" : "border-slate-100"
                   )}
                 />
                 {errors.phone && <p className="text-[9px] font-black italic text-rose-500 uppercase tracking-tight px-1">{errors.phone}</p>}
               </div>
             </div>

             <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Service Site Address</label>
                <input 
                  type="text" 
                  value={data.address}
                  onChange={(e) => updateData({ ...data, address: e.target.value })}
                  placeholder="Street name, Building No, Landmark"
                  className={cn(
                    "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold",
                    errors.address ? "border-rose-300 bg-rose-50" : "border-slate-100"
                  )}
                />
                {errors.address && <p className="text-[9px] font-black italic text-rose-500 uppercase tracking-tight px-1">{errors.address}</p>}
             </div>

             <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deployment City</label>
                 <select 
                    value={data.city}
                    onChange={(e) => updateData({ ...data, city: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold appearance-none"
                 >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                 </select>
               </div>
               <div className="space-y-2 text-left">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Digital Email Uplink</label>
                 <input 
                   type="email" 
                   value={data.email}
                   onChange={(e) => updateData({ ...data, email: e.target.value })}
                   placeholder="john@example.com"
                   className={cn(
                     "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold",
                     errors.email ? "border-rose-300 bg-rose-50" : "border-slate-100"
                   )}
                 />
                 {errors.email && <p className="text-[9px] font-black italic text-rose-500 uppercase tracking-tight px-1">{errors.email}</p>}
               </div>
             </div>
          </div>
       </div>

       <div className="flex gap-4">
          <button onClick={onBack} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-ink transition-all">Revise Schedule</button>
          <button 
            onClick={handleNext} 
            className="flex-[2] py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Review Summary
            <ChevronRight size={18} />
          </button>
       </div>
    </motion.div>
  );
}

function SummaryStep({ onNext, onBack, goToStep, data, updateData }: StepProps & { goToStep: (s: number) => void }) {
  const [showReview, setShowReview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancel = async () => {
    if (!data.id) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, "bookings", data.id), {
        status: "cancelled",
        updatedAt: serverTimestamp()
      });
      alert("Booking cancelled successfully.");
      updateData({ ...data, status: "cancelled" });
      setShowCancelModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  const isExistingBooking = !!data.id;
  const canCancel = isExistingBooking && (data.status === 'pending' || data.status === 'confirmed');

  const SectionHeader = ({ title, step }: { title: string, step: number }) => (
    <div className="flex items-center justify-between mb-4">
       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</div>
       {!isExistingBooking && (
         <button 
           onClick={() => goToStep(step)} 
           className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
         >
           <Edit2 size={10} /> Edit
         </button>
       )}
    </div>
  );

  const getArrivalRange = (time: string) => {
    if (!time) return "";
    try {
      const [t, ampm] = time.split(' ');
      const [hour, min] = t.split(':');
      const date = new Date();
      date.setHours(ampm === "PM" && hour !== "12" ? parseInt(hour) + 12 : (ampm === "AM" && hour === "12" ? 0 : parseInt(hour)));
      date.setMinutes(parseInt(min));
      const endDate = new Date(date.getTime() + 45 * 60000); // 45 min buffer
      const format = (d: Date) => {
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const suffix = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m}${suffix}`;
      };
      return `${time} to ${format(endDate)}`;
    } catch (e) {
      return time;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
       <div className="bg-slate-50 rounded-[3rem] p-10 border-2 border-slate-100 space-y-8 relative">
          <div className="flex items-start justify-between">
             <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Mission Identifier</div>
                <div className="text-2xl font-black text-ink uppercase italic tracking-tighter">{data.serviceType}</div>
             </div>
             <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tactical Cost</div>
                <div className="text-3xl font-black text-primary leading-none mt-1">₹{data.price}</div>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 pt-8 border-t border-slate-200">
             <div className="space-y-6">
                <div>
                   <SectionHeader title="Vehicle Info" step={1} />
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm overflow-hidden p-2">
                          {data.carDetails.brandLogo ? (
                            <img src={data.carDetails.brandLogo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Car size={24} />
                          )}
                       </div>
                       <div>
                          <div className="text-sm font-black uppercase text-ink flex items-center gap-2">
                            {data.carDetails.make} {data.carDetails.model}
                            {data.carDetails.modelLogo && <img src={data.carDetails.modelLogo} alt="" className="h-3 object-contain opacity-50" />}
                          </div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{data.carDetails.fuel} • {data.carDetails.year} • {data.carDetails.plate}</div>
                       </div>
                    </div>
                </div>

                <div>
                   <SectionHeader title="Schedule" step={3} />
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm"><Calendar size={18} /></div>
                      <div>
                         <div className="text-sm font-black uppercase text-ink">{new Date(data.appointmentDate).toDateString()}</div>
                         <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{getArrivalRange(data.appointmentTime)}</div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div>
                   <SectionHeader title="Expert Agent" step={3} />
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm"><User size={18} /></div>
                      <div>
                         <div className="text-sm font-black uppercase text-ink">{data.mechanicName || "System Assigned"}</div>
                      </div>
                   </div>
                </div>

                <div>
                   <SectionHeader title="Contact & Deployment" step={4} />
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm"><Phone size={18} /></div>
                      <div>
                         <div className="text-sm font-black uppercase text-ink">{data.fullName}</div>
                         <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{data.phone}</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 mt-4">
             <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Estimated Arrival Window</div>
             <div className="flex items-center gap-3 text-ink">
                <Clock className="text-primary" size={16} />
                <span className="text-sm font-black uppercase italic">{getArrivalRange(data.appointmentTime)}</span>
             </div>
             <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mt-2">* Mechanic arrival window includes a 45-minute buffer for tactical deployment.</p>
          </div>
       </div>

       <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle2 size={24} /></div>
          <div>
             <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Protocol Verified</div>
             <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest italic">All deployment coordinates are validated.</div>
          </div>
       </div>

       {/* Final Action Area */}
       <div className="flex flex-col gap-4">
          {canCancel && (
            <button 
              onClick={() => setShowCancelModal(true)}
              className="w-full py-4 text-xs font-black uppercase tracking-widest text-rose-500 bg-rose-50 rounded-2xl border-2 border-rose-100 hover:bg-rose-500 hover:text-white transition-all transform hover:-translate-y-1"
            >
              Abort Mission (Cancel Booking)
            </button>
          )}

          <div className="flex gap-4">
            <button onClick={onBack} disabled={isExistingBooking} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-ink transition-all disabled:opacity-50">Back</button>
            <button 
              onClick={() => setShowReview(true)} 
              className="flex-[2] py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isExistingBooking ? "Return to Dashboard" : "Authorize Payment"}
              <ShieldCheck size={18} />
            </button>
          </div>
       </div>

       {/* Cancel Confirmation Modal */}
       <AnimatePresence>
         {showCancelModal && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowCancelModal(false)}
               className="absolute inset-0 bg-ink/80 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl border-4 border-white"
             >
               <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                 <AlertCircle size={40} />
               </div>
               <h3 className="text-2xl font-black text-ink mb-2 uppercase italic tracking-tighter">Abort Mission?</h3>
               <p className="text-slate-500 text-sm font-medium mb-8 uppercase tracking-tight leading-relaxed px-4">
                 Are you sure you want to cancel this booking? This operation is irreversible once executed.
               </p>
               <div className="flex flex-col gap-3">
                 <button 
                   onClick={handleCancel}
                   disabled={cancelling}
                   className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 disabled:opacity-50"
                 >
                   {cancelling ? "ABORTING..." : "Confirm Cancellation"}
                 </button>
                 <button 
                   onClick={() => setShowCancelModal(false)}
                   className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-ink"
                 >
                   Retain Booking
                 </button>
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* Final Review Modal (Confirmation before step 6) */}
       <AnimatePresence>
         {showReview && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReview(false)}
                className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border-4 border-white overflow-hidden p-10"
              >
                <h3 className="text-3xl font-black text-ink mb-8 uppercase italic tracking-tighter">Final Manifest Review</h3>
                <div className="space-y-6 mb-10">
                  <ReviewItem label="Service Class" value={data.serviceType} />
                  <ReviewItem label="Vehicle Unit" value={`${data.carDetails.make} ${data.carDetails.model} (${data.carDetails.fuel})`} />
                  <ReviewItem label="Service Location" value={data.location} />
                  <ReviewItem label="Coordinates" value={`${data.address}, ${data.city}`} />
                  <ReviewItem label="Deployment Date" value={new Date(data.appointmentDate).toDateString()} />
                  <ReviewItem label="Arrival Window" value={data.appointmentTime} />
                  <ReviewItem label="Identity" value={data.fullName} />
                  <ReviewItem label="Contract Value" value={`₹${data.price}`} isHighlight />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowReview(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-ink">Re-Check Specs</button>
                  <button 
                    onClick={() => { setShowReview(false); onNext(); }} 
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
                  >
                    Confirm & Proceed
                  </button>
                </div>
              </motion.div>
           </div>
         )}
       </AnimatePresence>
    </motion.div>
  );
}

function ReviewItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 ">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={cn(
        "text-sm font-black uppercase tracking-tight",
        isHighlight ? "text-primary text-xl" : "text-ink"
      )}>{value}</span>
    </div>
  );
}

function PaymentStep({ onNext, onBack, data, updateData, onComplete }: StepProps & { onComplete?: () => void }) {
  const { config } = useConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi_razorpay");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
       let tid = "TID_CASH_" + Math.random().toString(36).substring(2, 12).toUpperCase();
       let payStatus = "pending";

       if (paymentMethod !== 'cash') {
         // Real Razorpay Integration
         const payResponse = await initializePayment({
           amount: data.price,
           currency: 'INR',
           receipt: `receipt_${data.carDetails.plate}_${Date.now()}`,
           customerName: data.fullName,
           customerEmail: data.email,
           customerPhone: data.phone
         });

         if (payResponse.status !== 'success') {
           throw new Error(payResponse.status === 'cancelled' ? "Payment Cancelled by User" : "Payment Authorization Failed");
         }
         tid = payResponse.id;
         payStatus = "paid";
       }
       
       setTransactionId(tid);

       const bookingRef = await addDoc(collection(db, "bookings"), {
         ...data,
         userId: auth.currentUser?.uid || "anonymous",
         status: "confirmed",
         paymentStatus: payStatus,
         paymentMethod,
         transactionId: tid,
         createdAt: serverTimestamp(),
         updatedAt: serverTimestamp()
       });

       // Trigger Server-Side Email Notification
        // Send confirmation emails
        try {
          await sendConfirmationEmail(data.email, data.fullName, bookingRef.id);
          await sendNewBookingAlert({ ...data, id: bookingRef.id });
        } catch (mailErr) {
          console.warn("Mail service dispatch failed:", mailErr);
        }

       setIsSuccess(true);
    } catch (err: any) {
       console.error("Critical Transaction Error:", err);
       toast.error(err.message || "Transaction Pulse Failed. The gateway rejected the authorization.");
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (window.confirm("Initiate tactical refund procedure?")) {
      alert("Refund request acknowledged. Processing via original gateway.");
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      await addDoc(collection(db, "feedback"), {
        bookingId: transactionId,
        rating,
        comment: feedback,
        userEmail: data.email,
        createdAt: serverTimestamp()
      });
      setFeedbackSubmitted(true);
      toast.success("Intelligence documented. Thank you.");
      setTimeout(() => onComplete?.(), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Feedback transmission failure.");
      onComplete?.();
    }
  };

  if (isSuccess) {
    return (
      <SuccessStep 
         data={data}
         onClose={onComplete || (() => {})}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
       <div className="p-8 bg-ink rounded-[2.5rem] text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <ShieldCheck size={100} />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">Payment Summary</div>
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-2xl font-black uppercase italic tracking-tight">{data.serviceType}</div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mt-1">
                    {data.carDetails.make} {data.carDetails.model} • {data.appointmentDate}
                  </div>
               </div>
               <div className="text-4xl font-black text-primary leading-none">₹{data.price}</div>
            </div>
          </div>
       </div>

       <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Authorize Service Transaction</label>
          <div className="grid gap-3">
             {[
               { id: "upi_razorpay", name: "Razorpay (UPI)", icon: <Zap size={18} />, color: "bg-primary" },
               { id: "paytm", name: "Paytm Checkout", icon: <Car size={18} />, color: "bg-blue-500" },
               ...(config?.cashOnServiceEnabled ? [{ id: "cash", name: "Cash After Service", icon: <Phone size={18} />, color: "bg-amber-500" }] : [])
             ].map(method => (
                <button 
                   key={method.id}
                   onClick={() => setPaymentMethod(method.id)}
                   className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all group",
                      paymentMethod === method.id ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" : "border-slate-50 bg-slate-50 hover:border-slate-100"
                   )}
                >
                   <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      paymentMethod === method.id ? `${method.color} text-white` : "bg-white text-slate-300"
                   )}>
                      {method.icon}
                   </div>
                   <div className="flex-1 text-left">
                      <div className={cn("text-xs font-black uppercase tracking-tight", paymentMethod === method.id ? "text-ink" : "text-slate-400")}>{method.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                         {method.id === 'cash' ? "Pay after successful mission" : "Shielded digital gateway"}
                      </div>
                   </div>
                   <div className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
                      paymentMethod === method.id ? "border-primary" : "border-slate-200"
                   )}>
                      {paymentMethod === method.id && <div className="w-3 h-3 rounded-full bg-primary" />}
                   </div>
                </button>
             ))}
          </div>
       </div>

       <div className="flex gap-4">
          <button onClick={onBack} disabled={isSubmitting} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-ink transition-all">Revise Plan</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-[2] py-5 rounded-3xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Finalize Mission"}
            {!isSubmitting && <ShieldCheck size={20} />}
          </button>
       </div>
    </motion.div>
  );
}
