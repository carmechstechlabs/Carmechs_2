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
  Droplets,
  Globe,
  X,
  Check,
  MapPin,
  Gift,
  ChevronDown,
  Wind,
  Shield,
  Hash,
  Gauge
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc, increment, orderBy } from "firebase/firestore";
import { cn } from "../lib/utils";
import { useConfig } from "../hooks/useConfig";
import { useAuth } from "../hooks/useAuth";
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
  userGarage?: any[];
  key?: string;
}

export default function BookingSystem({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [bookingData, setBookingData] = useState({
    carDetails: { make: "", model: "", fuel: "", year: "", plate: "", engine: "", brandLogo: "", modelLogo: "" },
    location: "Main Workshop - Mumbai Central", // Default
    locationId: "main-mumbai", // Default
    serviceId: "",
    serviceType: "",
    cart: [] as any[],
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
    message: "",
    pointsRedeemed: 0,
    discount: 0,
    saveVehicle: false
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setBookingData(prev => ({
          ...prev,
          fullName: u.displayName || prev.fullName,
          email: u.email || prev.email,
          phone: u.phoneNumber || prev.phone
        }));
        
        // Fetch User's Tactical Garage
        const q = query(collection(db, "users", u.uid, "garage"), orderBy("createdAt", "desc"));
        const unsubGarage = onSnapshot(q, (snap) => {
          setUserGarage(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch additional profile info if needed
        getDoc(doc(db, "users", u.uid)).then(snap => {
          if (snap.exists()) {
            const profile = snap.data();
            setBookingData(prev => ({
              ...prev,
              fullName: profile.fullName || profile.name || prev.fullName,
              phone: profile.phone || profile.phoneNumber || prev.phone,
              address: profile.address || prev.address,
              city: profile.city || prev.city,
            }));
          }
        });

        return () => unsubGarage();
      } else {
        setUserGarage([]);
      }
    });
    return unsubAuth;
  }, []);

  // Recalculate dynamic pricing whenever vehicle details or cart changes
  useEffect(() => {
    if (bookingData.cart.length === 0) return;

    const recalibratePrices = async () => {
      // We need the service variants to recalculate
      const serviceIds = bookingData.cart.map((item: any) => item.id);
      const updatedCart = [...bookingData.cart];
      let hasChanged = false;

      // This is a bit expensive, but ensures accuracy.
      // Optimization: Only update if carDetails actually changed significantly
      for (let i = 0; i < updatedCart.length; i++) {
        const item = updatedCart[i];
        const sDoc = await getDoc(doc(db, "services", item.id));
        if (sDoc.exists()) {
          const service = sDoc.data();
          const variant = getDynamicVariant(service, bookingData.carDetails);
          const finalPrice = variant ? variant.price : service.price;
          if (item.price !== finalPrice) {
            updatedCart[i] = { ...item, price: finalPrice };
            hasChanged = true;
          }
        }
      }

      if (hasChanged) {
        const total = updatedCart.reduce((acc: number, item: any) => acc + item.price, 0);
        setBookingData(prev => ({
          ...prev,
          cart: updatedCart,
          price: total,
          serviceType: updatedCart.length > 0 ? (updatedCart.length === 1 ? updatedCart[0].title : `${updatedCart[0].title} + ${updatedCart.length - 1} more`) : prev.serviceType
        }));
      }
    };

    recalibratePrices();
  }, [bookingData.carDetails.make, bookingData.carDetails.model, bookingData.carDetails.fuel]);

  const getDynamicVariant = (service: any, carDetails: any) => {
    if (!carDetails.make || !carDetails.model || !carDetails.fuel) return null;
    const variants = service.variants || [];
    const lowerMake = carDetails.make.toLowerCase();
    const lowerModel = carDetails.model.toLowerCase();
    const lowerFuel = carDetails.fuel.toLowerCase();

    return variants.find((v: any) => v.make.toLowerCase() === lowerMake && v.model.toLowerCase() === lowerModel && v.fuel.toLowerCase() === lowerFuel) ||
           variants.find((v: any) => v.make.toLowerCase() === lowerMake && v.model.toLowerCase() === lowerModel && v.fuel.toLowerCase() === "all" ) ||
           variants.find((v: any) => v.make.toLowerCase() === lowerMake && v.model.toLowerCase() === "all" && v.fuel.toLowerCase() === lowerFuel ) ||
           variants.find((v: any) => v.make.toLowerCase() === "all" && v.fuel.toLowerCase() === lowerFuel ) ||
           variants.find((v: any) => v.make.toLowerCase() === lowerMake && v.model.toLowerCase() === "all" && v.fuel.toLowerCase() === "all" );
  };

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(true);
  const [userGarage, setUserGarage] = useState<any[]>([]);

  useEffect(() => {
    // Show only available technicians as requested
    const q = query(collection(db, "technicians"), where("status", "==", "available"));
    return onSnapshot(q, (snap) => {
      setTechnicians(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingTechs(false);
    }, (err) => {
      console.warn("Technician availability uplink failed:", err.message);
      setLoadingTechs(false);
    });
  }, []);

  const nextStep = () => setStep(prev => prev + 1);
  const backStep = () => setStep(prev => prev - 1);
  const goToStep = (s: number) => setStep(s);

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-white overflow-hidden max-w-4xl w-full mx-auto relative h-[85vh] flex flex-col">
        {/* Progress Stepper */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-50 overflow-hidden z-20">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 8) * 100}%` }}
          />
        </div>

        <div className="px-12 pt-12 pb-6 flex items-center justify-between relative z-10 border-b border-slate-50">
           <div className="flex-1">
             <div className="flex items-center gap-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <div key={s} className="flex items-center">
                    <motion.div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                        s < step ? "bg-emerald-500 text-white" : s === step ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-slate-100 text-slate-400"
                      )}
                      animate={s === step ? { scale: [1, 1.1, 1] } : {}}
                      transition={s === step ? { repeat: Infinity, duration: 2 } : {}}
                    >
                      {s < step ? <CheckCircle2 size={14} /> : s}
                    </motion.div>
                    {s < 8 && <div className={cn("w-4 h-0.5 mx-1", s < step ? "bg-emerald-200" : "bg-slate-50")} />}
                  </div>
                ))}
             </div>
             <div>
                <h2 className="text-4xl font-black text-ink tracking-tight flex items-center gap-4 italic uppercase">
                   <div className="w-1.5 h-10 bg-primary rounded-full hidden md:block" />
                   {step === 1 && "Vehicle Selection"}
                   {step === 2 && "Tactical Location"}
                   {step === 3 && "Service Manifest"}
                   {step === 4 && "Deployment Logic"}
                   {step === 5 && "Operator Intel"}
                   {step === 6 && "Mission Control"}
                   {step === 7 && "Secure Terminal"}
                   {step === 8 && "Mission Success"}
                </h2>
             </div>
           </div>
           {onClose && (
             <button onClick={onClose} className="w-14 h-14 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:rotate-90 group">
               <X size={20} className="group-hover:scale-125 transition-transform" />
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
                  userGarage={userGarage}
                  updateData={(d) => setBookingData(prev => ({ ...prev, carDetails: d }))} 
               />
             )}
             {step === 2 && (
               <LocationStep
                  key="l"
                  onNext={nextStep}
                  onBack={backStep}
                  data={bookingData.location}
                  updateData={(l: any) => setBookingData(prev => ({ ...prev, location: l.name, locationId: l.id }))}
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
               <PaymentStep
                  key="p"
                  onNext={nextStep}
                  onBack={backStep}
                  data={bookingData}
                  updateData={(d) => setBookingData(prev => ({ ...prev, ...d }))}
                  onComplete={() => setStep(8)}
               />
             )}
             {step === 8 && (
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

function LocationStep({ onNext, onBack, data, updateData }: { onNext: () => void, onBack: () => void, data: string, updateData: (l: any) => void }) {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(query(collection(db, "locations"), where("isActive", "==", true)), (snap) => {
      setBranches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Location registry sync error:", err.message);
      setLoading(false);
    });
  }, []);

  if (loading) return <BookingFormSkeleton />;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="grid gap-6">
        {branches.map(b => {
          const isSelected = data === b.name;
          return (
            <button
              key={b.id}
              onClick={() => { updateData({ name: b.name, id: b.id }); onNext(); }}
              className={cn(
                "p-8 rounded-[3rem] border-4 text-left transition-all group flex items-start gap-6 relative overflow-hidden",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 scale-[1.02]" 
                  : "border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-[2rem] flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110", 
                isSelected ? "bg-primary text-white" : "bg-white text-slate-300 group-hover:text-primary"
              )}>
                <MapPin size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", isSelected ? "bg-primary text-white" : "bg-slate-200 text-slate-500")}>
                    {b.region || b.city || "Operational Hub"}
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-primary uppercase animate-pulse">
                      <Zap size={10} /> Active Selection
                    </div>
                  )}
                </div>
                <h4 className="text-2xl font-black text-ink uppercase italic tracking-tighter mb-2">{b.name}</h4>
                <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <Globe size={14} className="text-primary/40" /> {b.address}
                </p>
              </div>
              {isSelected && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-primary"
                >
                  <CheckCircle2 size={32} />
                </motion.div>
              )}
              {!isSelected && <ChevronRight size={24} className="text-slate-200 self-center group-hover:text-primary transition-colors" />}
              
              {isSelected && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                />
              )}
            </button>
          );
        })}
        {branches.length === 0 && (
          <div className="py-20 text-center border-4 border-dashed border-slate-50 rounded-[3rem] space-y-4">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Globe size={32} />
             </div>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic">No active tactical hubs detected in registry</p>
          </div>
        )}
      </div>
      <button onClick={onBack} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-ink">Change Vehicle</button>
    </motion.div>
  );
}

