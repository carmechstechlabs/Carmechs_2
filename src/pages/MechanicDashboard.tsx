import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Settings, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  X, 
  Save, 
  LogOut,
  MapPin,
  Star,
  ChevronRight,
  Menu
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function MechanicDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'available' | 'profile' | 'schedule'>('bookings');
  const [techProfile, setTechProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [availableBookings, setAvailableBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch Technician Profile
    const techQuery = query(collection(db, "technicians"), where("userId", "==", user.uid));
    const unsubTech = onSnapshot(techQuery, (snap) => {
      if (!snap.empty) {
        setTechProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setTechProfile(null);
      }
    });

    return () => {
      unsubTech();
    };
  }, [user]);

  // Second effect for bookings once we have techProfile ID
  useEffect(() => {
    if (!techProfile?.id) return;
    
    // In CarMechs, bookings might use the tech document ID or the user ID.
    // Let's check common pattern.
    const bookingsQuery = query(collection(db, "bookings"), where("mechanicId", "==", techProfile.id));
    const unsubBookings = onSnapshot(bookingsQuery, (snap) => {
      const bData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bData.sort((a: any, b: any) => {
         const dateA = a.createdAt?.seconds || 0;
         const dateB = b.createdAt?.seconds || 0;
         return dateB - dateA;
      }));
    });

    const availableQuery = query(
      collection(db, "bookings"), 
      where("status", "in", ["pending", "confirmed"]),
      where("mechanicId", "==", "")
    );
    const unsubAvailable = onSnapshot(availableQuery, (snap) => {
      const bData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableBookings(bData);
      setLoading(false);
    });

    return () => {
      unsubBookings();
      unsubAvailable();
    };
  }, [techProfile?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Wrench className="text-accent-red animate-spin" size={48} />
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white animate-pulse">Initializing Portal...</div>
        </div>
      </div>
    );
  }

  if (!techProfile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-rose-500/10 border border-rose-500/20 p-10 rounded-[3rem] max-w-lg">
          <X className="text-rose-500 mx-auto mb-6" size={64} />
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Registry Mismatch</h1>
          <p className="text-sm text-text-dim uppercase font-bold tracking-widest leading-loose">
            Your Operator account is not registered in the Technician Core. Please contact administrative support to link your Identity Node.
          </p>
          <button 
            onClick={() => logout()}
            className="mt-10 px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-2xl shadow-rose-500/20"
          >
            De-Auth Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-6 bg-neutral-900/50 border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-red flex items-center justify-center shrink-0">
            <Wrench size={16} className="text-white" />
          </div>
          <span className="text-xs font-black uppercase tracking-tighter">MechCore<span className="text-accent-red">OS</span></span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-white">
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 border-r border-white/5 p-8 flex flex-col gap-10 md:sticky transition-transform",
              !sidebarOpen && "hidden md:flex"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-accent-red flex items-center justify-center shadow-2xl shadow-accent-red/20">
                  <Wrench size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-tighter leading-none">MechCore</div>
                  <div className="text-[9px] font-black text-accent-red uppercase tracking-widest mt-1 italic">v1.2 // OPS</div>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-text-dim hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
              <NavButton 
                active={activeTab === 'bookings'} 
                onClick={() => { setActiveTab('bookings'); setSidebarOpen(false); }}
                icon={Calendar}
                label="Mission Log"
                count={bookings.filter(b => b.status !== 'completed').length}
              />
              <NavButton 
                active={activeTab === 'available'} 
                onClick={() => { setActiveTab('available'); setSidebarOpen(false); }}
                icon={Star}
                label="Deployment Pool"
                count={availableBookings.length}
              />
              <NavButton 
                active={activeTab === 'schedule'} 
                onClick={() => { setActiveTab('schedule'); setSidebarOpen(false); }}
                icon={Clock}
                label="Tactical Schedule"
              />
              <NavButton 
                active={activeTab === 'profile'} 
                onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
                icon={User}
                label="Operator Profile"
              />
            </nav>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-4 px-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                  <img src={techProfile.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${techProfile.name}`} alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black uppercase text-white truncate">{techProfile.name}</div>
                  <div className="text-[9px] font-black text-text-dim uppercase tracking-widest mt-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operator Active
                  </div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-text-dim hover:bg-rose-500/10 hover:text-rose-500 transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-rose-500/20"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
         <div className="max-w-5xl mx-auto space-y-12">
            {activeTab === 'bookings' && (
              <BookingsSection techId={techProfile.id} bookings={bookings} />
            )}
            
            {activeTab === 'available' && (
              <AvailableSection techId={techProfile.id} techName={techProfile.name} bookings={availableBookings} />
            )}

            {activeTab === 'schedule' && (
               <ScheduleSection techProfile={techProfile} />
            )}
            
            {activeTab === 'profile' && (
              <ProfileSection 
                profile={techProfile} 
                onSave={async (data) => {
                  setSaveLoading(true);
                  try {
                    await updateDoc(doc(db, "technicians", techProfile.id), {
                      ...data,
                      updatedAt: serverTimestamp()
                    });
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setSaveLoading(false);
                  }
                }}
                isLoading={saveLoading}
              />
            )}
         </div>
      </main>
    </div>
  );
}

function ScheduleSection({ techProfile }: { techProfile: any }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>(techProfile.unavailableSlots || []);
  const [saving, setSaving] = useState(false);

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

  const toggleSlot = async (time: string) => {
    const slotKey = `${selectedDate}|${time}`;
    let newSlots;
    if (unavailableSlots.includes(slotKey)) {
      newSlots = unavailableSlots.filter(s => s !== slotKey);
    } else {
      newSlots = [...unavailableSlots, slotKey];
    }
    
    setUnavailableSlots(newSlots);
    setSaving(true);
    try {
      await updateDoc(doc(db, "technicians", techProfile.id), {
        unavailableSlots: newSlots,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to sync availability:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Tactical Schedule</h2>
           <p className="text-xs text-text-dim uppercase font-black tracking-widest flex items-center gap-3">
              <Clock size={14} className="text-accent-red" />
              Manage unavailable time slots for deployment
           </p>
        </div>
        {saving && (
           <div className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 border border-accent-red/20 rounded-xl text-[10px] font-black uppercase text-accent-red animate-pulse">
              <Settings size={12} className="animate-spin" />
              Syncing Hub...
           </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Date Selector */}
        <div className="lg:col-span-1 space-y-6">
          <div className="text-[10px] font-black text-text-dim uppercase tracking-widest italic flex items-center gap-2 ml-1">
             <Calendar size={14} className="text-accent-red" />
             Select Mission Date
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3">
            {dates.map((d, i) => {
              const dateStr = d.toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;
              const unavailableCount = unavailableSlots.filter(s => s.startsWith(dateStr)).length;
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center relative group",
                    isSelected 
                      ? "border-accent-red bg-accent-red text-white shadow-2xl shadow-accent-red/20 scale-[1.05] z-10" 
                      : "border-white/5 bg-neutral-900 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "text-[9px] font-black uppercase tracking-tight mb-1",
                    isSelected ? "text-white/60" : "text-text-dim"
                  )}>
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-2xl font-black italic leading-none">{d.getDate()}</div>
                  {unavailableCount > 0 && !isSelected && (
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                       <span className="text-[8px] font-black text-accent-red">{unavailableCount}</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="text-[10px] font-black text-text-dim uppercase tracking-widest italic flex items-center gap-2 ml-1">
             <Clock size={14} className="text-accent-red" />
             Toggle Unavailable Slots for {new Date(selectedDate).toDateString()}
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-[3rem] p-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {times.map(t => {
                const isUnavailable = unavailableSlots.includes(`${selectedDate}|${t}`);
                return (
                  <button
                    key={t}
                    onClick={() => toggleSlot(t)}
                    disabled={saving}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all text-xs font-black tracking-widest uppercase relative overflow-hidden flex flex-col items-center gap-2",
                      isUnavailable 
                        ? "border-rose-500 bg-rose-500/10 text-rose-500" 
                        : "border-white/5 bg-black/40 text-text-dim hover:border-accent-red/40 hover:text-white"
                    )}
                  >
                    {isUnavailable ? (
                      <X size={14} className="mb-1" />
                    ) : (
                      <CheckCircle size={14} className="mb-1 opacity-20" />
                    )}
                    {t}
                    <div className={cn(
                      "text-[8px] font-black uppercase tracking-tighter opacity-60",
                      isUnavailable ? "text-rose-400" : "text-emerald-500"
                    )}>
                      {isUnavailable ? "UNAVAILABLE" : "OPERATIONAL"}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 italic text-center">
               <p className="text-[10px] text-text-dim uppercase font-black tracking-[0.2em] leading-relaxed">
                  Note: Marking a slot as unavailable will remove it from the public booking manifest in real-time. Use this for lunch breaks, training phases, or personal appointments.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function NavButton({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden",
        active 
          ? "bg-accent-red text-white shadow-xl shadow-accent-red/20 translate-x-2" 
          : "text-text-dim hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon size={18} className={cn("transition-transform", active ? "rotate-12 scale-110" : "group-hover:rotate-6")} />
      <span className="text-[11px] font-black uppercase tracking-widest flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          "px-2 py-0.5 rounded-md text-[9px] font-black",
          active ? "bg-white/20 text-white" : "bg-accent-red text-white"
        )}>
          {count}
        </span>
      )}
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute left-0 w-1 h-6 bg-white rounded-full"
        />
      )}
    </button>
  );
}

function BookingsSection({ bookings }: { techId: string, bookings: any[] }) {
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const filtered = bookings.filter(b => filter === 'active' ? b.status !== 'completed' : b.status === 'completed');

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Mission Log</h2>
           <p className="text-xs text-text-dim uppercase font-black tracking-widest flex items-center gap-3">
              <Calendar size={14} className="text-accent-red" />
              Central Operations Schedule
           </p>
        </div>
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setFilter('active')}
            className={cn(
              "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              filter === 'active' ? "bg-accent-red text-white shadow-lg" : "text-text-dim hover:text-white"
            )}
          >
            In-Field
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={cn(
              "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              filter === 'completed' ? "bg-accent-red text-white shadow-lg" : "text-text-dim hover:text-white"
            )}
          >
            Neutralized
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
         {filtered.map(booking => (
           <BookingCard key={booking.id} booking={booking} />
         ))}
         {filtered.length === 0 && (
           <div className="py-32 flex flex-col items-center gap-6 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                 <Clock size={32} className="text-neutral-800" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-[0.5em] text-neutral-600">No active deployments</div>
           </div>
         )}
      </div>
    </div>
  );
}

function AvailableSection({ techId, techName, bookings }: { techId: string, techName: string, bookings: any[] }) {
  return (
    <div className="space-y-10">
      <header>
         <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Deployment Pool</h2>
         <p className="text-xs text-text-dim uppercase font-black tracking-widest flex items-center gap-3">
            <Star size={14} className="text-accent-red" />
            Unassigned Missions Available for Deployment
         </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
         {bookings.map(booking => (
           <BookingCard key={booking.id} booking={booking} available techId={techId} techName={techName} />
         ))}
         {bookings.length === 0 && (
           <div className="py-32 flex flex-col items-center gap-6 bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                 <Wrench size={32} className="text-neutral-800" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-[0.5em] text-neutral-600">All sectors clear // No pending missions</div>
           </div>
         )}
      </div>
    </div>
  );
}

function BookingCard({ booking, available = false, techId, techName }: { booking: any, available?: boolean, techId?: string, techName?: string }) {
  const [status, setStatus] = useState(booking.status);
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setStatus(newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const acceptBooking = async () => {
    if (!techId || !techName) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        mechanicId: techId,
        mechanicName: techName,
        status: 'confirmed',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const declineBooking = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        mechanicId: "",
        mechanicName: "",
        status: 'pending',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-900 border border-white/5 rounded-[2.5rem] p-8 md:p-10 group hover:border-accent-red/20 transition-all relative overflow-hidden"
    >
       <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0">
             <div className="w-20 h-20 rounded-[2rem] bg-accent-red/10 border border-accent-red/20 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                <Wrench className="text-accent-red" size={32} />
             </div>
             <div className={cn(
                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-center",
                status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                status === 'confirmed' ? "bg-emerald-500/10 text-emerald-500" :
                status === 'in-progress' ? "bg-blue-500/10 text-blue-500" :
                status === 'completed' ? "bg-emerald-500 text-white" :
                "bg-rose-500/10 text-rose-500"
             )}>
                {status}
             </div>
          </div>

          <div className="flex-1 space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono text-accent-blue font-black tracking-tight mb-2 uppercase italic">Mission_ID: #{booking.id.slice(0, 8)}</div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{booking.serviceType}</h3>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1 italic">Target_Hardware</div>
                  <div className="text-sm font-black text-white uppercase">{booking.carModel}</div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-y border-white/5">
                <div className="space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-red">
                         <User size={18} />
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-0.5">Subject Identity</div>
                        <div className="text-xs font-black text-white uppercase">{booking.fullName}</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-red">
                         <MapPin size={18} />
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-0.5">Deployment Coordinates</div>
                        <div className="text-xs font-black text-white uppercase truncate max-w-[200px]">{booking.address}, {booking.city}</div>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-red">
                         <Calendar size={18} />
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-0.5">Schedule Anchor</div>
                        <div className="text-xs font-black text-white uppercase">
                          {new Date(booking.appointmentDate).toLocaleDateString()} | {booking.appointmentTime}
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-red">
                         <Star size={18} />
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-0.5">Order Value</div>
                        <div className="text-xs font-black text-white">₹{booking.price}</div>
                      </div>
                   </div>
                </div>
             </div>

             {booking.message && (
               <div className="bg-black/40 p-6 rounded-2xl border border-white/5 italic">
                  <div className="text-[9px] font-black text-accent-red uppercase tracking-widest mb-2 flex items-center gap-2">
                     <div className="w-3 h-[1px] bg-accent-red" />
                     Special Intelligence
                  </div>
                  <p className="text-[11px] text-text-dim leading-relaxed uppercase font-bold tracking-tight">"{booking.message}"</p>
               </div>
             )}

             <div className="flex flex-wrap gap-3">
                {available ? (
                   <StatusButton 
                     onClick={acceptBooking}
                     disabled={updating}
                     icon={CheckCircle}
                     label="Accept Mission"
                     color="emerald"
                   />
                ) : (
                  <>
                    {status !== 'completed' && status !== 'cancelled' && (
                      <>
                        <StatusButton 
                          onClick={() => updateStatus('in-progress')}
                          active={status === 'in-progress'}
                          disabled={updating}
                          icon={Clock}
                          label="Deploy Node"
                          color="blue"
                        />
                        <StatusButton 
                          onClick={() => updateStatus('completed')}
                          disabled={updating}
                          icon={CheckCircle}
                          label="Neutralize Task"
                          color="emerald"
                        />
                        <StatusButton 
                          onClick={declineBooking}
                          disabled={updating}
                          icon={X}
                          label="Decline Mission"
                          color="rose"
                        />
                      </>
                    )}
                  </>
                )}
             </div>
          </div>
       </div>
    </motion.div>
  );
}

function StatusButton({ onClick, active, disabled, icon: Icon, label, color }: any) {
  const variants: any = {
    blue: "bg-blue-600/10 text-blue-400 border-blue-600/20 hover:bg-blue-600 hover:text-white",
    emerald: "bg-emerald-600/10 text-emerald-400 border-emerald-600/20 hover:bg-emerald-600 hover:text-white",
    rose: "bg-rose-600/10 text-rose-400 border-rose-600/20 hover:bg-rose-600 hover:text-white"
  };

  const activeVariants: any = {
    blue: "bg-blue-600 text-white shadow-xl shadow-blue-600/20",
    emerald: "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20",
    rose: "bg-rose-600 text-white shadow-xl shadow-rose-600/20"
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-6 py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all scale-100 active:scale-95 disabled:opacity-50",
        active ? activeVariants[color] : variants[color]
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function ProfileSection({ profile, onSave, isLoading }: { profile: any, onSave: (data: any) => Promise<void>, isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: profile.name || "",
    expertise: profile.expertise || "",
    bio: profile.bio || "",
    status: profile.status || "available",
    workingHours: profile.workingHours || { start: "09:00", end: "18:00" },
    experience: profile.experience || ""
  });

  return (
    <div className="space-y-10 pb-20">
      <header>
         <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Operator Profile</h2>
         <p className="text-xs text-text-dim uppercase font-black tracking-widest flex items-center gap-3">
            <User size={14} className="text-accent-red" />
            Core Identity & Intelligence Layer
         </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Left Side - Visuals */}
         <div className="lg:col-span-1 space-y-10">
            <div className="bg-neutral-900 border border-white/5 p-10 rounded-[3rem] text-center space-y-8 relative overflow-hidden group">
               <div className="relative inline-block">
                  <div className="w-48 h-48 rounded-[3.5rem] bg-accent-red/10 border border-white/5 p-2 group-hover:rotate-6 transition-transform">
                     <div className="w-full h-full rounded-[3rem] bg-neutral-800 overflow-hidden relative">
                        <img 
                          src={profile.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                     </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl bg-accent-red flex items-center justify-center border-4 border-neutral-900 text-white shadow-2xl">
                     <Star size={24} fill="currentColor" />
                  </div>
               </div>
               <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight italic mb-1">{formData.name}</h3>
                  <div className="text-[10px] font-black text-accent-blue uppercase tracking-[0.2em]">Rank: Senior Tech Ops</div>
               </div>
               <div className="flex justify-center gap-4">
                  <div className="px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5">
                     <div className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Success Rate</div>
                     <div className="text-sm font-black text-emerald-500 italic">98.4%</div>
                  </div>
                  <div className="px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5">
                     <div className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1">Missions</div>
                     <div className="text-sm font-black text-accent-red italic">142</div>
                  </div>
               </div>
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent-red/0 via-transparent to-accent-red/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            <div className="bg-neutral-900 border border-white/5 p-8 rounded-[2.5rem] space-y-4">
               <div className="text-[10px] font-black text-text-dim uppercase tracking-widest italic flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-red" />
                  Operational Status
               </div>
               <div className="grid grid-cols-1 gap-2">
                  {['available', 'busy', 'off'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setFormData({...formData, status: s as any})}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
                        formData.status === s 
                          ? (s === 'available' ? "bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20" : "bg-accent-red text-white border-accent-red")
                          : "bg-white/5 text-text-dim border-transparent hover:bg-white/10"
                      )}
                    >
                      {s}
                      {formData.status === s && <CheckCircle size={14} />}
                    </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Right Side - Data Inputs */}
         <div className="lg:col-span-2 space-y-10">
            <div className="bg-neutral-900 border border-white/5 p-10 rounded-[3rem] space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Identity Vector</label>
                     <input 
                       type="text"
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm font-black text-white focus:border-accent-red outline-none transition-all uppercase"
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Core Expertise</label>
                     <input 
                       type="text"
                       value={formData.expertise}
                       onChange={(e) => setFormData({...formData, expertise: e.target.value})}
                       className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm font-black text-white focus:border-accent-red outline-none transition-all uppercase"
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Experience Level</label>
                     <input 
                       type="text"
                       value={formData.experience}
                       onChange={(e) => setFormData({...formData, experience: e.target.value})}
                       className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm font-black text-white focus:border-accent-red outline-none transition-all uppercase"
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Signal Window (Hours)</label>
                     <div className="flex gap-4">
                        <input 
                          type="time" 
                          value={formData.workingHours.start}
                          onChange={(e) => setFormData({...formData, workingHours: {...formData.workingHours, start: e.target.value}})}
                          className="flex-1 bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-black text-white focus:border-accent-red outline-none transition-all"
                        />
                        <input 
                          type="time" 
                          value={formData.workingHours.end}
                          onChange={(e) => setFormData({...formData, workingHours: {...formData.workingHours, end: e.target.value}})}
                          className="flex-1 bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-black text-white focus:border-accent-red outline-none transition-all"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Technical Profile Narrative</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={6}
                    className="w-full bg-black/40 border border-white/10 p-8 rounded-[2rem] text-sm font-black text-white focus:border-accent-red outline-none transition-all uppercase tracking-tight leading-relaxed"
                  />
               </div>

               <div className="flex justify-end pt-6 border-t border-white/5">
                  <button 
                    onClick={() => onSave(formData)}
                    disabled={isLoading}
                    className="px-10 py-5 bg-accent-red text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-red-700 transition-all shadow-2xl shadow-red-6500/20 disabled:opacity-50 group active:scale-95"
                  >
                    {isLoading ? <Clock className="animate-spin" size={16} /> : <Save className="group-hover:scale-110 transition-transform" size={16} />}
                    Synchronize Profile Data
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
