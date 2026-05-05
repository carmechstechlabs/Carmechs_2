import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Save, 
  LogOut, 
  ChevronLeft,
  Shield,
  Clock,
  Car,
  Gift,
  Copy,
  Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { doc, updateDoc, setDoc, collection, query, where, onSnapshot, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export default function Profile() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [referredFriends, setReferredFriends] = useState<any[]>([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ make: "", model: "", year: "", plate: "" });

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to user's vehicles
    const vq = query(collection(db, "vehicles"), where("userId", "==", user.uid));
    const unsubVehicles = onSnapshot(vq, (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Vehicles sync warning:", err.message);
    });

    // Subscribe to user's bookings
    const bq = query(collection(db, "bookings"), where("userId", "==", user.uid));
    const unsubBookings = onSnapshot(bq, (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    }, (err) => {
      console.warn("Profile bookings sync warning:", err.message);
    });

    return () => {
      unsubVehicles();
      unsubBookings();
    };
  }, [user]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "vehicles"), {
        ...newVehicle,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewVehicle({ make: "", model: "", year: "", plate: "" });
      setShowAddVehicle(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm("Remove this vehicle?")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!user) return;
    
    // Auto-generate referral code if missing (safety for legacy accounts)
    if (!user.referralCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setDoc(doc(db, "users", user.uid), { referralCode: code }, { merge: true });
    }
    
    // Subscribe to successful referrals
    const q = query(
      collection(db, "referrals"), 
      where("referrerId", "==", user.uid), 
      where("status", "==", "successful")
    );
    const unsub = onSnapshot(q, async (snap) => {
      setReferralCount(snap.size);
      setReferredFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Referral sync warning:", err.message);
    });
    
    return unsub;
  }, [user]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPhone(user.phone || "");
    } else if (!loading) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    setMessage({ type: "", text: "" });

    try {
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        phone,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-soft flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-soft font-sans pb-20">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-50 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors group"
          >
            <ChevronLeft size={24} className="text-slate-400 group-hover:text-primary transition-colors" />
          </button>
          <h1 className="text-xl font-black tracking-tighter text-ink">My Profile</h1>
          <button 
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="p-2 hover:bg-rose-50 rounded-xl transition-colors group"
          >
            <LogOut size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Column - Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-vibrant border-4 border-white text-center relative overflow-hidden group">
              {/* Background accent */}
              <div className="absolute top-0 left-0 w-full h-24 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
              
              <div className="relative z-10">
                <div className="inline-block relative mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-slate-300" />
                    )}
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                    <Camera size={18} />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-ink tracking-tight mb-1">{user.fullName || "Car Owner"}</h2>
                <div className="text-[10px] bg-slate-100 text-slate-500 font-black px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-4">
                  {user.role}
                </div>

                <div className="flex flex-col gap-2 text-left mt-8 py-6 border-t border-slate-50">
                   <div className="flex items-center gap-3 text-slate-400">
                     <Clock size={16} />
                     <span className="text-xs font-bold uppercase tracking-widest leading-none">Member since {new Date(user.createdAt?.seconds * 1000 || user.createdAt).getFullYear()}</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-400">
                     <Gift size={16} className="text-primary" />
                     <span className="text-xs font-black uppercase tracking-widest leading-none">
                       {referralCount} Referrals • ₹{user.bonusBalance || 0} Earned
                     </span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-400">
                     <Shield size={16} className="text-emerald-500" />
                     <span className="text-xs font-bold uppercase tracking-widest leading-none">Verified Account</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-primary p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
               <Car className="absolute -right-8 -bottom-8 w-32 h-32 text-white/10 rotate-12" />
               <h3 className="text-xl font-black mb-2 leading-tight">Need help?</h3>
               <p className="text-white/60 text-sm font-medium leading-relaxed mb-6">Our support crew is always ready to get you back on track.</p>
               <button className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                 Contact Crew
               </button>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-[2rem] p-10 shadow-vibrant border-4 border-white">
              <div className="flex items-center gap-4 mb-10">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                   <User className="text-primary" size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-ink tracking-tight">Account Settings</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Update your personal details below</p>
                 </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-8">
                <div className="bg-primary/5 border-2 border-primary/10 rounded-3xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Gift size={40} />
                   </div>
                   <div className="relative z-10">
                     <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-1 italic">Invite & Earn</h4>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Sharing earns you ₹100 per successful operative conversion</p>
                     
                     <div className="flex items-center gap-3">
                       <div className="flex-1 bg-white border-2 border-primary/20 rounded-2xl p-4 flex items-center justify-between font-mono font-black text-lg tracking-wider text-primary">
                         {user.referralCode || "------"}
                       </div>
                       <button 
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(user.referralCode || "");
                           setCopied(true);
                           setTimeout(() => setCopied(false), 2000);
                         }}
                         className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                       >
                         {copied ? <Check size={20} /> : <Copy size={20} />}
                       </button>
                     </div>

                     {referredFriends.length > 0 && (
                       <div className="mt-8 pt-6 border-t border-primary/10 space-y-4">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral History</h4>
                         <div className="space-y-2">
                           {referredFriends.map((ref) => (
                             <div key={ref.id} className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                   <User size={14} />
                                 </div>
                                 <div>
                                   <div className="text-[10px] font-black text-ink uppercase tracking-tight">System Conversion</div>
                                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                     {ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleDateString() : "Just now"}
                                   </div>
                                 </div>
                               </div>
                               <div className="text-sm font-mono font-black text-emerald-600">
                                 +₹{ref.rewardAmount}
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                </div>

                {/* Vehicles Section */}
                <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Car size={20} className="text-primary" />
                      <h4 className="text-sm font-black uppercase tracking-widest text-ink">My Vehicles</h4>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowAddVehicle(!showAddVehicle)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                      {showAddVehicle ? "Cancel" : "+ Add Vehicle"}
                    </button>
                  </div>

                  {showAddVehicle && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-2 gap-4 mb-8 p-6 bg-white rounded-2xl border-2 border-primary/10"
                    >
                      <input 
                        placeholder="Make (e.g. Maruti)" 
                        value={newVehicle.make}
                        onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                        className="p-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-primary outline-none"
                      />
                      <input 
                        placeholder="Model (e.g. Swift)" 
                        value={newVehicle.model}
                        onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                        className="p-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-primary outline-none"
                      />
                      <input 
                        placeholder="Year" 
                        value={newVehicle.year}
                        onChange={e => setNewVehicle({...newVehicle, year: e.target.value})}
                        className="p-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-primary outline-none"
                      />
                      <input 
                        placeholder="License Plate" 
                        value={newVehicle.plate}
                        onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})}
                        className="p-3 bg-slate-50 rounded-xl text-xs font-bold border-2 border-transparent focus:border-primary outline-none"
                      />
                      <button 
                        onClick={handleAddVehicle}
                        className="col-span-2 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        Save Vehicle
                      </button>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    {vehicles.length === 0 && !showAddVehicle && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No vehicles added yet</p>
                    )}
                    {vehicles.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-50 shadow-sm group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary font-black italic">
                            {v.make[0]}
                          </div>
                          <div>
                            <div className="text-sm font-black text-ink tracking-tight">{v.make} {v.model}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.year} • {v.plate}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <LogOut size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bookings Section */}
                <div className="space-y-4">
                   <div className="flex items-center gap-3 ml-1 mb-2">
                      <Clock size={18} className="text-primary" />
                      <h4 className="text-sm font-black uppercase tracking-widest text-ink">Recent Bookings</h4>
                   </div>
                   {bookings.length === 0 && (
                      <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-50">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No service history yet</p>
                      </div>
                   )}
                   <div className="space-y-4">
                     {bookings.map(b => (
                       <div key={b.id} className="bg-white p-6 rounded-3xl border-4 border-white shadow-vibrant flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                         <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-primary flex items-center justify-center border border-indigo-100">
                               <Shield size={24} />
                            </div>
                            <div>
                               <div className="text-lg font-black text-ink tracking-tight">{b.serviceType}</div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 {b.appointmentDate ? new Date(b.appointmentDate).toDateString() : "TBD"} at {b.appointmentTime} • ₹{b.price}
                               </div>
                               {b.carDetails && (
                                  <div className="text-[9px] font-black text-primary uppercase tracking-widest mt-1">
                                     {b.carDetails.make} {b.carDetails.model} ({b.carDetails.plate})
                                  </div>
                               )}
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className={cn(
                              "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                              b.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                              b.status === 'cancelled' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                            )}>
                               {b.status}
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <User className="text-primary" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-ink tracking-tight">Personal Details</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Keep your contact information up to date</p>
                      </div>
                   </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email" 
                        value={user.email || ""}
                        disabled
                        className="w-full bg-slate-50/50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-slate-400 cursor-not-allowed outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                    />
                  </div>
                </div>

                {message.text && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest leading-none ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {message.text}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={updating}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                >
                  {updating ? "Processing..." : "Save Changes"}
                  {!updating && <Save size={18} className="group-hover:scale-110 transition-transform" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