function VehicleStep({ onNext, data, updateData, userGarage = [] }: StepProps) {
  const [search, setSearch] = useState("");
  const [carHub, setCarHub] = useState<any>({});
  const [step, setStep] = useState(1); // 1: Brand, 2: Model, 3: Fuel, 4: Details
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualMake, setManualMake] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user: authUser } = useAuth();

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(data.year);

    if (!data.fuel) newErrors.fuel = "Required";
    
    if (data.year && (isNaN(yearNum) || yearNum < 1980 || yearNum > currentYear)) {
      newErrors.year = `Valid: 1980-${currentYear}`;
    }

    if (data.plate && (data.plate.length < 4 || data.plate.length > 15)) {
      newErrors.plate = "Length: 4-15 chars";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    // Basic real-time validation for step 3
    if (step === 3) {
      const currentYear = new Date().getFullYear();
      const yearNum = parseInt(data.year);
      const newErrors: Record<string, string> = { ...errors };

      if (data.year && (isNaN(yearNum) || yearNum < 1980 || yearNum > currentYear)) {
         newErrors.year = `Invalid Year (1980-${currentYear})`;
      } else {
         delete newErrors.year;
      }

      if (data.plate && (data.plate.length < 4 || data.plate.length > 15)) {
         newErrors.plate = "Plate length must be 4-15 characters";
      } else {
         delete newErrors.plate;
      }

      setErrors(newErrors);
    }
  }, [data.year, data.plate, step]);

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

  const searchLower = search.toLowerCase();
  const searchTerms = searchLower.split(/\s+/).filter(t => t.length > 0);

  const fuzzyMatch = (text: string) => {
    if (searchTerms.length === 0) return false;
    return searchTerms.every(term => text.toLowerCase().includes(term));
  };
  
  // Simultaneous filtering
  const searchResults = search.length > 1 ? Object.entries(carHub).flatMap(([brand, details]: [string, any]) => 
    details.models
      .filter((model: any) => fuzzyMatch(`${brand} ${model.name}`))
      .map((model: any) => ({
        brand,
        brandLogo: details.logo,
        modelName: model.name,
        modelLogo: model.logo
      }))
  ) : [];

  const makes = Object.keys(carHub).filter(m => fuzzyMatch(m) || search.length <= 1);
  
  // Highlight popular brands visually
  const featuredBrands = ["Maruti Suzuki", "Hyundai", "Toyota", "Honda", "Tata", "Mahindra"];
  const displayMakes = search.length <= 1 
    ? [...new Set([...featuredBrands.filter(f => carHub[f]), ...makes])]
    : makes;

  const selectedBrand = data.make ? carHub[data.make] : null;
  const models = selectedBrand ? selectedBrand.models.filter((m: any) => m.name.toLowerCase().includes(searchLower)) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
       {authUser && userGarage.length > 0 && step === 1 && search.length <= 1 && (
         <div className="space-y-4">
           <div className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Your Tactical Fleet</div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
             {userGarage.map((v: any) => (
               <button
                 key={v.id}
                 onClick={() => {
                   updateData({ 
                     ...data, 
                     make: v.make, 
                     model: v.model,
                     year: v.year,
                     plate: v.plate,
                     engine: v.engine || "",
                     brandLogo: carHub[v.make]?.logo || ""
                   });
                   onNext(); // Skip straight to step 2/3
                 }}
                 className="flex items-center gap-4 p-4 rounded-3xl border-2 border-primary-soft bg-primary-soft/30 hover:border-primary hover:bg-white transition-all group text-left shadow-sm"
               >
                 <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 border border-primary/10 transition-transform group-hover:scale-110">
                    <Car size={24} className="text-primary" />
                 </div>
                 <div className="flex-1">
                   <div className="text-[9px] font-black uppercase text-primary tracking-widest leading-none mb-1">{v.make} {v.model}</div>
                   <div className="text-xs font-black text-ink italic uppercase tracking-tighter">{v.plate}</div>
                 </div>
                 <ChevronRight size={16} className="text-primary/40 group-hover:text-primary" />
               </button>
             ))}
           </div>
           <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
              <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em] text-slate-300 bg-white px-2">OR NEW CONFIGURATION</div>
           </div>
         </div>
       )}
       {/* Search Bar */}
       <div className="relative group">
         <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
           <Car size={18} className="text-slate-300 group-focus-within:text-primary transition-colors" />
         </div>
         <input 
           type="text" 
           placeholder="Search across all brands & models..."
           value={search}
           onChange={(e) => { setSearch(e.target.value); setIsManualInput(false); }}
           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-5 outline-none focus:border-primary transition-all font-bold text-ink"
         />
       </div>

        {search.length > 0 && !isManualInput && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/20">
               <AlertCircle size={18} className="text-primary shrink-0" />
               <div className="text-[10px] font-bold text-primary uppercase tracking-tight">
                  Unit not found in our tactical database? Execute switch to Manual Profile Uplink.
               </div>
            </div>
            <button 
              onClick={() => {
                setIsManualInput(true);
                setManualMake("");
                setManualModel("");
              }}
              className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-primary bg-white rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary hover:bg-primary-soft transition-all"
            >
              Cannot find your unit? Switch to Manual Entry
            </button>
          </div>
        )}

        {isManualInput ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100"
          >
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Manual Make Input</label>
                <input 
                  type="text"
                  placeholder="e.g. BMW"
                  value={manualMake}
                  onChange={(e) => setManualMake(e.target.value)}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-black text-ink"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Manual Model Input</label>
                <input 
                  type="text"
                  placeholder="e.g. X5"
                  value={manualModel}
                  onChange={(e) => setManualModel(e.target.value)}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-black text-ink"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Manufacture Year</label>
                <input 
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 2022"
                  value={data.year || ""}
                  onChange={(e) => updateData({ ...data, year: e.target.value.replace(/\D/g, "") })}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-black text-ink"
                />
              </div>
            </div>
            <button 
              disabled={!manualMake || !manualModel}
              onClick={() => {
                updateData({ 
                  ...data, 
                  make: manualMake, 
                  model: manualModel,
                  brandLogo: "",
                  modelLogo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(manualMake)}&backgroundColor=334155`
                });
                setStep(3);
                setIsManualInput(false);
              }}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
            >
              Verify Tactical Specs
            </button>
          </motion.div>
        ) : search.length > 1 && searchResults.length > 0 && (
         <div className="space-y-4">
           <div className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Detected Vehicle Profiles</div>
           <div className="grid grid-cols-1 gap-3 pb-8">
             {searchResults.slice(0, 5).map((res: any, idx: number) => (
               <button
                 key={`${res.brand}-${res.modelName}-${idx}`}
                 onClick={() => {
                   updateData({ 
                     ...data, 
                     make: res.brand, 
                     brandLogo: res.brandLogo,
                     model: res.modelName,
                     modelLogo: res.modelLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(res.modelName)}&backgroundColor=334155&fontSize=45&bold=true`
                   });
                   setStep(3); // Model selected, go to fuel
                   setSearch("");
                 }}
                 className="flex items-center gap-6 p-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50 hover:border-primary hover:bg-white transition-all group text-left shadow-sm hover:shadow-xl"
               >
                 <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 p-3 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    {res.brandLogo ? <img src={res.brandLogo} alt="" className="w-full h-full object-contain" /> : <Car size={28} className="text-slate-200" />}
                 </div>
                 <div className="flex-1">
                   <div className="text-[10px] font-black uppercase text-primary tracking-[0.2em] leading-none mb-1.5">{res.brand} Series</div>
                   <div className="text-xl font-black text-ink italic uppercase tracking-tight">{res.modelName}</div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-200 group-hover:text-primary transition-all">
                    <ChevronRight size={20} />
                 </div>
               </button>
             ))}
           </div>
         </div>
       )}

       {search.length <= 1 && step === 1 && (
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
                  onClick={() => { 
                    const modelLogo = m.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}&backgroundColor=334155&fontSize=45&bold=true`;
                    updateData({ ...data, model: m.name, modelLogo }); 
                    setStep(3); 
                    setSearch(""); 
                  }}
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
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => { setStep(2); setSearch(""); }} 
                className="group px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-3 hover:bg-primary-soft hover:text-primary transition-all"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                Revise Model
              </button>
              <div className="flex items-center gap-4 bg-primary-soft px-6 py-3 rounded-2xl border border-primary/10">
                 <Shield size={16} className="text-primary" />
                 <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] italic">{data.make} {data.model} Specs</span>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-2">
                <Fuel size={12} /> Energy Source (Fuel)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {(() => {
                   const commonFuels = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"];
                   const selectedModelObj = carHub[data.make]?.models.find((m: any) => m.name === data.model);
                   const availableFuels = selectedModelObj?.fuelTypes && selectedModelObj.fuelTypes.length > 0 
                     ? selectedModelObj.fuelTypes 
                     : commonFuels;
                   const fuelIcons: any = {
                     "Petrol": { icon: Fuel, color: "text-amber-500", bg: "bg-amber-50" },
                     "Diesel": { icon: Droplets, color: "text-blue-500", bg: "bg-blue-50" },
                     "CNG": { icon: Wind, color: "text-emerald-500", bg: "bg-emerald-50" },
                     "Electric": { icon: Zap, color: "text-cyan-500", bg: "bg-cyan-50" },
                     "Hybrid": { icon: Zap, color: "text-indigo-500", bg: "bg-indigo-50" },
                     "LPG": { icon: Fuel, color: "text-orange-500", bg: "bg-orange-50" },
                     "Manual": { icon: Droplets, color: "text-primary", bg: "bg-primary-soft" }
                   };
                   const fuels = [...(availableFuels || []), "Manual"];
                   return fuels.map((fName: string) => {
                      const f = fuelIcons[fName] || { icon: Fuel, color: "text-slate-500", bg: "bg-amber-50" };
                      const isSelected = data.fuel === fName;
                      return (
                       <div key={fName} className="space-y-3">
                         <button 
                           onClick={() => updateData({ ...data, fuel: fName })}
                           className={cn(
                             "w-full p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                             isSelected ? "border-primary bg-primary-soft text-primary shadow-lg shadow-primary/10 scale-105" : "border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white"
                           )}
                         >
                           {isSelected && (
                             <motion.div layoutId="fuel-check" className="absolute top-2 right-2 text-primary">
                               <CheckCircle2 size={14} />
                             </motion.div>
                           )}
                           <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", isSelected ? "bg-white" : f.bg)}>
                             <f.icon size={20} className={f.color} />
                           </div>
                           <span className="font-black uppercase text-[10px] tracking-widest">{fName}</span>
                         </button>
                         {fName === "Manual" && isSelected && (
                           <motion.input 
                             initial={{ opacity: 0, y: -10 }}
                             animate={{ opacity: 1, y: 0 }}
                             type="text"
                             placeholder="Specify Fuel..."
                             value={data.manualFuel || ""}
                             onChange={(e) => updateData({ ...data, manualFuel: e.target.value.toUpperCase() })}
                             className="w-full bg-white border-2 border-primary/20 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary shadow-sm"
                           />
                         )}
                       </div>
                      );
                    });
                 })()}
              </div>
            </div>

            <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-white space-y-10 shadow-inner">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Manufacture Year <span className="text-[8px] opacity-60">(Optional)</span></label>
                      <Calendar size={14} className="text-slate-300" />
                    </div>
                    <input 
                      type="text" 
                      maxLength={4}
                      placeholder="e.g. 2022"
                      value={data.year}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        updateData({ ...data, year: val });
                      }}
                      className={cn(
                        "w-full bg-white border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-black text-ink text-xl tracking-[0.2em] shadow-sm text-center",
                        errors.year ? "border-rose-300 bg-rose-50" : "border-slate-100"
                      )}
                    />
                    {errors.year && <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter text-center mt-1">{errors.year}</p>}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Engine Cap. <span className="text-[8px] opacity-60">(Optional)</span></label>
                      <Gauge size={14} className="text-slate-300" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 1.2L"
                      value={data.engine || ""}
                      onChange={(e) => {
                        updateData({ ...data, engine: e.target.value.toUpperCase() });
                      }}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-black text-ink text-xl tracking-[0.1em] shadow-sm text-center"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">License Plate <span className="text-[8px] opacity-60">(Optional)</span></label>
                      <Hash size={14} className="text-slate-300" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="MH01AB1234"
                      value={data.plate}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                        updateData({ ...data, plate: val });
                      }}
                      className={cn(
                        "w-full bg-white border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-black text-ink text-xl tracking-[0.1em] shadow-sm text-center uppercase",
                        errors.plate ? "border-rose-300 bg-rose-50" : "border-slate-100"
                      )}
                    />
                    {errors.plate && <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter text-center mt-1">{errors.plate}</p>}
                  </div>
                </div>

                {authUser && !userGarage.some(v => v.plate === data.plate && data.plate !== "") && (
                  <div className="pt-6 border-t border-slate-200">
                    <button 
                      onClick={() => updateData({ ...data, saveVehicle: !data.saveVehicle })}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all group w-full sm:w-auto",
                        data.saveVehicle ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        data.saveVehicle ? "bg-white border-white text-primary" : "border-slate-200"
                      )}>
                        {data.saveVehicle && <Check size={14} strokeWidth={4} />}
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest">Add to Tactical Garage</div>
                        <div className={cn("text-[8px] font-bold uppercase tracking-tighter opacity-70", data.saveVehicle ? "text-white" : "text-slate-400")}>
                          Save these specs for lightning-fast future deployment
                        </div>
                      </div>
                    </button>
                  </div>
                )}
            </div>

            <button 
              disabled={!data.fuel || Object.keys(errors).length > 0}
              onClick={() => {
                if (validateStep3()) {
                   onNext();
                }
              }}
              className="w-full bg-primary text-white py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-4 group"
            >
              Verify & Lock Profile
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
     </motion.div>
  );
}

function ServiceStep({ onNext, onBack, data, updateData }: StepProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const cart = data.cart || [];

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
    if (data.carDetails.fuel === "No Preference") return null;
    
    const variants = service.variants || [];
    const lowerMake = data.carDetails.make.toLowerCase();
    const lowerModel = data.carDetails.model.toLowerCase();
    const lowerFuel = data.carDetails.fuel.toLowerCase();

    // Priority matching logic
    // 1. Exact Match (Make + Model + Fuel)
    const exactMatch = variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === lowerFuel
    );
    if (exactMatch) return exactMatch;

    // 2. Model Specific Match (Make + Model, Generic Fuel)
    const modelOnlyMatch = variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === "all"
    );
    if (modelOnlyMatch) return modelOnlyMatch;

    // 3. Fuel Specific Match (Make + Generic Model, Specific Fuel)
    const fuelOnlyMatch = variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === lowerFuel
    );
    if (fuelOnlyMatch) return fuelOnlyMatch;

    // 4. Brand Match (Make + Generic Model + Generic Fuel)
    const brandMatch = variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === "all"
    );
    if (brandMatch) return brandMatch;

    // 5. Broad Global Match (Wildcard)
    return variants.find((v: any) => 
      v.make.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === lowerFuel
    );
  };

  const toggleService = (s: any) => {
    const variant = getDynamicVariant(s);
    const finalPrice = variant ? variant.price : s.price;
    
    const isSelected = cart.find((item: any) => item.id === s.id);
    let newCart;
    if (isSelected) {
      newCart = cart.filter((item: any) => item.id !== s.id);
    } else {
      newCart = [...cart, { id: s.id, title: s.title, price: finalPrice, isVariant: !!variant }];
    }
    const total = newCart.reduce((acc: number, item: any) => acc + item.price, 0);
    updateData({ 
      ...data, 
      cart: newCart, 
      price: total,
      serviceType: newCart.length > 0 ? (newCart.length === 1 ? newCart[0].title : `${newCart[0].title} + ${newCart.length - 1} more`) : "No Service Selected"
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
       <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {services.map(s => {
            const variant = getDynamicVariant(s);
            const finalPrice = variant ? variant.price : s.price;
            const isSelected = cart.find((item: any) => item.id === s.id);
                       return (
              <div key={s.id} className="space-y-2">
                <button 
                  onClick={() => toggleService(s)}
                  className={cn(
                    "w-full p-6 rounded-3xl border-2 text-left flex items-center justify-between transition-all group",
                    isSelected ? "border-primary bg-primary-soft ring-2 ring-primary/20" : "border-slate-50 bg-slate-50 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:rotate-6 transition-all",
                      isSelected ? "bg-primary text-white" : "bg-white text-primary"
                    )}>
                      <Wrench size={20} />
                    </div>
                    <div>
                      <div className="font-black text-ink uppercase tracking-tight">{s.title}</div>
                      <div className="flex items-center gap-2">
                        <div className={cn("text-[10px] font-bold uppercase tracking-widest", variant || isSelected ? "text-primary" : "text-slate-400")}>
                          {variant ? `Vehicle Price Applied: ₹${finalPrice}` : `Generic Price Applied: ₹${s.price}`}
                        </div>
                        {variant ? (
                          <Zap size={10} className="text-primary animate-pulse" />
                        ) : (
                          <div className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter">Default Fallback</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary text-white" : "border-slate-200 text-transparent"
                  )}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                </button>
                {/* Variant Selector */}
                {s.variants && s.variants.length > 0 && isSelected && (
                  <div className="pl-16 space-y-4 pb-6 pt-2">
                    <div className="flex items-center justify-between mr-6">
                      <div className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                        <Wrench size={10} /> Dynamic Price Recalibration
                      </div>
                      {!variant && <div className="text-[9px] font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse border border-amber-100 flex items-center gap-1">
                        <AlertCircle size={10} /> Review Standard Pricing
                      </div>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                       {s.variants.map((v: any, vIdx: number) => {
                         const isMatch = v.make.toLowerCase() === data.carDetails.make.toLowerCase() && 
                                            (v.model.toLowerCase() === 'all' || v.model.toLowerCase() === data.carDetails.model.toLowerCase()) &&
                                            (v.fuel.toLowerCase() === 'all' || v.fuel.toLowerCase() === data.carDetails.fuel.toLowerCase());
                         const isChosen = cart.find((item: any) => item.id === s.id)?.price === v.price;
                         return (
                           <button 
                             key={vIdx}
                             onClick={() => {
                               const newCart = cart.map((item: any) => item.id === s.id ? { ...item, price: v.price } : item);
                               const total = newCart.reduce((acc: number, item: any) => acc + item.price, 0);
                               updateData({ ...data, cart: newCart, price: total });
                             }}
                             className={cn(
                               "px-4 py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between",
                               isChosen ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]" : 
                               isMatch ? "bg-primary-soft border-primary text-primary" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                             )}
                           >
                             <div className="flex flex-col">
                               <span className="opacity-80">{v.make} {v.model === 'all' ? 'Lineup' : v.model}</span>
                               <span className="text-[8px] font-bold opacity-60 tracking-tighter">{v.fuel} Spec</span>
                             </div>
                             <div className={cn("text-sm font-black", isChosen ? "text-white" : "text-primary")}>₹{v.price}</div>
                           </button>
                         );
                       })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
       </div>

       {cart.length > 0 && (
         <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl flex justify-between items-center animate-in fade-in slide-in-from-bottom-4">
            <div>
               <div className="text-[10px] font-black text-primary uppercase tracking-widest">Total Operation Cost</div>
               <div className="text-xl font-black text-primary italic">₹{data.price}</div>
            </div>
            <button 
              onClick={onNext}
              className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Confirm Cart
            </button>
         </div>
       )}

       <button onClick={onBack} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-ink">Change Vehicle</button>
    </motion.div>
  );
}

function ScheduleStep({ onNext, onBack, data, updateData }: StepProps) {
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(true);
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const { user, isMechanic } = useAuth();
  
  const toggleTechSlot = async (time: string, tech: any) => {
    if (!user || !isMechanic || tech.userId !== user.uid) return;

    const slotKey = `${data.appointmentDate}|${time}`;
    const currentSlots = tech.unavailableSlots || [];
    const newSlots = currentSlots.includes(slotKey) 
      ? currentSlots.filter((s: string) => s !== slotKey)
      : [...currentSlots, slotKey];

    try {
      await updateDoc(doc(db, "technicians", tech.id), {
        unavailableSlots: newSlots,
        updatedAt: serverTimestamp()
      });
      toast.success(currentSlots.includes(slotKey) ? "Slot marked available." : "Slot marked unavailable.");
    } catch (err) {
      toast.error("Failed to update availability uplink.");
    }
  };

  const dates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(offset => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  });

  const generateTimes = () => {
    const times = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let min of ["00", "30"]) {
        if (hour === 18 && min === "30") break;
        const h = hour > 12 ? hour - 12 : hour;
        const ampm = hour >= 12 ? "PM" : "AM";
        times.push(`${h.toString().padStart(2, '0')}:${min} ${ampm}`);
      }
    }
    return times;
  };

  const times = generateTimes();

  useEffect(() => {
    if (!data.appointmentDate) return;
    return onSnapshot(query(collection(db, "bookings"), where("appointmentDate", "==", data.appointmentDate)), (snap) => {
      setBookedSlots(snap.docs.map(doc => doc.data().appointmentTime));
    });
  }, [data.appointmentDate]);

  useEffect(() => {
    // Specifically fetch only available technicians as requested
    const q = query(collection(db, "technicians"), where("status", "==", "available"));
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMechanics(docs);
      setLoadingMechanics(false);
      if (data.mechanicId) {
        setSelectedMechanic(docs.find(m => m.id === data.mechanicId));
      }
    }, (err) => {
      console.warn("Technician Repository Access Warning:", err.message);
      setLoadingMechanics(false);
    });
  }, []);

  const handleMechanicSelect = (m: any) => {
    setSelectedMechanic(m);
    updateData({ ...data, mechanicId: m.id, mechanicName: m.name });
  };

  const isTimeSlotWithinWorkingHours = (slot: string, workingHours: { start: string, end: string }) => {
    if (!workingHours) return true; // Default behavior
    
    const convertToNumber = (t: string) => {
      let [time, ampm] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h + (m / 60);
    };

    const convert24ToNumber = (t: string) => {
      let [h, m] = t.split(':').map(Number);
      return h + (m / 60);
    };

    const slotTime = convertToNumber(slot);
    const start = convert24ToNumber(workingHours.start || "09:00");
    const end = convert24ToNumber(workingHours.end || "18:00");

    return slotTime >= start && slotTime < end;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
       <div className="space-y-6">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <Calendar size={12} /> Service Availability Calendar
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={data.appointmentDate}
                onChange={(e) => updateData({ ...data, appointmentDate: e.target.value, appointmentTime: "" })}
                className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100 px-4 py-2 rounded-xl border-2 border-slate-100 outline-none focus:border-primary transition-all shadow-sm"
              />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full italic hidden sm:block">
                {data.appointmentDate ? new Date(data.appointmentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : dates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
             {dates.map((d, i) => {
               const dateStr = d.toISOString().split('T')[0];
               const isToday = i === 0;
               const isSelected = data.appointmentDate === dateStr;
               const isWeekend = d.getDay() === 0 || d.getDay() === 6;
               
               return (
                  <button 
                    key={i}
                    onClick={() => updateData({ ...data, appointmentDate: dateStr, appointmentTime: "" })}
                    className={cn(
                      "p-4 rounded-3xl border-2 transition-all group flex flex-col items-center justify-center relative",
                      isSelected 
                        ? "border-primary bg-primary text-white shadow-2xl shadow-primary/40 scale-110 z-10" 
                        : "border-slate-50 bg-slate-100/50 hover:border-slate-200 hover:bg-white"
                    )}
                  >
                    {isToday && !isSelected && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                    <div className={cn(
                      "text-[8px] font-black uppercase tracking-tight mb-0.5",
                      isSelected ? "text-white/60" : isWeekend ? "text-rose-400" : "text-slate-400"
                    )}>
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-xl font-black italic leading-none">{d.getDate()}</div>
                    <div className={cn(
                      "text-[8px] font-bold mt-0.5 uppercase",
                      isSelected ? "text-white/60" : "text-slate-300"
                    )}>
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    {isSelected && (
                      <motion.div 
                        layoutId="active-date-glow"
                        className="absolute inset-0 bg-primary/30 blur-xl rounded-full -z-10"
                      />
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </button>
               );
             })}
          </div>
       </div>

       <div className="space-y-6">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <Clock size={12} /> Preferred Arrival Slot
            </label>
            <div className="flex items-center gap-4">
              {bookedSlots.length > 0 && <span className="text-[8px] font-bold text-rose-400 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full">{bookedSlots.length} Slots Occupied</span>}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Available</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {times
               .filter(t => {
                 if (!selectedMechanic) return true;
                 return isTimeSlotWithinWorkingHours(t, selectedMechanic.workingHours);
               })
               .map(t => {
               const isBooked = bookedSlots.includes(t);
               const isTechUnavailable = selectedMechanic?.unavailableSlots?.includes(`${data.appointmentDate}|${t}`);
               const isSelected = data.appointmentTime === t;
               const isDisabled = isBooked || isTechUnavailable;

                return (
                  <div key={t} className="relative">
                    <button 
                     disabled={isDisabled && !(isMechanic && selectedMechanic?.userId === user?.uid)}
                     onClick={() => {
                        if (isMechanic && selectedMechanic?.userId === user?.uid) {
                           toggleTechSlot(t, selectedMechanic);
                        } else {
                           updateData({ ...data, appointmentTime: t });
                        }
                     }}
                     className={cn(
                       "w-full px-4 py-5 rounded-3xl border-2 transition-all text-xs font-black tracking-widest uppercase relative overflow-hidden",
                       isSelected && !isMechanic
                         ? "border-primary bg-primary text-white shadow-xl shadow-primary/30 scale-105 z-10" 
                         : isDisabled && !(isMechanic && selectedMechanic?.userId === user?.uid) ? "bg-slate-50 border-slate-50 text-slate-300/50 cursor-not-allowed" : "border-slate-50 bg-slate-100/50 hover:border-primary/20 hover:bg-primary-soft hover:text-primary",
                        isMechanic && selectedMechanic?.userId === user?.uid && isTechUnavailable && "border-rose-500 bg-rose-50 text-rose-500 opacity-100 grayscale-0 cursor-pointer"
                     )}
                    >
                      {isDisabled && !isMechanic && <div className="absolute inset-0 bg-slate-200/20 backdrop-blur-[1px]" />}
                      <span className="relative z-10">{t}</span>
                      {isMechanic && selectedMechanic?.userId === user?.uid && isTechUnavailable && (
                        <div className="absolute top-1 right-1">
                          <X size={10} className="text-rose-500" />
                        </div>
                      )}
                    </button>
                    {isMechanic && selectedMechanic?.userId === user?.uid && (
                       <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-[6px] font-black text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                          Toggle Availability
                       </div>
                    )}
                  </div>
                );
             })}
          </div>
         <div className="flex items-center justify-between ml-1">
           <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <User size={12} /> Live Technician Availability
           </label>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Real-time Grid</span>
           </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingMechanics ? (
               <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Technician Uplink...</div>
               </div>
            ) : mechanics.length > 0 ? (
               mechanics
                .filter(m => {
                  // Refined filtering based on working hours and unavailable slots
                  if (!data.appointmentTime || !data.appointmentDate) return true;
                  
                  const isTechUnavailable = m.unavailableSlots?.includes(`${data.appointmentDate}|${data.appointmentTime}`);
                  if (isTechUnavailable) return false;

                  const isWithinHours = isTimeSlotWithinWorkingHours(data.appointmentTime, m.workingHours);
                  return isWithinHours;
                })
                .map(m => {
                  const isSelected = data.mechanicId === m.id;
                  const expertiseTags = m.expertise?.split(',') || [];
                  
                  return (
                    <button 
                      key={m.id}
                      onClick={() => handleMechanicSelect(m)}
                      className={cn(
                        "p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-5 text-center relative overflow-hidden group",
                        isSelected ? "border-primary bg-primary-soft shadow-xl shadow-primary/10 scale-[1.05] z-10" : "border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white hover:shadow-lg",
                      )}
                    >
                    <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white shrink-0 relative border-4 border-white shadow-md group-hover:scale-110 transition-transform">
                       <img src={m.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt="" className="transition-all" />
                       <div className={cn(
                         "absolute bottom-0 right-0 w-5 h-5 border-4 border-white rounded-full",
                         m.status === 'available' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                       )} />
                    </div>
                    
                    <div className="space-y-1">
                       <div className="font-black text-ink text-sm uppercase tracking-tighter leading-none">
                         {m.name}
                       </div>
                       <div className="text-[9px] font-black uppercase text-primary tracking-widest mt-1">{m.expertise || "Master Tech"}</div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                       {expertiseTags.map((tag: string, i: number) => (
                         <span key={i} className="text-[7px] font-black uppercase tracking-tighter bg-white px-2 py-0.5 rounded-full border border-slate-100 text-slate-400 group-hover:text-primary transition-colors">
                           {tag.trim()}
                         </span>
                       ))}
                    </div>

                    <div className={cn(
                      "mt-auto pt-4 w-full flex items-center justify-center gap-2",
                      isSelected ? "text-primary" : "text-slate-300"
                    )}>
                       <div className="h-0.5 flex-1 bg-current opacity-10 rounded-full" />
                       <span className="text-[8px] font-black uppercase tracking-widest">{isSelected ? "SELECTED_TECH" : "OPERATIONAL"}</span>
                       <div className="h-0.5 flex-1 bg-current opacity-10 rounded-full" />
                    </div>

                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-6 text-primary"
                      >
                        <CheckCircle2 size={18} />
                      </motion.div>
                    )}
                  </button>
                );
            })
          ) : (
            <div className="col-span-full p-6 text-center text-[10px] font-black uppercase text-slate-400 bg-slate-50 rounded-2xl">
               No available technicians found
            </div>
          )}
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
  const [bookingId, setBookingId] = useState("");
  
  useEffect(() => {
    setBookingId(data.id?.slice(0, 8).toUpperCase() || "B" + Math.random().toString(36).substring(2, 10).toUpperCase());
  }, [data.id]);

  const addToCalendar = () => {
    const title = `Carmechs: ${data.serviceType} Deployment`;
    const datePart = data.appointmentDate.replace(/-/g, '');
    
    const parseTime = (t: string) => {
      const [time, modifier] = t.split(' ');
      let [hours, minutes] = time.split(':');
      if (modifier === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
      if (modifier === 'AM' && hours === '12') hours = '00';
      return { 
        h: parseInt(hours), 
        m: parseInt(minutes), 
        str: hours.padStart(2, '0') + minutes.padStart(2, '0') + '00' 
      };
    };

    const startInfo = parseTime(data.appointmentTime);
    const startTime = startInfo.str;
    const endH = (startInfo.h + 2) % 24;
    const endTime = endH.toString().padStart(2, '0') + startInfo.m.toString().padStart(2, '0') + '00';
    
    const details = `Vehicle: ${data.carDetails.make} ${data.carDetails.model}\nRegistration: ${data.carDetails.plate}\nService: ${data.serviceType}\nTechnician: ${data.mechanicName || 'To be assigned'}\nBooking ID: ${bookingId}`;
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${datePart}T${startTime}/${datePart}T${endTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(data.location || 'Your Location')}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-12 py-10"
    >
       <div className="space-y-6">
          <div className="relative mx-auto w-32 h-32">
            <motion.div 
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 100 }}
              className="w-32 h-32 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200 relative z-10"
            >
               <CheckCircle2 size={64} className="text-white" />
            </motion.div>
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-ink uppercase italic tracking-tighter">Mission Success</h2>
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.4em] animate-pulse">Tactical Deployment Authorized</p>
            <div className="mt-6 inline-flex flex-col items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-3xl shadow-xl">
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Unit_ID</span>
                  <span className="text-lg font-mono font-black text-emerald-400 tracking-widest">{bookingId}</span>
               </div>
            </div>
          </div>
       </div>

       <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-6 text-left relative overflow-hidden group hover:border-emerald-500/20 transition-all"
          >
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
               <Calendar size={14} /> Schedule analysis
             </div>
             <div className="space-y-4 relative z-10">
                <div>
                   <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Deployment Date</div>
                   <div className="text-2xl font-black text-ink italic">{new Date(data.appointmentDate).toDateString()}</div>
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Arrival Window</div>
                   <div className="text-xl font-black text-primary italic uppercase tracking-tight">
                     {data.appointmentTime}
                   </div>
                </div>
             </div>
             <Calendar size={120} className="absolute -right-12 -bottom-12 text-slate-100 opacity-20 rotate-12 group-hover:scale-110 transition-transform" strokeWidth={1} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-white shadow-xl space-y-6 text-left relative overflow-hidden group hover:bg-white transition-all"
          >
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
               <Wrench size={14} /> Service Manifest
             </div>
             <div className="space-y-3 relative z-10">
                {data.cart && data.cart.length > 0 ? (
                  data.cart.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white/80 group-hover:bg-slate-50 transition-colors">
                      <div className="text-[10px] font-black uppercase text-ink tracking-tight">{item.title}</div>
                      <div className="text-[10px] font-bold text-primary">₹{item.price}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm font-black text-ink uppercase tracking-tight">{data.serviceType}</div>
                )}
                {data.discount > 0 && (
                   <div className="flex justify-between items-center p-3 border-2 border-dashed border-emerald-100 rounded-xl">
                      <span className="text-[9px] font-black uppercase text-emerald-500">Reward Protocol</span>
                      <span className="text-sm font-black text-emerald-500">-₹{data.discount}</span>
                   </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                   <span className="text-[9px] font-black uppercase text-slate-400">Net Capital Output</span>
                   <span className="text-xl font-black text-primary italic">₹{data.price}</span>
                </div>
             </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-6 text-left relative overflow-hidden group hover:border-primary/20 transition-all"
          >
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
               <Car size={14} /> Unit Spec Sheet
             </div>
             <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Car size={20} className="text-primary" />
                   </div>
                   <div>
                      <div className="text-base font-black text-ink uppercase italic leading-none">{data.carDetails.make} {data.carDetails.model}</div>
                      <div className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{data.carDetails.fuel} • {data.carDetails.plate}</div>
                   </div>
                </div>
                <div className="pt-4 border-t border-slate-50 italic text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={10} className="text-primary" />
                  Deployment Hub: {data.city}
                </div>
             </div>
             <ShieldCheck size={120} className="absolute -right-12 -bottom-12 text-slate-100 opacity-20 rotate-12 group-hover:rotate-0 transition-transform" strokeWidth={1} />
          </motion.div>
       </div>

       <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto px-4 h-20">
          <button 
            onClick={addToCalendar}
            className="flex-1 py-5 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-4 group hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar size={18} className="group-hover:rotate-12 transition-transform" /> 
            Sync Google Calendar
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-5 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98]"
          >
            Mission Complete
            <CheckCircle2 size={18} className="text-emerald-400" />
          </button>
       </div>
    </motion.div>
  );
}


function ContactStep({ onNext, onBack, data, updateData }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cities, setCities] = useState<string[]>(["Mumbai", "Delhi", "Bangalore"]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "config", "cities"), (snap) => {
      if (snap.exists() && snap.data().list) {
        setCities(snap.data().list);
      }
    });
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser ecosystem.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse geocoding would be ideal here if we had an API key, 
          // for now we'll just log and maybe use a public API or placeholders
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await response.json();
          if (geoData && geoData.display_name) {
            updateData({ ...data, address: geoData.display_name });
            toast.success("Strategic coordinates locked.");
          }
        } catch (err) {
          toast.error("Reverse geocoding uplink failed.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        toast.error("Location access denied by user.");
        setLocating(false);
      }
    );
  };

  useEffect(() => {
    const validateRealTime = () => {
      setErrors(prev => {
        const next = { ...prev };
        
        if (data.fullName) {
          const val = data.fullName.replace(/[^a-zA-Z\s]/g, "");
          if (val !== data.fullName) {
            // This would cause a loop if I update here, usually it's handled in onChange
          }
          if (data.fullName.trim().length < 3) next.fullName = "Alpha characters only (min 3).";
          else delete next.fullName;
        }
        
        if (data.phone) {
          const phoneDigits = data.phone.replace(/\D/g, "");
          if (phoneDigits.length !== 10) next.phone = "10-digit mobile number required.";
          else delete next.phone;
        }

        if (data.email) {
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          if (!emailRegex.test(data.email)) next.email = "Invalid structure.";
          else delete next.email;
        }

        if (data.carDetails.plate) {
          if (!/^[A-Z0-9]*$/i.test(data.carDetails.plate.replace(/\s/g, ""))) next.plate = "Alphanumeric only.";
          else delete next.plate;
        }
        
        return next;
      });
    };
    validateRealTime();
  }, [data.fullName, data.phone, data.email, data.carDetails.plate]);

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
        newErrors.year = `Invalid year: 1980-${currentYear + 1}`;
      }
    }
    
    if (!data.carDetails.plate) {
      newErrors.plate = "Number plate is mandatory.";
    } else {
      const cleanPlate = data.carDetails.plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (cleanPlate.length < 4) {
        newErrors.plate = "Plate code too short.";
      }
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
                   onChange={(e) => {
                     const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                     updateData({ ...data, carDetails: { ...data.carDetails, year: val } });
                   }}
                   placeholder="YYYY"
                   maxLength={4}
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
                   onChange={(e) => {
                      const val = e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
                      updateData({ ...data, carDetails: { ...data.carDetails, plate: val } });
                    }}
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
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                      updateData({ ...data, fullName: val });
                    }}
                    placeholder="John Doe"
                    className={cn(
                      "w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold",
                      errors.fullName ? "border-rose-300 bg-rose-50" : "border-slate-100"
                    )}
                 />
                 {errors.fullName && <p className="text-[9px] font-black italic text-rose-500 uppercase tracking-tight px-1">{errors.fullName}</p>}
               </div>
               <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number (+91 Recommended)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">+91</span>
                    <input 
                      type="tel" 
                      value={data.phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 10) val = val.slice(0, 10);
                        updateData({ ...data, phone: val });
                      }}
                      placeholder="XXXXXXXXXX"
                      className={cn(
                        "w-full bg-slate-50 border-2 rounded-2xl pl-16 pr-6 py-4 outline-none focus:border-primary transition-all font-bold",
                        errors.phone ? "border-rose-300 bg-rose-50" : (data.phone ? "border-emerald-100 bg-emerald-50/10" : "border-slate-100")
                      )}
                    />
                  </div>
                  {errors.phone && <p className="text-[9px] font-black italic text-rose-500 uppercase tracking-tight px-1">{errors.phone}</p>}
               </div>
             </div>

             <div className="space-y-2 text-left">
                <div className="flex items-center justify-between ml-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Site Address</label>
                   <button 
                     onClick={handleLocateMe}
                     disabled={locating}
                     className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:underline disabled:opacity-50"
                   >
                     <MapPin size={10} className={cn(locating && "animate-bounce")} />
                     {locating ? "LOCKING..." : "USE_GPS_LOCATE"}
                   </button>
                </div>
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
                 <div className="relative">
                   <select 
                      value={data.city}
                      onChange={(e) => updateData({ ...data, city: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all font-bold appearance-none"
                   >
                      <option value="" disabled>SELECT_CITY</option>
                      {cities.map(city => <option key={city} value={city}>{city}</option>)}
                   </select>
                   <ChevronDown size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                 </div>
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
  const { user } = useAuth();
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

            <div className="pt-8 border-t border-slate-200">
               <SectionHeader title="Operational Protocol (Cart)" step={2} />
               <div className="space-y-3">
                  {(data.cart || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm font-bold text-ink bg-white p-4 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="uppercase italic">{item.title}</span>
                       </div>
                       <span className="text-primary">₹{item.price}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 pt-8">
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

          {!isExistingBooking && user && (user.loyaltyPoints || 0) > 0 && (
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 mb-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <Gift className="text-emerald-500" size={18} />
                     <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Loyalty Rewards Protocol</div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-emerald-100">
                    {user.loyaltyPoints || 0} Credits Available
                  </div>
               </div>
               
               {data.pointsRedeemed > 0 ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                          <Zap size={20} />
                       </div>
                       <div>
                          <div className="text-[9px] font-black uppercase text-emerald-500 tracking-widest leading-none mb-1">Discount Synthesized</div>
                          <div className="text-sm font-black text-ink uppercase tracking-tight">-₹{data.discount} applied to mission cost</div>
                       </div>
                    </div>
                    <button 
                      onClick={() => updateData({ ...data, pointsRedeemed: 0, discount: 0, price: data.price + data.discount })}
                      className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                 </motion.div>
               ) : (
                 <div className="space-y-4">
                   <div className="flex gap-2">
                     <input 
                       type="number"
                       max={user.loyaltyPoints}
                       placeholder="Enter credits..."
                       className="flex-1 bg-white border-2 border-emerald-100 rounded-2xl px-6 py-3 outline-none focus:border-emerald-500 transition-all font-black text-ink text-sm"
                       id="loyaltyInput"
                     />
                     <button 
                       onClick={() => {
                         const input = document.getElementById('loyaltyInput') as HTMLInputElement;
                         const val = parseInt(input?.value || "0");
                         const maxAllowed = Math.floor(data.price * 0.3); // Max 30% discount
                         const pointsToRedeem = Math.min(val, user.loyaltyPoints || 0, maxAllowed);
                         
                         if (pointsToRedeem > 0) {
                            updateData({ 
                              ...data, 
                              pointsRedeemed: pointsToRedeem, 
                              discount: pointsToRedeem, 
                              price: data.price - pointsToRedeem 
                            });
                            toast.success(`Protocol Activated: ₹${pointsToRedeem} discount synthesized.`);
                         } else if (val > user.loyaltyPoints!) {
                            toast.error("Insufficient loyalty credits.");
                         } else if (val > maxAllowed) {
                            toast.warning(`Maximum discount limit reached: ₹${maxAllowed}`);
                         }
                       }}
                       className="px-8 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all"
                     >
                       Authorize
                     </button>
                   </div>
                   <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-[0.2em] italic ml-1">
                     * Tactical Discount Limit: 30% of total capital cost. 1 Credit = ₹1.
                   </p>
                 </div>
               )}
            </div>
          )}
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
                  <ReviewItem label="Deployment Hub" value={data.city} />
                  <ReviewItem label="Tactical Address" value={data.address} />
                  <ReviewItem label="Deployment Date" value={new Date(data.appointmentDate).toDateString()} />
                  <ReviewItem label="Arrival Window" value={getArrivalRange(data.appointmentTime)} />
                  <ReviewItem label="Identity Node" value={data.fullName} />
                  <ReviewItem label="Protocol Value" value={`₹${data.price}`} isHighlight />
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
       let tid = "";
       let payStatus = "pending";

       // Identify Mock Mode
       const isMockNeeded = paymentMethod !== 'cash' && (!process.env.RAZORPAY_KEY_ID && !config.razorpayKeyId);

       // Real Gateway Integration
       const payResponse = await initializePayment({
         amount: data.price,
         currency: 'INR',
         receipt: `rec_${Date.now()}`,
         customerName: data.fullName,
         customerEmail: data.email,
         customerPhone: data.phone
       }, paymentMethod);

       if (payResponse.status !== 'success') {
         if (payResponse.status === 'cancelled') {
           toast.info("Payment cycle aborted by user.");
           return;
         }
         throw new Error("Payment Authorization Failed. Gateway signal lost.");
       }
       
       tid = payResponse.id;
       payStatus = paymentMethod === 'cash' ? "pending" : "paid";
       
       setTransactionId(tid);

       const bookingRef = await addDoc(collection(db, "bookings"), {
         ...data,
         carModel: `${data.carDetails.make} ${data.carDetails.model}`, // For Admin Dashboard compatibility
         userId: auth.currentUser?.uid || "anonymous",
         status: "pending", // All new bookings start as pending until admin confirms
         paymentStatus: payStatus,
         paymentMethod,
         transactionId: tid,
         pointsRedeemed: data.pointsRedeemed || 0,
         discountAmount: data.discount || 0,
         finalPrice: data.price,
         createdAt: serverTimestamp(),
         updatedAt: serverTimestamp()
       });

       // Save Vehicle to Garage if requested
       if (data.saveVehicle && auth.currentUser) {
         try {
           await addDoc(collection(db, "users", auth.currentUser.uid, "garage"), {
             userId: auth.currentUser.uid,
             make: data.carDetails.make,
             model: data.carDetails.model,
             year: data.carDetails.year,
             plate: data.carDetails.plate,
             fuel: data.carDetails.fuel,
             engine: data.carDetails.engine || "",
             createdAt: serverTimestamp()
           });
           toast.success("Vehicle registered in Tactical Garage.");
         } catch (vErr) {
           console.warn("Garage registration failed:", vErr);
         }
       }

       // Deduct points if redeemed
       if (data.pointsRedeemed > 0 && auth.currentUser) {
         try {
           await updateDoc(doc(db, "users", auth.currentUser.uid), {
             loyaltyPoints: increment(-data.pointsRedeemed),
             updatedAt: serverTimestamp()
           });
           toast.info(`Protocol Adjustment: ${data.pointsRedeemed} loyalty points liquidated.`);
         } catch (ptsErr) {
           console.warn("Points deduction failed:", ptsErr);
         }
       }

       // Trigger Notification
       try {
         await sendConfirmationEmail(
           data.email, 
           data.fullName, 
           bookingRef.id, 
           data.serviceType, 
           data.appointmentDate, 
           data.appointmentTime, 
           data.cart, 
           data.price
         );
         await sendNewBookingAlert({ ...data, id: bookingRef.id });
       } catch (mailErr) {
         console.warn("Notification dispatch failed:", mailErr);
       }

       setIsSuccess(true);
    } catch (err: any) {
       console.error("Critical Transaction Error:", err);
       toast.error(err.message || "Transaction Pulse Failed. Gateway rejected the authorization.");
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
            <div className="flex justify-between items-center mb-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary">Payment Summary</div>
              {(paymentMethod !== 'cash' && (!import.meta.env.VITE_RAZORPAY_KEY_ID && !config.razorpayKeyId)) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-500 rounded-full">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">Mock Transmission Active</span>
                </div>
              )}
            </div>
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
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Tactical Payment</label>
          <div className="grid gap-3">
             {[
               { id: "upi_razorpay", name: "Razorpay Secure", subtitle: "Cards, NetBanking, UPI", icon: <ShieldCheck size={20} />, color: "bg-primary" },
               { id: "paytm", name: "Paytm Payments", subtitle: "Wallet & Postpaid", icon: <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.png" alt="Paytm" className="w-10" />, color: "bg-[#00baf2]" },
               { id: "phonepe", name: "PhonePe Gateway", subtitle: "Direct UPI & Wallet", icon: <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/PhonePe_Logo.png" alt="PhonePe" className="w-10" />, color: "bg-[#5f259f]" },
               ...(config?.cashOnServiceEnabled !== false ? [{ id: "cash", name: "Cash on Deployment", subtitle: "Pay after service verification", icon: <Droplets size={20} />, color: "bg-emerald-500" }] : [])
             ].map(method => (
                <button 
                   key={method.id}
                   onClick={() => setPaymentMethod(method.id)}
                   className={cn(
                      "w-full flex items-center gap-5 p-6 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden",
                      paymentMethod === method.id ? "border-primary bg-primary-soft shadow-2xl shadow-primary/5" : "border-slate-50 bg-slate-50 hover:border-slate-100"
                   )}
                >
                   {paymentMethod === method.id && (
                     <motion.div 
                       layoutId="active-payment"
                       className="absolute inset-0 bg-white/40 pointer-events-none"
                     />
                   )}
                   <div className={cn(
                      "w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-sm",
                      paymentMethod === method.id ? `${method.color} text-white scale-110 rotate-3` : "bg-white text-slate-300"
                   )}>
                      {method.icon}
                   </div>
                   <div className="flex-1 text-left">
                      <div className={cn("text-sm font-black uppercase tracking-tight", paymentMethod === method.id ? "text-primary" : "text-slate-500")}>{method.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                         {method.subtitle}
                      </div>
                   </div>
                   <div className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                      paymentMethod === method.id ? "border-primary bg-white shadow-sm" : "border-slate-200"
                   )}>
                      {paymentMethod === method.id && <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />}
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
