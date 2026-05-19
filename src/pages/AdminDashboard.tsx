import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { 
  Users, 
  User,
  Settings, 
  BarChart3, 
  Calendar, 
  Package, 
  LogOut, 
  Bell, 
  Search, 
  ChevronRight,
  ChevronLeft,
  ArrowDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  MoreVertical,
  Plus,
  Save,
  Trash2,
  Monitor,
  Palette,
  Layout,
  MessageSquare,
  ChevronDown,
  Edit,
  Edit2,
  Filter,
  X,
  PlusCircle,
  Wrench,
  Battery,
  Gauge,
  Droplets,
  Disc,
  Shield,
  ShieldCheck,
  Gift,
  Phone,
  Mail,
  Globe,
  Database,
  Upload,
  PieChart,
  Megaphone,
  ListTodo,
  Quote,
  Zap,
  SearchCode,
  Activity,
  Car,
  Fuel,
  Thermometer,
  Settings2,
  RefreshCw,
  Download,
  ShieldAlert,
  Image as ImageIcon,
  List,
  Circle,
  Info,
  UserCheck,
  StarOff,
  Star,
  UserPlus as MechanicIcon,
  LifeBuoy,
  DollarSign,
  RefreshCcw,
  Target,
  MapPin,
  Layers,
  Sparkles,
  Key,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RechartsPie, Pie } from 'recharts';

const ICON_MAP: Record<string, any> = {
  Wrench, Battery, Gauge, Droplets, Disc, Settings, Shield, ShieldCheck, Zap, Activity, Car, Fuel, Thermometer, Settings2
};

import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, setDoc, addDoc, deleteDoc, serverTimestamp, getDoc, getDocs, increment } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { refundPayment } from "../lib/payment";
import { sendTaskNotification, sendStatusUpdateEmail, sendBookingReminder } from "../lib/mail";
import { toast } from "react-toastify";
import { Skeleton } from "../components/ui/Skeleton";

function robustSearch(item: any, query: string, fields: string[]) {
  if (!query) return true;
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  return terms.every(term => 
    fields.some(field => {
      const val = field.split('.').reduce((obj, key) => obj?.[key], item);
      return val?.toString().toLowerCase().includes(term);
    })
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  
  useEffect(() => {
    const unsubLocs = onSnapshot(collection(db, "locations"), (snap) => {
        setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubLocs();
  }, []);

  const [bookings, setBookings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingInquiries, setLoadingInquiries] = useState(true);
  const [loadingMechanics, setLoadingMechanics] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [carData, setCarData] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<any>({
    heroTitle: "EXPERT CAR CARE",
    heroSubtitle: "AT YOUR DOORSTEP",
    supportEmail: "support@carmechs.com",
    supportPhone: "9831231431",
    whatsappNumber: "+919831231431",
    whatsappEnabled: true,
    primaryColor: "#2563EB",
    heroImage: "",
    logoText: "CARMECHS",
    logoUrl: "",
    footerText: "Premium doorstep car services.",
    cashOnServiceEnabled: true,
    seoTitle: "CarMechs | Elite Automotive Care",
    seoDescription: "Professional door-step car repair and detailing services.",
    seoKeywords: "car repair, doorstep mechanic, car wash, detailing",
    navLinks: [{ name: "Services", href: "#services" }, { name: "Mechanics", href: "#mechanics" }],
    footerLegalLinks: [{ name: "Privacy Policy", href: "/privacy" }, { name: "Terms of Service", href: "/terms" }],
    fuelTypes: ["Petrol", "Diesel", "Electric (EV)", "Hybrid", "CNG", "Solar"]
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const isAdminCheck = () => {
    return user && (isSuperAdmin || currentUserProfile?.role === "admin");
  };

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);

  useEffect(() => {
    if (isAdminCheck() && bookings.length > 0) {
      const checkReminders = async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const upcoming = bookings.filter((b: any) => 
          b.appointmentDate === tomorrowStr && 
          (b.status === "confirmed" || b.status === "pending") && 
          !b.reminderSent
        );

        for (const booking of upcoming) {
          try {
            await sendBookingReminder(booking.email, booking.fullName, booking);
            await updateDoc(doc(db, "bookings", booking.id), {
              reminderSent: true,
              updatedAt: serverTimestamp()
            });
            console.log(`Reminder sent for booking ${booking.id}`);
          } catch (err) {
            console.warn(`Reminder transmission protocol failure for ${booking.id}:`, err);
          }
        }
      };

      checkReminders();
    }
  }, [bookings, user, currentUserProfile]);

  useEffect(() => {
    if (user) {
      setAdminProfileLoading(true);
      const checkAdminDoc = async () => {
        try {
          const adminRef = doc(db, "admins", user.uid);
          const userRef = doc(db, "users", user.uid);
          const [adminSnap, userSnap] = await Promise.all([getDoc(adminRef), getDoc(userRef)]);

          if (adminSnap.exists()) {
            const profile = adminSnap.data();
            setCurrentUserProfile(profile);
            setIsSuperAdmin(profile.role === "super_admin" || user.email === "carmechstechlabs@gmail.com");
            return;
          }

          const userRole = userSnap.exists() ? userSnap.data().role : null;
          if (userRole === "admin" || userRole === "super_admin") {
            const profile = {
              email: user.email,
              role: userRole,
              locationId: userSnap.data().locationId || "all",
              createdAt: serverTimestamp(),
            };
            await setDoc(adminRef, profile, { merge: true });
            setCurrentUserProfile(profile);
            setIsSuperAdmin(userRole === "super_admin" || user.email === "carmechstechlabs@gmail.com");
            return;
          }

          if (user.email === "carmechstechlabs@gmail.com") {
            await setDoc(adminRef, {
              email: user.email,
              role: "super_admin",
              locationId: "all",
              createdAt: serverTimestamp()
            });
            setIsSuperAdmin(true);
            setCurrentUserProfile({ role: "super_admin", locationId: "all" });
            return;
          }

          setIsSuperAdmin(false);
          setCurrentUserProfile(null);
        } finally {
          setAdminProfileLoading(false);
        }
      };
      checkAdminDoc();
    } else {
      setIsSuperAdmin(false);
      setCurrentUserProfile(null);
      setAdminProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAdminCheck()) {
      // Seed Rajesh Kumar
      const seedTech = async () => {
        const q = query(collection(db, "technicians"), where("name", "==", "Rajesh Kumar"));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(db, "technicians"), {
            name: "Rajesh Kumar",
            expertise: "Engine Diagnostics",
            bio: "Certified expert with 10+ years of experience in complex engine repairs.",
            rating: 4.8,
            reviewsCount: 55,
            status: "available",
            experience: "10+ Years",
            specialties: ["Engine Tuning", "Emission Control"],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          toast.success("Rajesh Kumar added to technician registry.");
        }
      };
      
      // Seed Services with variants
      const seedServices = async () => {
        const snap = await getDocs(collection(db, "services"));
        if (snap.empty) {
          const sampleServices = [
            {
              title: "General Service",
              description: "Comprehensive vehicle maintenance including oil change, filter replacement, and 50-point inspection.",
              price: 2499,
              isActive: true,
              category: "Maintenance",
              icon: "Wrench",
              variants: [
                { make: "Maruti Suzuki", model: "all", fuel: "Petrol", price: 1899 },
                { make: "Hyundai", model: "all", fuel: "Petrol", price: 2199 },
                { make: "Honda", model: "all", fuel: "Petrol", price: 2599 },
                { make: "Toyota", model: "Innova", fuel: "Diesel", price: 3999 },
                { make: "Mahindra", model: "XUV700", fuel: "Diesel", price: 4499 },
                { make: "all", model: "all", fuel: "Electric", price: 2999 }
              ]
            },
            {
              title: "Pre-Purchase Inspection",
              description: "Detailed 150-point inspection before you buy a used car. Includes paint depth check and mechanical scan.",
              price: 3499,
              isActive: true,
              category: "Inspection",
              icon: "Search",
              variants: [
                { make: "all", model: "Luxury", fuel: "all", price: 5499 },
                { make: "all", model: "SUV", fuel: "all", price: 3999 }
              ]
            },
            {
              title: "Brake System Overhaul",
              description: "Pad replacement, disc resurfacing, and brake fluid flushing for maximum stopping power.",
              price: 2999,
              isActive: true,
              category: "Repair",
              icon: "ShieldAlert",
              variants: [
                { make: "Mercedes-Benz", model: "all", fuel: "all", price: 8999 },
                { make: "BMW", model: "all", fuel: "all", price: 8999 },
                { make: "Audi", model: "all", fuel: "all", price: 8999 }
              ]
            },
            {
              title: "Engine Diagnostics",
              description: "Advanced ECU scanning and sub-system health check with report.",
              price: 999,
              isActive: true,
              category: "Diagnostics",
              icon: "Zap",
              variants: [
                { make: "BMW", model: "all", fuel: "all", price: 2499 },
                { make: "Mercedes-Benz", model: "all", fuel: "all", price: 2499 },
                { make: "Audi", model: "all", fuel: "all", price: 2499 }
              ]
            },
            {
              title: "AC System Overhaul",
              description: "Gas recharge, leak detection and filter sterilization.",
              price: 1599,
              isActive: true,
              category: "Repair",
              icon: "Wind",
              variants: [
                { make: "Toyota", model: "Fortuner", fuel: "all", price: 2499 },
                { make: "all", model: "all", fuel: "Electric", price: 1899 }
              ]
            }
          ];
          for (const s of sampleServices) {
            await addDoc(collection(db, "services"), s);
          }
          toast.success("Tactical service catalog initialized with variants.");
        }
      };
      
      // Seed Config if needed
      const seedConfig = async () => {
        const configRef = doc(db, "config", "ui");
        const docSnap = await getDoc(configRef);
        let shouldUpdate = false;
        
        const updates: any = {};
        if (!docSnap.exists() || docSnap.data().supportEmail !== "support@carmechs.com") {
          updates.supportEmail = "support@carmechs.com";
          shouldUpdate = true;
        }
        if (!docSnap.exists() || docSnap.data().whatsappNumber !== "+919831231431") {
          updates.whatsappNumber = "+919831231431";
          shouldUpdate = true;
        }
        if (!docSnap.exists() || docSnap.data().whatsappEnabled !== true) {
          updates.whatsappEnabled = true;
          shouldUpdate = true;
        }
        if (!docSnap.exists() || docSnap.data().referralRewardAmount === undefined) {
          updates.referralRewardAmount = 500;
          shouldUpdate = true;
        }
        
        if (shouldUpdate) {
          await setDoc(configRef, updates, { merge: true });
          toast.success("System parameters synchronized (Referral Reward: ₹500).");
        }
      };

      seedTech();
      seedConfig();
      seedServices();

      // Seed System Config
      const seedSystemConfig = async () => {
        const configRef = doc(db, "config", "system");
        const configSnap = await getDoc(configRef);
        if (!configSnap.exists()) {
          await setDoc(configRef, {
            supportEmail: "support@carmechs.com",
            whatsappNumber: "+919831231431",
            whatsappEnabled: true,
            referralRewardAmount: 250,
            currency: "INR",
            razorpayEnabled: true,
            updatedAt: serverTimestamp()
          });
        }
      };

      seedTech();
      seedConfig();
      seedServices();
      seedSystemConfig();
    }
  }, [user, isSuperAdmin, currentUserProfile]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // Sync Car Hub data from Firestore
    const unsubCarHub = onSnapshot(collection(db, "carBrands"), (snapshot) => {
      if (!snapshot.empty) {
        const migrated: Record<string, any> = {};
        snapshot.docs.forEach(d => {
          const brand = d.id;
          const val = d.data();
          const models = (val.models || []).map((m: any) => typeof m === 'string' ? { name: m, logo: "" } : m);
          migrated[brand] = { ...val, models };
        });
        setCarData(migrated);
      } else if (user) {
        // Only attempt to initialize if we have a user
        const defaults: Record<string, any> = {
          Maruti: { logo: "https://www.marutisuzuki.com/content/dam/msil/images/logo.png", models: [
            { name: "Swift", logo: "" }, { name: "Baleno", logo: "" }, { name: "WagonR", logo: "" }
          ] },
          Hyundai: { logo: "https://www.hyundai.com/content/dam/hyundai/in/en/data/find-a-car/Hyundai-Logo.png", models: [
            { name: "i20", logo: "" }, { name: "Creta", logo: "" }, { name: "Verna", logo: "" }
          ] },
          Tata: { logo: "https://www.tatamotors.com/wp-content/themes/tatamotors/assets/images/header-logo.png", models: [
            { name: "Nexon", logo: "" }, { name: "Punch", logo: "" }, { name: "Tiago", logo: "" }
          ] },
          Toyota: { logo: "https://www.toyota.com/imgix/responsive/images/global/footer/toyota_logo.png", models: [
            { name: "Fortuner", logo: "" }, { name: "Innova Crysta", logo: "" }
          ] },
          "MG Motor": { logo: "https://www.mgmotor.co.in/content/dam/mgmotor/in/logo/MG-Logo.png", models: [
            { name: "Hector", logo: "https://www.mgmotor.co.in/content/dam/mgmotor/in/variant/hector/mg-hector-thumbnail.png", fuelTypes: ["Petrol", "Diesel"] },
            { name: "Astor", logo: "https://www.mgmotor.co.in/content/dam/mgmotor/in/variant/astor/mg-astor-thumbnail.png", fuelTypes: ["Petrol"] }
          ] },
        };
        setCarData(defaults);
        if (isAdminCheck()) {
           Object.entries(defaults).forEach(([brand, data]) => {
             setDoc(doc(db, "carBrands", brand), data).catch(e => console.warn(`Failed to seed ${brand}:`, e.message));
           });
        }
      }
    }, (err) => {
      console.warn("Car Hub Repository Error handled:", err.message);
    });

    return () => unsubCarHub();
  }, []);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }

    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubBookings = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by location for location-specific admins
      if (currentUserProfile && currentUserProfile.role === "admin" && currentUserProfile.locationId !== "all") {
        docs = docs.filter((b: any) => b.locationId === currentUserProfile.locationId || b.location === locations.find(l => l.id === currentUserProfile.locationId)?.name);
      }
      
      setBookings(docs);
      setLoadingBookings(false);
    }, (err) => {
      setLoadingBookings(false);
      if (err.code === "permission-denied") {
        console.warn("Restricted access: This user session does not have admin permissions to view full mission manifests.");
      } else {
        console.error("Bookings Repository Error:", err);
      }
    });

    const unsubInquiries = onSnapshot(query(collection(db, "inquiries"), orderBy("createdAt", "desc")), (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingInquiries(false);
    }, (err) => {
      setLoadingInquiries(false);
      console.warn("Inquiries sync error handled:", err.message);
    });

    const unsubMechanics = onSnapshot(collection(db, "technicians"), (snapshot) => {
      setMechanics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingMechanics(false);
    }, (err) => {
      setLoadingMechanics(false);
      if (err.code === "permission-denied") {
        console.warn("Restricted access: Technician registry access denied.");
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter by location for location-specific admins
      if (currentUserProfile && currentUserProfile.role === "admin" && currentUserProfile.locationId !== "all") {
        docs = docs.filter((u: any) => u.locationId === currentUserProfile.locationId || u.city === locations.find(l => l.id === currentUserProfile.locationId)?.city);
      }

      setUsersList(docs);
      setLoadingUsers(false);
    }, (err) => {
      setLoadingUsers(false);
      console.warn("Users sync error (expected if not super-admin):", err.message);
    });

    const unsubConfig = onSnapshot(doc(db, "config", "ui"), (d) => {
      if (d.exists()) setConfig((prev: any) => ({ ...prev, ...d.data() }));
    }, (err) => {
       console.warn("Global UI config error:", err.message);
    });

    return () => {
      unsubBookings();
      unsubInquiries();
      unsubMechanics();
      unsubUsers();
      unsubConfig();
    };
  }, [user, currentUserProfile, locations]);

  const handleLogin = async () => {
    try {
      setLoginError("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Error:", err);
      setLoginError("Failed to sign in with Google.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedEmail = loginEmail.trim().toLowerCase();
    
    try {
      setLoginError("");
      await signInWithEmailAndPassword(auth, sanitizedEmail, loginPassword);
    } catch (err: any) {
      console.error("Email Login Error:", err);
      const errorCode = err.code || "";
      const errorMessage = err.message || "";
      
      // Handle the case where the Email/Password provider is disabled in Firebase console
      if (errorCode === "auth/operation-not-allowed" || errorMessage.includes("operation-not-allowed")) {
        setLoginError("Configuration Error: Email/Password login is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.");
        return;
      }

      // If the credential is invalid, it might be because the account doesn't exist yet.
      // For the designated Super Admin email, we attempt to auto-provision on the first login attempt.
      if (
        (errorCode === "auth/invalid-credential" || errorCode === "auth/user-not-found" || errorMessage.includes("invalid-credential")) && 
        sanitizedEmail === "carmechstechlabs@gmail.com"
      ) {
        try {
          // Attempting to create the admin account on the fly
          await createUserWithEmailAndPassword(auth, sanitizedEmail, loginPassword);
          return; // Successfully created and signed in
        } catch (createErr: any) {
          const createCode = createErr.code || "";
          if (createCode === "auth/email-already-in-use") {
            setLoginError("Access Denied: Incorrect security key for this admin account. If you forgot the key, please contact support or delete the user in Firebase Console.");
          } else if (createCode === "auth/operation-not-allowed") {
             setLoginError("Configuration Error: Email/Password registration is not enabled in Firebase Console.");
          } else {
            setLoginError(`Initialization Error: ${createErr.message}`);
          }
          return;
        }
      }

      // Fallback error mapping
      if (errorCode === "auth/invalid-credential" || errorMessage.includes("invalid-credential")) {
        setLoginError("Login Failed: The security key provided is incorrect or the admin account does not permit access.");
      } else {
        setLoginError(`Login Error: ${errorMessage}`);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const { "*": path } = useParams();
  const portalSlug = path?.startsWith("login/") ? path.split("/")[1] : null;
  const [portalLoc, setPortalLoc] = useState<any>(null);

  useEffect(() => {
    if (portalSlug && locations.length > 0) {
      const found = locations.find(l => l.slug === portalSlug || l.id === portalSlug);
      if (found) setPortalLoc(found);
    }
  }, [portalSlug, locations]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-neutral-950 text-white">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    if (tab === "logout") {
      handleLogout();
    } else {
      setActiveTab(tab);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg-soft px-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[3.5rem] max-w-md w-full text-center shadow-vibrant border-4 border-white relative overflow-hidden"
        >
          {/* Decorative accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full -ml-12 -mb-12 blur-2xl" />

          {portalLoc ? (
             <div className="mb-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-white">
                   <Globe size={32} />
                </div>
                <h2 className="text-2xl font-black text-ink uppercase tracking-tight italic">{portalLoc.name}</h2>
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-2 italic px-3 py-1 bg-primary/10 rounded-full w-fit mx-auto border border-primary/10">Location Command Center</div>
             </div>
          ) : (
            <div className="bg-primary w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-lg rotate-3">
              <Shield size={32} />
            </div>
          )}
          <h1 className="text-4xl font-black text-ink mb-3 tracking-tighter">
            {portalLoc ? "Hub Access" : "Welcome Back!"}
          </h1>
          <p className="text-slate-500 mb-10 text-sm font-medium">Log in to manage the {portalLoc ? portalLoc.city : 'CarMechs'} universe.</p>
          
          <form onSubmit={handleEmailLogin} className="space-y-6 text-left relative z-10">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Admin Email</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="carmechstechlabs@gmail.com"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Security Key</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                required
              />
            </div>
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl"
              >
                <div className="flex gap-3">
                  <AlertCircle size={18} className="text-rose-500 shrink-0" />
                  <p className="text-rose-600 text-[11px] font-bold leading-tight">{loginError}</p>
                </div>
              </motion.div>
            )}
            <button 
              type="submit"
              className="w-full bg-primary text-white py-5 rounded-2xl font-black text-base hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
            >
              Start Session
              <PlusCircle size={20} />
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-50"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400"><span className="bg-white px-4 tracking-[0.3em]">Or use magic</span></div>
          </div>

          <button 
            type="button"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-ink py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all border-2 border-slate-100 hover:border-slate-200"
          >
            <LogIn size={20} className="text-primary" />
            Quick Sign-In
          </button>
        </motion.div>
      </div>
    );
  }

  if (adminProfileLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-neutral-950 text-white">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  if (!isAdminCheck()) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-bg-soft px-4 font-sans text-center">
             <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-12 rounded-[3.5rem] max-w-md w-full shadow-vibrant border-4 border-white"
             >
                <div className="bg-rose-100 text-rose-500 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                    <ShieldAlert size={40} />
                </div>
                <h2 className="text-3xl font-black text-ink mb-4 italic tracking-tighter">ACCESS DENIED</h2>
                <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed uppercase tracking-tighter">Your biological signature does not possess the required clearance level for core systems access.</p>
                <button 
                    onClick={handleLogout}
                    className="w-full bg-black text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all active:scale-95"
                >
                    Return to Surface
                </button>
             </motion.div>
        </div>
    );
  }

  const sidebarItems = [
    { id: "overview", name: "Overview", icon: BarChart3 },
    { id: "bookings", name: "Bookings", icon: Calendar },
    { id: "reports", name: "Revenue Reports", icon: PieChart },
    { id: "mechanics", name: "Technicians", icon: MechanicIcon },
    { id: "services", name: "Services CMS", icon: Package },
    { id: "variants", name: "Service Variations", icon: Layers },
    { id: "content", name: "Content CMS", icon: Layout },
    { id: "carhub", name: "Car Hub DB", icon: Car },
    { id: "tasks", name: "Internal Tasks", icon: ListTodo },
    { id: "testimonials", name: "Testimonials", icon: Quote },
    { id: "referrals", name: "Referral System", icon: Gift },
    { id: "marketing", name: "Marketing CMS", icon: Megaphone },
    { id: "feedback", name: "User Feedback", icon: MessageSquare },
    { id: "customers", name: "User Management", icon: Users },
    { id: "fleet", name: "Fleet Telemetry", icon: Activity },
    { id: "locations", name: "Location Control", icon: Globe },
    { id: "inquiries", name: "Support Inquiries", icon: MessageSquare },
    { id: "integrations", name: "API Integrations", icon: Zap },
    { id: "secrets", name: "Security Vault", icon: Key },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-bg-soft text-ink font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 280 }}
        className="bg-white flex flex-col border-r-4 border-bg-soft shrink-0 relative transition-all duration-300 ease-in-out"
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-4 top-12 w-8 h-8 bg-white border-2 border-bg-soft rounded-full flex items-center justify-center text-primary shadow-lg hover:scale-110 active:scale-95 transition-all z-50"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={cn("p-10 transition-all", isSidebarCollapsed && "px-4 py-8")}>
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab("overview")}>
            <div className={cn(
              "rounded-[1.25rem] bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-6 transition-all duration-500 shrink-0",
              isSidebarCollapsed ? "w-12 h-12" : "w-12 h-12"
            )}>
              <Package size={24} />
            </div>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="text-ink font-black text-2xl tracking-tighter uppercase leading-none">
                  {config?.logoText || "CARMECHS"}
                </div>
                <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">Admin Control</div>
              </motion.div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-6 overflow-y-auto custom-scrollbar scroll-smooth">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-4 transition-all rounded-2xl group relative",
                isSidebarCollapsed ? "justify-center px-0 py-4" : "px-6 py-4",
                activeTab === item.id 
                  ? "text-primary bg-primary-soft" 
                  : "text-slate-400 hover:text-ink hover:bg-slate-50"
              )}
              title={isSidebarCollapsed ? item.name : ""}
            >
              <item.icon size={20} className={cn("transition-colors shrink-0", activeTab === item.id ? "text-primary" : "text-slate-300 group-hover:text-slate-500")} />
              {!isSidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-black whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className={cn(
                    "absolute bg-primary rounded-full shadow-lg shadow-primary/20",
                    isSidebarCollapsed ? "left-0 w-1 h-8" : "right-2 w-1.5 h-6"
                  )}
                />
              )}
            </button>
          ))}
        </nav>

        <div className={cn("p-10 border-t-2 border-slate-50 transition-all", isSidebarCollapsed && "p-4")}>
          {!isSidebarCollapsed ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-50 p-6 rounded-[2rem] space-y-3 mb-8"
            >
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>System</span>
                <span className="text-emerald-500 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" /> 
                  Online
                </span>
              </div>
              <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "85%" }}
                  className="h-full bg-primary" 
                />
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-1 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
              <div className="w-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-full h-[85%] bg-primary" />
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center transition-all rounded-2xl group",
              isSidebarCollapsed ? "justify-center p-4 hover:bg-rose-50" : "gap-4 px-6 py-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
            )}
            title={isSidebarCollapsed ? "Logout" : ""}
          >
            <LogOut size={20} className={cn("shrink-0", isSidebarCollapsed ? "text-slate-300 group-hover:text-rose-500" : "text-slate-300 group-hover:text-rose-500")} />
            {!isSidebarCollapsed && <span className="text-sm font-black uppercase tracking-widest">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[100px] bg-white border-b-4 border-bg-soft flex items-center justify-between px-12 relative z-20">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1.5 opacity-60">Verified Admin Session</div>
            <div className="text-3xl font-black tracking-tight text-ink">
              {sidebarItems.find(i => i.id === activeTab)?.name}
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="hidden xl:flex items-center gap-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">
               <p className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-indigo-500 shadow-vibrant" /> ID: <span className="text-text-muted font-bold">#CMS-IND-01</span></p>
               <p className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-vibrant" /> Ver: <span className="text-text-muted font-bold">v3.5.0-PRO</span></p>
            </div>
            <div className="h-10 w-1 bg-bg-soft rounded-full"></div>
            <div className="flex items-center gap-5">
              <div className="text-right hidden md:block">
                <div className="text-sm font-black text-ink">{user.displayName || user.email?.split('@')[0]}</div>
                <div className="text-[9px] text-secondary font-black uppercase tracking-[0.2em] mt-1">
                  {user.email === 'carmechstechlabs@gmail.com' ? 'Super Admin' : 'Manager'}
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border-4 border-bg-soft shadow-xl p-0.5 overflow-hidden transition-transform hover:scale-105">
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/big-smile/svg?seed=${user.email}`} 
                  alt="Admin" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -mr-64 -mt-64 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full -ml-64 -mb-64 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10">
            {activeTab === "overview" && <OverviewTab bookings={bookings} usersList={usersList} onTabChange={handleTabChange} />}
            {activeTab === "bookings" && <BookingsTab bookings={bookings} mechanics={mechanics} loading={loadingBookings} />}
            {activeTab === "reports" && <ReportsTab bookings={bookings} />}
            {activeTab === "mechanics" && <TechniciansTab />}
            {activeTab === "services" && <ServicesTab carData={carData} />}
            {activeTab === "variants" && <VariantsTab carData={carData} />}
            {activeTab === "content" && <ContentTab config={config} setConfig={setConfig} />}
            {activeTab === "carhub" && <CarHubTab carData={carData} setCarData={setCarData} />}
            {activeTab === "inquiries" && <InquiriesTab inquiries={inquiries} loading={loadingInquiries} />}
            {activeTab === "tickets" && <TicketsTab />}
            { activeTab === "tasks" && <TasksTab /> }
            { activeTab === "testimonials" && <TestimonialsTab /> }
            { activeTab === "referrals" && <ReferralsTab /> }
            { activeTab === "locations" && <LocationsTab /> }
            { activeTab === "integrations" && <IntegrationsTab /> }
            { activeTab === "secrets" && <SecretsTab /> }
            { activeTab === "customers" && <UsersTab locations={locations} /> }
            { activeTab === "fleet" && <FleetControlTab bookings={bookings} technicians={mechanics} /> }
            { activeTab === "marketing" && <MarketingTab /> }
            { activeTab === "feedback" && <FeedbackTab /> }
            { activeTab === "settings" && <SettingsTab user={user} config={config} setConfig={setConfig} /> }
          </div>
        </div>
      </main>
    </div>
  );
}

function OverviewTab({ bookings, usersList, onTabChange }: { bookings: any[], usersList: any[], onTabChange: (tab: string) => void }) {
  const totalRevenue = bookings.reduce((acc, b) => acc + (b.price || 0), 0);
  const avgOrderValue = bookings.length > 0 ? (totalRevenue / bookings.length).toFixed(0) : "0";
  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
  const missionSuccessRate = bookings.length > 0 ? ((confirmedBookings / bookings.length) * 100).toFixed(1) : "0";

  const activeUsers = usersList.length;
  const totalTechnicians = usersList.filter(u => u.role === 'mechanic').length;

  const stats = [
    { name: "Total Users", value: activeUsers.toString(), icon: Users, color: "text-blue-500", trend: "+12%", label: "VERIFIED_BIOMETRICS" },
    { name: "Live Operations", value: bookings.filter(b => b.status === "in-progress" || b.status === "confirmed").length.toString(), icon: Zap, color: "text-yellow-500", trend: "+5.2%", label: "ACTIVE_CIRCUITS" },
    { name: "Fleet Size", value: totalTechnicians.toString(), icon: Wrench, color: "text-indigo-500", trend: "+2", label: "AVAIL_MECHANICS" },
    { name: "Monthly Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-rose-500", trend: "+24.1%", label: "WEALTH_FLOW" },
  ];

  const secondaryKPIs = [
    { name: "Total Missions", value: bookings.length.toString(), icon: Calendar, color: "text-accent-blue" },
    { name: "Avg. Mission Value", value: `₹${Number(avgOrderValue).toLocaleString()}`, icon: DollarSign, color: "text-accent-blue" },
    { name: "Conversion Rate", value: "12.4%", icon: Target, color: "text-accent-red" },
    { name: "Support Rating", value: "4.9/5", icon: Star, color: "text-yellow-400" },
  ];

  const recentBookings = bookings.slice(0, 6);

  // Calculate real chart data
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayBookings = bookings.filter(b => b.createdAt?.toDate?.().toISOString().split('T')[0] === dateStr);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayBookings.reduce((acc, b) => acc + (b.price || 0), 0),
      missions: dayBookings.length
    };
  });

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div 
            key={i}
            className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group hover:translate-y-[-8px] transition-all"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon size={100} strokeWidth={1} />
            </div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner", stat.color)}>
                <stat.icon size={22} />
              </div>
              <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] bg-black/40 px-3 py-1 rounded-full border border-white/5">{stat.name}</div>
            </div>
            
            <div className="relative z-10">
              <div className="text-5xl font-black italic tracking-tighter text-white mb-4 leading-none">{stat.value}</div>
              <div className={cn(
                "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border w-fit",
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                <TrendingUp size={12} /> {stat.trend} <span className="text-text-dim opacity-50 ml-1">{stat.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {secondaryKPIs.map((kpi, i) => (
          <div key={i} className="bg-card-bg/60 p-6 rounded-3xl border border-white/5 shadow-xl flex items-center gap-5 group hover:bg-card-bg transition-colors">
            <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shadow-inner", kpi.color)}>
              <kpi.icon size={18} className="group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] mb-1">{kpi.name}</div>
              <div className="text-lg font-black text-white italic tracking-tight">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-white/5 pb-8">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-1">Operational <span className="text-accent-red">Pulse</span></h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Telemetry stream of revenue and mission success rate</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-accent-red shadow-[0_0_8px_#EF4444]" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Revenue Flow</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_8px_#3B82F6]" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Mission Volume</span>
            </div>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMiss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontWeight: 900 }}
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tick={{ fontWeight: 900 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '20px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#EF4444" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="missions" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorMiss)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card-bg rounded-[2.5rem] border border-border-subtle overflow-hidden shadow-2xl flex flex-col relative group">
            <div className="bg-white/2 px-10 py-8 border-b border-white/5 flex items-center justify-between relative z-10">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.4em] text-white flex items-center gap-4 italic leading-none mb-1">
                  <div className="w-2 h-2 rounded-full bg-accent-red shadow-[0_0_15px_#EF4444]" />
                  Live Deployment Registry
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-text-dim ml-6">Tracking real-time operational state</p>
              </div>
              <button className="px-6 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-text-dim hover:text-white hover:bg-white/10 transition-all flex items-center gap-3">
                <Download size={14} /> EXPORT_LOGS
              </button>
            </div>
            
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/30 border-b border-white/5 text-text-dim">
                    <th className="px-10 py-6 font-black uppercase tracking-[0.3em] text-[10px]">IDENTIFIER</th>
                    <th className="px-10 py-6 font-black uppercase tracking-[0.3em] text-[10px]">CUSTOMER_NODE</th>
                    <th className="px-10 py-6 font-black uppercase tracking-[0.3em] text-[10px]">VEHICLE_SPEC</th>
                    <th className="px-10 py-6 font-black uppercase tracking-[0.3em] text-[10px] text-center">STAGES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentBookings.map((booking, i) => (
                    <tr key={i} className="hover:bg-accent-red/[0.02] transition-all group">
                      <td className="px-10 py-6 font-mono text-[10px] text-accent-red font-black tracking-[0.1em]">
                         ID_{booking.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-10 py-6">
                        <div className="font-black text-[13px] uppercase italic text-white group-hover:text-accent-red transition-colors mb-1 tracking-tight">{booking.fullName}</div>
                        <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{booking.phone}</div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3 font-black text-[11px] text-text-dim uppercase italic tracking-tighter">
                          <Car size={16} className="text-neutral-700" />
                          {booking.carModel || "PROTO_GEN_1"}
                          <span className="text-neutral-800 text-[9px] font-mono font-normal">({booking.carFuel || "N/A"})</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.25em] shadow-xl inline-block border",
                          booking.status === "in-progress" && "bg-blue-600/10 text-blue-400 border-blue-600/20",
                          booking.status === "pending" && "bg-amber-600/10 text-amber-500 border-amber-600/20",
                          booking.status === "completed" && "bg-emerald-600/10 text-emerald-400 border-emerald-600/20",
                          booking.status === "cancelled" && "bg-rose-600/10 text-rose-400 border-rose-600/20",
                        )}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 border-t border-white/5 bg-black/20 flex justify-center">
              <button 
                onClick={() => onTabChange("bookings")}
                className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim hover:text-white transition-all flex items-center gap-4 group/more"
              >
                VIEW_FULL_MANIFEST_INDEX
                <ChevronRight size={14} className="group-hover/more:translate-x-2 transition-transform text-accent-red" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] italic mb-8 flex items-center justify-between border-b border-white/5 pb-6">
              Quick Ops
              <Zap size={16} className="text-accent-red animate-pulse" />
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Initialize Service", icon: Plus, color: "bg-emerald-600/20 text-emerald-400 border-emerald-600/30", action: () => onTabChange("services") },
                { label: "Update CMS Layer", icon: Layout, color: "bg-blue-600/20 text-blue-400 border-blue-600/30", action: () => onTabChange("content") },
                { label: "Sync Logistics", icon: RefreshCw, color: "bg-orange-600/20 text-orange-400 border-orange-600/30", action: () => window.location.reload() },
                { label: "De-Auth Session", icon: LogOut, color: "bg-rose-600/20 text-rose-400 border-rose-600/30", action: () => onTabChange("logout") },
              ].map((opt, i) => (
                <button 
                  key={i}
                  onClick={opt.action}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group/btn shadow-lg",
                    opt.color,
                    "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <div className="p-2.5 rounded-xl bg-black/40 shadow-inner group-hover/btn:rotate-12 transition-transform">
                    <opt.icon size={18} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest leading-none">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-inner relative overflow-hidden group">
             <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
               <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] italic mb-0">System Alerts</h3>
               <div className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-500 text-[8px] font-black uppercase animate-pulse">Critical</div>
             </div>
             <div className="space-y-6">
                <div className="flex gap-4 group/alert">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0 animate-pulse" />
                  <div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight mb-1 group-hover/alert:text-rose-500 transition-colors">Credential Collision Detected</div>
                    <p className="text-[9px] font-medium text-neutral-600 leading-relaxed uppercase">Multiple login attempts recorded from IP: 192.168.1.1. System locked for 5m.</p>
                  </div>
                </div>
                <div className="flex gap-4 group/alert opacity-60">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight mb-1 group-hover/alert:text-emerald-500 transition-colors">Core Sync Completed</div>
                    <p className="text-[9px] font-medium text-neutral-600 leading-relaxed uppercase">Database migration protocol v4.2.1 finalized successfully at 04:00 UTC.</p>
                  </div>
                </div>
                <div className="flex gap-4 group/alert opacity-60">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                   <div>
                     <div className="text-[11px] font-black text-white uppercase tracking-tight mb-1 group-hover/alert:text-blue-500 transition-colors">Traffic Spike Forecasted</div>
                     <p className="text-[9px] font-medium text-neutral-600 leading-relaxed uppercase">Predictive model indicates 20% increase in service bookings for next 48h.</p>
                   </div>
                 </div>
             </div>
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <ShieldAlert size={80} strokeWidth={1} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ bookings, mechanics, loading = false }: { bookings: any[], mechanics: any[], loading?: boolean }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [statusFilters, setStatusFilters] = useState<string[]>(["all"]);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredBookings = bookings.filter(b => {
    const statusMatch = statusFilters.includes("all") || statusFilters.includes(b.status);
    const searchMatch = robustSearch(b, search, ["fullName", "phone", "carModel", "carDetails.make", "carDetails.model", "serviceType", "id", "city", "appointmentDate"]);
    return statusMatch && searchMatch;
  }).sort((a, b) => {
    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
    // Default to newest first (createdAt) 
    if (sortOrder === "desc") return dateB - dateA;
    return dateA - dateB;
  });
  
  const toggleStatusFilter = (status: string) => {
    if (status === "all") {
      setStatusFilters(["all"]);
      return;
    }
    const newFilters = statusFilters.filter(f => f !== "all");
    if (newFilters.includes(status)) {
       const next = newFilters.filter(f => f !== status);
       setStatusFilters(next.length === 0 ? ["all"] : next);
    } else {
       setStatusFilters([...newFilters, status]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedBookings.length === 0) return;
    
    const confirm = window.confirm(`Apply "${action}" to ${selectedBookings.length} selected missions?`);
    if (!confirm) return;

    try {
      if (action === "completed" || action === "confirmed") {
        await Promise.all(selectedBookings.map(id => {
          const booking = bookings.find(b => b.id === id);
          return handleStatusUpdate(id, action, booking?.email, booking?.fullName, booking?.carModel, booking?.serviceType, booking?.appointmentDate, booking?.appointmentTime, booking?.userId, booking?.price);
        }));
      } else if (action === "remind") {
        await Promise.all(selectedBookings.map(id => {
          const booking = bookings.find(b => b.id === id);
          if (booking) return sendReminder(booking);
        }));
      }
      setSelectedBookings([]);
      toast.success(`Bulk protocol executed: ${action.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk process failure.");
    }
  };

  if (loading) return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
      <div className="space-y-4">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />)}
      </div>
    </div>
  );

  const handleStatusUpdate = async (id: string, newStatus: string, email?: string, fullName?: string, carModel?: string, serviceType?: string, appointmentDate?: string, appointmentTime?: string, userId?: string, price?: number) => {
    try {
      const updatePayload: any = { 
        status: newStatus,
        updatedAt: serverTimestamp() 
      };

      if (carModel) updatePayload.carModel = carModel;
      if (serviceType) updatePayload.serviceType = serviceType;

      await updateDoc(doc(db, "bookings", id), updatePayload);

      // Award Loyalty Points on Completion
      if (newStatus === "completed" && userId && userId !== "anonymous" && price) {
        const bookingSnap = await getDoc(doc(db, "bookings", id));
        if (bookingSnap.exists() && !bookingSnap.data().pointsAwarded) {
          const pointsEarned = Math.floor(price / 10);
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            await updateDoc(userRef, {
              loyaltyPoints: increment(pointsEarned),
              updatedAt: serverTimestamp()
            });
            await updateDoc(doc(db, "bookings", id), {
              pointsAwarded: true,
              pointsEarned
            });
            toast.info(`Protocol Reward: ${pointsEarned} loyalty points archived to user node.`);
          }
        }
      }
      
      // Trigger Server-Side Notification on Status Change
      if (email) {
        try {
          await sendStatusUpdateEmail({
            email: email,
            fullName: fullName || "Customer",
            bookingId: id,
            status: newStatus,
            carModel: carModel || "Vehicle Node",
            serviceType: serviceType || "Maintenance Operation",
            date: appointmentDate || "TBA",
            time: appointmentTime || "TBA"
          });
        } catch (e) {
          console.warn("Status Notification trigger failed:", e);
        }
      }
      
      toast.success(`Status successfully transitioned to ${newStatus.toUpperCase()}.`);
    } catch (error) {
       console.error("Critical Protocol Update Failure:", error);
       toast.error("Status sequence update failed. Check console for logs.");
    }
  };

  const sendReminder = async (booking: any) => {
    try {
      // Re-use confirmation API for reminder or create a specific one
      await fetch("/api/notify/booking-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: booking.email,
          fullName: booking.fullName,
          bookingId: booking.id,
          serviceType: `REMINDER: ${booking.serviceType}`,
          date: booking.appointmentDate,
          time: booking.appointmentTime
        })
      });
      toast.success(`Tactical reminder sent to ${booking.fullName}.`);
    } catch (err) {
      console.error(err);
      toast.error("Reminder transmission failed.");
    }
  };

  const handleSaveNotes = async (id: string, updatedFields?: any) => {
    try {
      const fields = { 
        adminNotes: notes[id],
        ...updatedFields,
        updatedAt: serverTimestamp() 
      };
      
      // Remove undefined fields
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);

      await updateDoc(doc(db, "bookings", id), fields);
      toast.success("System registry updated successfully.");
    } catch (error) {
      console.error("Update Error:", error);
      toast.error("Relational update failed.");
    }
  };

  const handleRefund = async (booking: any) => {
    if (!window.confirm(`Issue full refund for ${booking.fullName} (₹${booking.price})?`)) return;
    
    try {
      const success = await refundPayment(booking.paymentId);
      if (success) {
        await updateDoc(doc(db, "bookings", booking.id), {
          status: "cancelled",
          paymentStatus: "refunded",
          refundId: `ref_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          updatedAt: serverTimestamp()
        });
        
        // Notify user of cancellation/refund
        await sendStatusUpdateEmail({
           email: booking.email,
           fullName: booking.fullName,
           bookingId: booking.id,
           status: "cancelled",
           carModel: booking.carModel,
           serviceType: booking.serviceType
        });

        toast.success("Refund processed successfully.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Refund protocol failed.");
    }
  };

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative pb-32">
      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedBookings.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4"
          >
            <div className="bg-neutral-900 border-2 border-primary/40 p-6 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Package size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase italic tracking-tight">{selectedBookings.length} Nodes Intercepted</h4>
                  <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-1">Multi-vector protocol execution</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {["confirmed", "completed", "cancelled"].map(status => (
                    <button 
                      key={status}
                      onClick={() => handleBulkAction(status)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
                        status === "cancelled" 
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                      )}
                    >
                      Set {status}
                    </button>
                  ))}
                  <button 
                    onClick={() => handleBulkAction("remind")}
                    className="px-6 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                  >
                    Send Reminders
                  </button>
                </div>
                <div className="w-[1px] h-10 bg-white/10 mx-2" />
                <button 
                  onClick={() => setSelectedBookings([])}
                  className="text-[10px] font-black text-text-dim hover:text-white uppercase tracking-widest px-4"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent-red border border-white/5 shadow-inner relative">
                <Calendar size={28} />
                {bookings.some(b => b.status === 'pending') && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-car-bg animate-pulse" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic leading-none mb-1 text-white">Registry Control</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Operational management interface</p>
              </div>
           </div>
           <div className="flex flex-wrap gap-4 items-center">
             <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                {["all", "pending", "confirmed", "in-progress", "completed", "cancelled"].map(status => (
                  <button 
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      statusFilters.includes(status)
                        ? (status === 'cancelled' ? "bg-rose-600 text-white shadow-xl shadow-rose-600/20 scale-105" : "bg-accent-red text-white shadow-xl shadow-accent-red/20 scale-105")
                        : "text-text-dim hover:text-white"
                    )}
                  >
                    {status.replace("-", "_")}
                  </button>
                ))}
             </div>
             <div className="h-10 w-[1px] bg-white/5 mx-2 md:block hidden" />
             <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 px-3">
                   <List size={12} className="text-text-dim" />
                   <select 
                     value={sortOrder}
                     onChange={(e) => setSortOrder(e.target.value as any)}
                     className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
                   >
                     <option value="desc">NEWEST_FIRST</option>
                     <option value="asc">OLDEST_FIRST</option>
                   </select>
                </div>
             </div>
           </div>
             <div className="relative w-full md:w-80 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim transition-colors group-focus-within:text-accent-red" size={16} />
               <input 
                 type="text"
                 placeholder="Search identifier, phone or node..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[12px] font-bold text-white focus:outline-none focus:border-accent-red transition-all shadow-inner placeholder:text-neutral-700 font-mono"
               />
             </div>
           </div>

      <div className="bg-card-bg rounded-[2.5rem] border border-border-subtle overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                <th className="px-6 py-5 w-10 text-center">
                   <input 
                    type="checkbox"
                    className="w-4 h-4 rounded-md border-white/10 bg-black/40 checked:bg-accent-red transition-all cursor-pointer"
                    checked={paginatedBookings.length > 0 && paginatedBookings.every(b => selectedBookings.includes(b.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSelection = [...new Set([...selectedBookings, ...paginatedBookings.map(b => b.id)])];
                        setSelectedBookings(newSelection);
                      } else {
                        setSelectedBookings(selectedBookings.filter(id => !paginatedBookings.map(b => b.id).includes(id)));
                      }
                    }}
                   />
                </th>
                <th className="px-6 py-5 w-10"></th>
                <th className="px-6 py-5">
                  <button 
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="flex items-center gap-2 group/sort"
                  >
                    <span className="text-[10px] font-black text-text-dim uppercase tracking-widest group-hover/sort:text-white transition-colors">Digital Chronology</span>
                    <ArrowDown size={14} className={cn("text-accent-red transition-transform", sortOrder === "asc" && "rotate-180")} />
                  </button>
                </th>
                <th className="px-6 py-5">OPERATOR / CUSTOMER</th>
                <th className="px-6 py-5">SPECIFICATION</th>
                <th className="px-6 py-5">LEVEL</th>
                <th className="px-6 py-5 text-right">PROTOCOL UPDATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedBookings.map((booking) => (
                <React.Fragment key={booking.id}>
                  <tr 
                    className={cn(
                      "hover:bg-white/5 transition-all cursor-pointer group",
                      expandedId === booking.id && "bg-white/5",
                      selectedBookings.includes(booking.id) && "bg-accent-red/5"
                    )}
                    onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                  >
                    <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                       <input 
                        type="checkbox"
                        className="w-4 h-4 rounded-md border-white/10 bg-black/40 checked:bg-accent-red transition-all cursor-pointer"
                        checked={selectedBookings.includes(booking.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBookings([...selectedBookings, booking.id]);
                          else setSelectedBookings(selectedBookings.filter(id => id !== booking.id));
                        }}
                       />
                    </td>
                    <td className="px-6 py-5">
                      <ChevronRight 
                        size={16} 
                        className={cn("transition-transform text-text-dim group-hover:text-white", expandedId === booking.id && "rotate-90 text-accent-red")} 
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="relative">
                        <div className="font-mono text-[11px] text-accent-blue font-black tracking-tight uppercase">#{booking.id.slice(0, 8)}</div>
                        <div className="text-[9px] text-text-dim uppercase font-black tracking-widest mt-1">System Node</div>
                        {booking.status === 'pending' && <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-black text-sm uppercase italic tracking-tight text-white mb-0.5">{booking.fullName}</div>
                      <div className="text-[10px] font-mono text-text-dim">{booking.phone}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase text-white/80">
                         <span className="p-1.5 rounded-lg bg-white/5 border border-white/5"><Wrench size={12} className="text-accent-red" /></span>
                         {booking.serviceType}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <select 
                          value={booking.status}
                          onChange={(e) => handleStatusUpdate(booking.id, e.target.value, booking.email, booking.fullName, booking.carModel, booking.serviceType, booking.appointmentDate, booking.appointmentTime, booking.userId, booking.price)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none border-2 transition-all cursor-pointer",
                            booking.status === "in-progress" && "bg-blue-600/20 text-blue-400 border-blue-600/30 hover:border-blue-500",
                            booking.status === "pending" && "bg-yellow-600/20 text-yellow-500 border-yellow-600/30 hover:border-yellow-500",
                            booking.status === "confirmed" && "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:border-emerald-500",
                            booking.status === "completed" && "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:border-emerald-500",
                            booking.status === "cancelled" && "bg-rose-600/20 text-rose-400 border-rose-600/30 hover:border-rose-500",
                          )}
                        >
                          <option value="pending">PENDING</option>
                          <option value="confirmed">CONFIRMED</option>
                          <option value="in-progress">IN_PROGRESS</option>
                          <option value="completed">COMPLETED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                      </div>
                    </td>
                      <td className="px-6 py-5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        {booking.paymentStatus === 'paid' && (
                          <button 
                            onClick={() => handleRefund(booking)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-600/20 text-rose-400 border border-rose-600/30 hover:bg-rose-600 hover:text-white transition-all mr-2"
                          >
                            Refund
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button 
                            onClick={() => sendReminder(booking)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600 hover:text-white transition-all mr-2"
                          >
                            Remind
                          </button>
                        )}
                        {['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'].map(status => (
                        <button 
                          key={status}
                          onClick={() => handleStatusUpdate(booking.id, status, booking.email, booking.fullName, booking.carModel, booking.serviceType, booking.appointmentDate, booking.appointmentTime, booking.userId, booking.price)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            booking.status === status 
                              ? (status === 'cancelled' ? "bg-rose-600 text-white shadow-xl shadow-rose-600/20 scale-105" : "bg-accent-red text-white shadow-xl shadow-accent-red/20 scale-105")
                              : "bg-white/5 text-text-dim hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {status === 'confirmed' ? "APPROVE" : (status === 'cancelled' ? "REJECT" : status.slice(0, 3))}
                        </button>
                      ))}
                    </td>
                  </tr>
                  
                  {expandedId === booking.id && (
                    <tr className="bg-black/40 shadow-inner">
                      <td colSpan={7} className="px-10 py-10">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="grid lg:grid-cols-3 gap-12"
                        >
                          <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-2">
                               <div className="w-3 h-[1px] bg-accent-red" />
                               Selected Protocol (Cart)
                            </h4>
                            <div className="space-y-3">
                              {booking.cart && Array.isArray(booking.cart) ? (
                                booking.cart.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-xl">
                                    <div className="text-[10px] font-black text-white uppercase italic">{item.title}</div>
                                    <div className="text-accent-red font-bold text-xs">₹{item.price}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] font-bold text-text-dim uppercase tracking-widest bg-white/5 border border-white/5 p-4 rounded-xl text-center">
                                  {booking.serviceType} - ₹{booking.price}
                                </div>
                              )}
                              <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/20 rounded-xl mt-4">
                                <div className="text-[9px] font-black text-primary uppercase tracking-widest">Total Transaction Value</div>
                                <div className="text-primary font-black text-sm italic">₹{booking.price}</div>
                              </div>
                            </div>
                            
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-2 pt-4">
                               <div className="w-3 h-[1px] bg-accent-red" />
                               Identity Data
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest mb-2">Communications</label>
                                <div className="font-bold text-xs">{booking.phone}</div>
                              </div>
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                                <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest mb-2">Data Anchor</label>
                                <div className="font-bold text-xs truncate italic text-accent-blue">{booking.email || "LOG_NA"}</div>
                              </div>
                              <div className="col-span-2 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest mb-2">Full Address Registry</label>
                                <textarea 
                                  id={`address-${booking.id}`}
                                  defaultValue={booking.address}
                                  className="w-full bg-transparent border-none outline-none font-bold text-xs resize-none"
                                  rows={2}
                                />
                                <input 
                                  id={`city-${booking.id}`}
                                  defaultValue={booking.city}
                                  className="w-full bg-transparent border-none outline-none font-black text-[9px] uppercase tracking-widest text-primary mt-2"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-2">
                               <div className="w-3 h-[1px] bg-accent-red" />
                               Hardware Specs
                            </h4>
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest ml-1">Vehicle Node</label>
                                <input 
                                  type="text"
                                  defaultValue={booking.carModel}
                                  placeholder="e.g. Maruti Swift"
                                  className="w-full text-xs font-black p-3.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-red transition-all"
                                  id={`carModel-${booking.id}`}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest ml-1">Energy (Fuel)</label>
                                  <input 
                                    type="text"
                                    defaultValue={booking.carDetails?.fuel}
                                    placeholder="Petrol"
                                    className="w-full text-xs font-black p-3.5 bg-black/40 border border-white/10 rounded-xl outline-none"
                                    id={`fuel-${booking.id}`}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest ml-1">Reg. Year</label>
                                  <input 
                                    type="text"
                                    defaultValue={booking.carDetails?.year}
                                    placeholder="2022"
                                    className="w-full text-xs font-black p-3.5 bg-black/40 border border-white/10 rounded-xl outline-none"
                                    id={`year-${booking.id}`}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest ml-1">License Plate</label>
                                <input 
                                  type="text"
                                  defaultValue={booking.carDetails?.plate}
                                  placeholder="MH01..."
                                  className="w-full text-xs font-black p-3.5 bg-black/40 border border-white/10 rounded-xl outline-none uppercase tracking-widest"
                                  id={`plate-${booking.id}`}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] text-text-dim block uppercase font-black tracking-widest ml-1">Assigned Support</label>
                                <div className="relative group/mech">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within/mech:text-accent-red">
                                    <Search size={14} />
                                  </div>
                                  <input 
                                    type="text"
                                    placeholder="Search mechanics..."
                                    className="w-full text-xs font-black pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-red transition-all uppercase"
                                    id={`mechanicSearch-${booking.id}`}
                                    defaultValue={mechanics.find(m => m.id === booking.mechanicId)?.name || ""}
                                    onFocus={(e) => {
                                      const list = document.getElementById(`mechanicList-${booking.id}`);
                                      if (list) list.classList.remove('hidden');
                                    }}
                                    onChange={(e) => {
                                      const val = e.target.value.toLowerCase();
                                      const items = document.querySelectorAll(`.mechanic-item-${booking.id}`);
                                      items.forEach((item: any) => {
                                        const name = item.getAttribute('data-name').toLowerCase();
                                        if (name.includes(val)) item.classList.remove('hidden');
                                        else item.classList.add('hidden');
                                      });
                                    }}
                                  />
                                  <div 
                                    id={`mechanicList-${booking.id}`}
                                    className="absolute left-0 right-0 top-full mt-2 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto hidden custom-scrollbar p-2"
                                  >
                                    <button 
                                      className="w-full text-left p-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase text-text-dim transition-colors"
                                      onClick={() => {
                                        const input = document.getElementById(`mechanicSearch-${booking.id}`) as HTMLInputElement;
                                        if (input) input.value = "Unassigned";
                                        const select = document.getElementById(`mechanicId-${booking.id}`) as HTMLSelectElement;
                                        if (select) select.value = "";
                                        document.getElementById(`mechanicList-${booking.id}`)?.classList.add('hidden');
                                      }}
                                    >
                                      Unassigned
                                    </button>
                                    {mechanics.map(m => (
                                      <button 
                                        key={m.id}
                                        data-name={m.name}
                                        className={`mechanic-item-${booking.id} w-full text-left p-3 hover:bg-accent-red/10 hover:text-white rounded-xl text-[10px] font-black uppercase text-neutral-400 transition-all flex items-center gap-3`}
                                        onClick={() => {
                                          const input = document.getElementById(`mechanicSearch-${booking.id}`) as HTMLInputElement;
                                          if (input) input.value = m.name;
                                          const select = document.getElementById(`mechanicId-${booking.id}`) as HTMLSelectElement;
                                          if (select) select.value = m.id;
                                          document.getElementById(`mechanicList-${booking.id}`)?.classList.add('hidden');
                                        }}
                                      >
                                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                                          <img src={m.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt="" />
                                        </div>
                                        {m.name}
                                        <span className="ml-auto text-[8px] opacity-40">{m.expertise}</span>
                                      </button>
                                    ))}
                                  </div>
                                  {/* Hidden select for compatibility with existing save logic */}
                                  <select 
                                    className="hidden"
                                    id={`mechanicId-${booking.id}`}
                                    defaultValue={booking.mechanicId || ""}
                                  >
                                    <option value="">Unassigned</option>
                                    {mechanics.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-2 text-rose-500">
                               <div className="w-3 h-[1px] bg-rose-500" />
                               Mission Critical Notes
                            </h4>
                            <div className="space-y-4">
                              <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 italic text-[11px] text-neutral-400">
                                <span className="text-[9px] font-black uppercase text-rose-500 block mb-2 tracking-widest">Customer Direct Message:</span>
                                "{booking.message || "No contextual data provided."}"
                              </div>
                              <textarea
                                rows={2}
                                className="w-full text-xs p-4 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-red transition-all font-mono"
                                placeholder="Add internal intelligence..."
                                defaultValue={booking.adminNotes || booking.notes}
                                onBlur={(e) => setNotes({ ...notes, [booking.id]: e.target.value })}
                              />
                              <button 
                                  onClick={() => {
                                   const carModel = (document.getElementById(`carModel-${booking.id}`) as HTMLInputElement)?.value;
                                   const fuel = (document.getElementById(`fuel-${booking.id}`) as HTMLInputElement)?.value;
                                   const year = (document.getElementById(`year-${booking.id}`) as HTMLInputElement)?.value;
                                   const plate = (document.getElementById(`plate-${booking.id}`) as HTMLInputElement)?.value;
                                   const serviceType = (document.getElementById(`serviceType-${booking.id}`) as HTMLSelectElement)?.value;
                                   const mechanicId = (document.getElementById(`mechanicId-${booking.id}`) as HTMLSelectElement)?.value;
                                   const address = (document.getElementById(`address-${booking.id}`) as HTMLTextAreaElement)?.value;
                                   const city = (document.getElementById(`city-${booking.id}`) as HTMLInputElement)?.value;
                                   const mechanicName = mechanics.find(m => m.id === mechanicId)?.name || "";
                                   
                                   const carDetails = { ...booking.carDetails, fuel, year, plate };
                                   handleSaveNotes(booking.id, { carModel, carDetails, serviceType, mechanicId, mechanicName, address, city });
                                 }}
                                className="w-full bg-accent-red text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-500/10"
                              >
                                <Save size={14} />
                                Synchronize Data
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center gap-4">
                       <Calendar size={64} className="text-neutral-800" strokeWidth={1} />
                       <div className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">No Registry Entries Found</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-black/20 px-10 py-6 border-t border-white/5 flex items-center justify-between">
            <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/5 border border-white/5 text-text-dim hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                      currentPage === i + 1 ? "bg-accent-red text-white" : "bg-white/5 text-text-dim hover:bg-white/10"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white/5 border border-white/5 text-text-dim hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedBookings.length > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 border border-accent-red/30 p-4 rounded-3xl shadow-2xl shadow-accent-red/20 flex items-center gap-6 backdrop-blur-xl"
        >
           <div className="flex items-center gap-4 px-4 border-r border-white/5">
              <div className="w-10 h-10 rounded-xl bg-accent-red flex items-center justify-center text-white font-black italic">
                 {selectedBookings.length}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-text-dim">Missions Selection Active</div>
           </div>
           
           <div className="flex gap-2">
              <button 
                onClick={() => handleBulkAction('confirmed')}
                className="px-6 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-600/10"
              >
                Accept Selection
              </button>
              <button 
                onClick={() => handleBulkAction('completed')}
                className="px-6 py-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/30 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-600/10"
              >
                Complete Mission
              </button>
              <button 
                onClick={() => handleBulkAction('remind')}
                className="px-6 py-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-600/10"
              >
                Tactical Reminder
              </button>
              <button 
                onClick={() => setSelectedBookings([])}
                className="p-3 rounded-xl bg-white/5 text-text-dim hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
              >
                <X size={18} />
              </button>
           </div>
        </motion.div>
      )}
    </div>
  );
}

function ServicesTab({ carData }: { carData: Record<string, { logo: string, models: { name: string, logo: string, fuelTypes?: string[] }[] }> }) {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(["Periodic", "Engine", "AC", "Battery", "Brake", "Clutch", "Tyre", "Detailing", "Denting", "Maintenance", "Repair", "Electrical", "Bodywork", "Diagnostics"]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pricingExpanded, setPricingExpanded] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [researching, setResearching] = useState(false);
  const [previewCar, setPreviewCar] = useState({ make: "", model: "", fuel: "Petrol", engine: "All" });
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const [newService, setNewService] = useState({ 
    title: "", 
    excerpt: "",
    description: "", 
    price: 0, 
    isActive: true,
    category: "Maintenance",
    icon: "Wrench",
    duration: "",
    requiredParts: [] as string[],
    notes: "",
    imageUrl: "",
    features: [] as string[],
    variants: [] as { make: string, model: string, fuel: string, engine?: string, price: number, description?: string }[],
    reviews: [] as any[]
  });
  const [generatingAI, setGeneratingAI] = useState(false);

  const availableIcons = Object.keys(ICON_MAP);

  useEffect(() => {
    // Only subscribe to services if we have a user (though services are public read, 
    // it's cleaner to wait for auth state to stabilize in the dashboard context)
    const q = query(collection(db, "services"), orderBy("category"));
    const unsub = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Services Firestore Error:", err);
      // Even if it fails (not admin), we stop loading
      setLoading(false);
    });

    const unsubCats = onSnapshot(doc(db, "config", "services"), (snap) => {
      if (snap.exists() && snap.data().categories) {
        setCategories(snap.data().categories);
      }
    });

    return () => {
      unsub();
      unsubCats();
    };
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory) return;
    const updated = Array.from(new Set([...categories, newCategory]));
    await setDoc(doc(db, "config", "services"), { categories: updated }, { merge: true });
    setNewCategory("");
    toast.success(`Category "${newCategory}" assimilated.`);
  };

  const removeCategory = async (cat: string) => {
    const updated = categories.filter(c => c !== cat);
    await setDoc(doc(db, "config", "services"), { categories: updated }, { merge: true });
    toast.info(`Category "${cat}" purged.`);
  };

  if (loading) return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20">
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-[400px] rounded-[2.5rem]" />)}
      </div>
    </div>
  );

  const startEdit = (service: any) => {
    setEditingId(service.id);
    setNewService({
      title: service.title || "",
      excerpt: service.excerpt || "",
      description: service.description || "",
      price: service.price || 0,
      isActive: service.isActive ?? true,
      category: service.category || "Maintenance",
      icon: service.icon || "Wrench",
      duration: service.duration || "",
      requiredParts: service.requiredParts || [],
      notes: service.notes || "",
      imageUrl: service.imageUrl || "",
      features: service.features || [],
      variants: service.variants || [],
      reviews: service.reviews || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = { 
        ...newService, 
        price: Number(newService.price),
        features: newService.features.filter(f => f.trim() !== ""),
        requiredParts: newService.requiredParts.filter(p => p.trim() !== ""),
        variants: newService.variants.map(v => ({ 
          ...v, 
          price: (v.price && v.price > 0) ? Number(v.price) : Number(newService.price) 
        })),
        updatedAt: serverTimestamp()
      };
      
      if (editingId) {
        await updateDoc(doc(db, "services", editingId), serviceData);
        setEditingId(null);
        toast.success("Service configuration successfully updated.");
      } else {
        await addDoc(collection(db, "services"), {
          ...serviceData,
          createdAt: serverTimestamp()
        });
        toast.success("New service initialized.");
      }
      
      setNewService({ 
        title: "", excerpt: "", description: "", price: 0, isActive: true, 
        category: "Maintenance", icon: "Wrench", notes: "", imageUrl: "", 
        features: [], variants: [], reviews: [], duration: "", requiredParts: []
      });
    } catch (err) {
      console.error(err);
      toast.error("Relational update failed. Check console for logs.");
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "services", id), { isActive: !current });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "services", id));
      toast.success("Service deleted successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Error deleting service.");
    }
  };

  const handleGenerateAIContent = async (target: 'description' | 'features' | 'all' = 'all') => {
    if (!newService.title || !newService.category) {
      toast.warning("Title and Category are required for content generation.");
      return;
    }
    setGeneratingAI(true);
    try {
      const response = await fetch("/api/admin/generate-service-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: newService.title, 
          category: newService.category,
          target 
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setNewService(prev => ({
        ...prev,
        description: (target === 'all' || target === 'description') ? (data.description || prev.description) : prev.description,
        features: (target === 'all' || target === 'features') ? (data.features && data.features.length > 0 ? data.features : prev.features) : prev.features
      }));
      toast.success(`AI content generated for ${target === 'all' ? 'Description & Features' : target}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "AI generation failed.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const filteredServices = services.filter(s => {
    const categoryMatch = filterCategories.length === 0 || filterCategories.includes(s.category);
    const statusMatch = filterStatuses.length === 0 || filterStatuses.includes(s.isActive ? "Active" : "Inactive");
    const searchMatch = robustSearch(s, searchQuery, ["title", "excerpt", "description", "id", "category", "features", "variants.make", "variants.model"]);
    const price = s.price || 0;
    const priceMatch = price >= priceRange.min && price <= priceRange.max;
    return categoryMatch && statusMatch && searchMatch && priceMatch;
  });

  const getDynamicVariant = (service: any) => {
    if (!previewCar.make || !previewCar.model || !previewCar.fuel) return null;
    
    const variants = service.variants || [];
    const lowerMake = previewCar.make.toLowerCase();
    const lowerModel = previewCar.model.toLowerCase();
    const lowerFuel = previewCar.fuel.toLowerCase();
    const lowerEngine = (previewCar.engine || "all").toLowerCase();

    // Strategy: Return the most specific match first
    return variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === lowerFuel &&
      (v.engine || "all").toLowerCase() === lowerEngine
    ) || 
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === lowerFuel &&
      (v.engine || "all").toLowerCase() === "all"
    ) || 
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === lowerModel && 
      v.fuel.toLowerCase() === "all" &&
      (v.engine || "all").toLowerCase() === "all"
    ) ||
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === lowerFuel &&
      (v.engine || "all").toLowerCase() === "all"
    ) ||
    variants.find((v: any) => 
      v.make.toLowerCase() === lowerMake && 
      v.model.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === "all" &&
      (v.engine || "all").toLowerCase() === "all"
    ) ||
    variants.find((v: any) => 
      v.make.toLowerCase() === "all" && 
      v.fuel.toLowerCase() === lowerFuel &&
      (v.engine || "all").toLowerCase() === "all"
    );
  };

  const handleResearchService = async (serviceTitle?: string, existingId?: string) => {
    const title = serviceTitle || newService.title;
    if (!title) {
       toast.warning("Title required for diagnostic research.");
       return;
    }
    setResearching(true);
    try {
      const response = await fetch("/api/admin/research-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      if (existingId) {
        await updateDoc(doc(db, "services", existingId), {
           excerpt: data.excerpt,
           description: data.description,
           features: data.features,
           notes: data.notes,
           updatedAt: serverTimestamp()
        });
        toast.success("Intelligence successfully fetched via Grounded Search.");
      } else {
        setNewService(prev => ({
          ...prev,
          excerpt: data.excerpt || prev.excerpt,
          description: data.description || prev.description,
          features: Array.isArray(data.features) ? data.features : prev.features,
          notes: data.notes || prev.notes,
          duration: data.duration || prev.duration,
          requiredParts: Array.isArray(data.requiredParts) ? data.requiredParts : prev.requiredParts
        }));
        toast.success("Service specs populated via Google Search Grounding.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Cloud synchronization failed. Please check network.");
    } finally {
      setResearching(false);
    }
  };

  const handleUpdateReviewStatus = async (serviceId: string, reviewId: string, status: "approved" | "rejected") => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;
      
      const updatedReviews = (service.reviews || []).map((r: any) => 
        r.id === reviewId ? { ...r, status } : r
      );
      
      await updateDoc(doc(db, "services", serviceId), { reviews: updatedReviews });
      toast.success(`Review ${status === 'approved' ? 'cleared for public' : 'suppressed'}.`);
    } catch (err) {
      console.error(err);
      toast.error("Review state update failed.");
    }
  };

  const handleRemoveReview = async (serviceId: string, reviewId: string) => {
    if (!window.confirm("Purge this feedback from registry?")) return;
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;
      
      const updatedReviews = (service.reviews || []).filter((r: any) => r.id !== reviewId);
      
      await updateDoc(doc(db, "services", serviceId), { reviews: updatedReviews });
      toast.success("Feedback purged successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Relational deletion failed.");
    }
  };

  const updateFeatureSnapshot = (index: number, val: string) => {
    const updated = [...newService.features];
    updated[index] = val;
    setNewService({ ...newService, features: updated });
  };

  const removeFeature = (index: number) => {
    const updated = newService.features.filter((_, i) => i !== index);
    setNewService({ ...newService, features: updated });
  };

  const addFeature = () => {
    setNewService({ ...newService, features: [...newService.features, ""] });
  };

  const seedRequiredServices = async () => {
    try {
      const ppi = {
        title: "Pre-Purchase Inspection",
        description: "A comprehensive bumper-to-bumper inspection designed to give you peace of mind before buying a used vehicle. Our expert mechanics perform a rigorous assessment of the mechanical, electrical, and structural integrity of the car.",
        price: 2499,
        category: "Shield",
        icon: "ShieldCheck",
        isActive: true,
        features: [
          "Comprehensive Vehicle History Check",
          "Engine Health Diagnosis",
          "Electrical System Scan",
          "Bodywork & Paint Inspection",
          "Road Test Evaluation"
        ],
        excerpt: "Expert evaluation before you buy.",
        variants: [
          { make: "Toyota", model: "Fortuner", fuel: "Diesel", price: 3499, description: "SUV Grade Inspection" },
          { make: "Toyota", model: "Innova Crysta", fuel: "Diesel", price: 3299, description: "Premium MPV Inspection" },
          { make: "MG Motor", model: "Hector", fuel: "Diesel", price: 2999, description: "SUV Tech Scan" },
          { make: "Maruti", model: "Swift", fuel: "all", price: 1999, description: "Economy Hatch Inspection" },
          { make: "Audi", model: "all", fuel: "all", price: 4999, description: "Luxury Segment Protocol" },
          { make: "BMW", model: "all", fuel: "all", price: 4999, description: "Performance Segment Protocol" }
        ]
      };

      const wheelAlignment = {
        title: "Wheel Alignment and Balancing",
        description: "Precision laser alignment and digital balancing to ensure smooth handling, even tyre wear, and improved fuel efficiency. Essential for high-speed stability and safety.",
        price: 999,
        category: "Tyre",
        icon: "Gauge",
        isActive: true,
        features: [
          "Laser-guided wheel alignment",
          "Digital dynamic balancing",
          "Tyre pressure check & nitrogen inflation",
          "Suspension health overview",
          "Tyre rotation advisory"
        ],
        excerpt: "Drive straight. Drive safe.",
        imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800",
        variants: []
      };

      const querySnapshot = await getDocs(collection(db, "services"));
      const existing = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
         
      // Add Wheel Alignment if missing
      if (!existing.find((s: any) => s.title === wheelAlignment.title)) {
        await addDoc(collection(db, "services"), wheelAlignment);
      }

      // Update Standard Periodic Service if it exists
      const sps = existing.find((s: any) => s.title.toLowerCase().includes("standard periodic service"));
      if (sps) {
        const variants = sps.variants || [];
        if (!variants.find((v: any) => v.make === "Maruti" && v.model === "Swift" && v.fuel === "Diesel")) {
          const updatedVariants = [...variants, { 
            make: "Maruti", 
            model: "Swift", 
            fuel: "Diesel", 
            price: 3800, 
            description: "Optimized for diesel variants" 
          }];
          await updateDoc(doc(db, "services", sps.id), { variants: updatedVariants });
        }
      }

      // Add PPI if missing
      if (!existing.find((s: any) => s.title === ppi.title)) {
        await addDoc(collection(db, "services"), ppi);
      }

      toast.success("Data synchronization protocols complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync required services.");
    }
  };

  const addVariant = () => {
    setNewService({ 
      ...newService, 
      variants: [...newService.variants, { make: "", model: "", fuel: "Petrol", engine: "All", price: newService.price, description: "" }] 
    });
    setPricingExpanded(true);
  };

  const removeVariant = (index: number) => {
    const updated = newService.variants.filter((_, i) => i !== index);
    setNewService({ ...newService, variants: updated });
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setNewService(prev => {
      const updatedVariants = [...prev.variants];
      updatedVariants[index] = { ...updatedVariants[index], [field]: value };
      return { ...prev, variants: updatedVariants };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800KB for Firestore safety
        toast.warning("Image too large. Please keep it under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewService({ ...newService, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-10 max-w-[1600px] mx-auto">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package size={120} strokeWidth={1} />
          </div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent-red border border-white/5 shadow-inner">
                <Package size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic leading-none mb-1 text-white">Service Manifest</h2>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Global inventory & logistics management</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const task = {
                          title: "Service Update Required",
                          description: "Audit and update core service list for seasonal campaign.",
                          status: "todo",
                          priority: "high",
                          createdAt: serverTimestamp()
                        };
                        addDoc(collection(db, "tasks"), task).then(() => toast.success("Admin task created!"));
                      }}
                      className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                    >
                      + SERVICE_TASK
                    </button>
                    <button 
                      onClick={seedRequiredServices}
                      className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                    >
                      Sync Core Services
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/20 p-8 rounded-3xl border border-white/5 space-y-6">
                <div>
                   <h4 className="text-xs font-black text-white uppercase tracking-widest">Category Ecosystem</h4>
                   <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.2em] mt-1">Manage dynamic service classification tags</p>
                </div>
                <div className="flex flex-wrap gap-2">
                   {categories.map(cat => (
                      <div key={cat} className="group/cat flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-xl hover:border-primary/50 transition-all">
                         <span className="text-[10px] font-black text-white uppercase italic">{cat}</span>
                         <button onClick={() => removeCategory(cat)} className="text-rose-500 opacity-0 group-hover/cat:opacity-100 hover:scale-125 transition-all">
                            <X size={12} />
                         </button>
                      </div>
                   ))}
                   <div className="flex items-center gap-2 bg-white/5 px-2 rounded-xl border border-dashed border-white/10 focus-within:border-primary transition-all">
                      <input 
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="NEW CAT..."
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white px-3 py-1.5 outline-none w-24"
                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                      />
                      <button onClick={handleAddCategory} className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                         <Plus size={14} />
                      </button>
                   </div>
                </div>
             </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden xl:flex items-center gap-2 bg-black/40 border border-white/5 p-1 rounded-xl">
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <Car size={14} className="text-text-dim" />
                  <span className="text-[9px] font-black uppercase text-text-dim">Preview:</span>
                </div>
                <select 
                  value={previewCar.make}
                  onChange={(e) => {
                    const make = e.target.value;
                    const defaultModel = (carData as any)[make]?.models?.[0]?.name || "";
                    setPreviewCar({ ...previewCar, make, model: defaultModel });
                  }}
                  className="bg-transparent text-[10px] font-black text-white hover:text-accent-red transition-colors outline-none cursor-pointer uppercase py-1 border-r border-white/5 pr-2"
                >
                  <option value="">SELECT MAKE</option>
                  {Object.keys(carData).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  value={previewCar.model}
                  onChange={(e) => setPreviewCar({ ...previewCar, model: e.target.value })}
                  className="bg-transparent text-[10px] font-black text-white hover:text-accent-red transition-colors outline-none cursor-pointer uppercase py-1 border-r border-white/5 px-2"
                  disabled={!previewCar.make}
                >
                  <option value="">MODEL</option>
                  {(carData as any)[previewCar.make]?.models?.map((mod: any) => <option key={mod.name} value={mod.name}>{mod.name}</option>)}
                </select>
                <select 
                  value={previewCar.fuel}
                  onChange={(e) => setPreviewCar({ ...previewCar, fuel: e.target.value })}
                  className="bg-transparent text-[10px] font-black text-white hover:text-accent-red transition-colors outline-none cursor-pointer uppercase py-1 border-r border-white/5 px-2"
                >
                  {["Petrol", "Diesel", "CNG", "Electric"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input 
                  type="text"
                  value={previewCar.engine}
                  onChange={(e) => setPreviewCar({ ...previewCar, engine: e.target.value })}
                  placeholder="ENGINE..."
                  className="bg-transparent text-[10px] font-black text-white hover:text-accent-red transition-colors outline-none cursor-pointer uppercase py-1 px-2 w-20"
                />
                <button 
                  onClick={() => setPreviewCar({ make: "", model: "", fuel: "Petrol", engine: "All" })}
                  className="px-2 text-text-dim hover:text-rose-500 transition-colors"
                  title="Reset Preview"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="relative w-64 group/search">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim transition-colors group-focus-within/search:text-accent-red" size={14} />
                <input 
                  type="text"
                  placeholder="Catalog search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-[11px] font-bold text-white focus:outline-none focus:border-accent-red transition-all shadow-inner placeholder:text-neutral-700 font-mono"
                />
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-1 rounded-xl">
                 <input 
                   type="number" 
                   placeholder="MIN ₹" 
                   onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) || 0 }))}
                   className="w-20 bg-transparent text-[10px] font-black text-white px-2 py-1 outline-none text-right"
                 />
                 <span className="text-text-dim">-</span>
                 <input 
                   type="number" 
                   placeholder="MAX ₹" 
                   onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) || 100000 }))}
                   className="w-20 bg-transparent text-[10px] font-black text-white px-2 py-1 outline-none text-right"
                 />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                  (filterCategories.length > 0 || filterStatuses.length > 0) 
                    ? "bg-accent-red text-white border-accent-red shadow-accent-red/20" 
                    : "bg-white/5 border-white/5 text-text-dim hover:text-white hover:bg-white/10"
                )}
              >
                <Filter size={14} />
                Filter { (filterCategories.length + filterStatuses.length) > 0 && `(${(filterCategories.length + filterStatuses.length)})`}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-8 pt-8 border-t border-white/5 grid md:grid-cols-2 gap-10"
              >
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-red mb-4 flex items-center gap-2">
                    <Layout size={12} /> Hardware Categories
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {categories.map(cat => (
                      <label key={cat} className="flex items-center gap-3 group cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filterCategories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) setFilterCategories([...filterCategories, cat]);
                            else setFilterCategories(filterCategories.filter(c => c !== cat));
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-accent-red focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-text-dim group-hover:text-white transition-colors uppercase tracking-tight">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-red mb-4 flex items-center gap-2">
                    <Activity size={12} /> Status Levels
                  </h4>
                  <div className="flex gap-6">
                    {["Active", "Inactive"].map(status => (
                      <label key={status} className="flex items-center gap-3 group cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filterStatuses.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) setFilterStatuses([...filterStatuses, status]);
                            else setFilterStatuses(filterStatuses.filter(s => s !== status));
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-accent-red focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-text-dim group-hover:text-white transition-colors uppercase tracking-tight">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-card-bg rounded-[2.5rem] border border-border-subtle overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-text-dim">SERVICE SPECIFICATION</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-text-dim text-right">PRICING</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-text-dim text-center">STATUS</th>
                <th className="px-8 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-text-dim text-right">OPERATIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredServices.map((s) => {
                const variantMatch = getDynamicVariant(s);
                return (
                  <React.Fragment key={s.id}>
                    <tr 
                      className={cn(
                        "hover:bg-white/5 transition-all group cursor-pointer",
                        expandedServiceId === s.id && "bg-white/5 border-l-2 border-accent-red"
                      )}
                      onClick={() => setExpandedServiceId(expandedServiceId === s.id ? null : s.id)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-5">
                          <ChevronRight 
                            size={16} 
                            className={cn("text-text-dim transition-transform", expandedServiceId === s.id && "rotate-90 text-accent-red")} 
                          />
                          <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 overflow-hidden flex-shrink-0 shadow-lg transition-transform group-hover:scale-105 group-hover:rotate-1">
                            {s.imageUrl ? (
                              <img src={s.imageUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-800">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-black text-white group-hover:text-accent-red transition-colors flex items-center gap-3 uppercase italic">
                              {s.title}
                              {s.icon && ICON_MAP[s.icon] && React.createElement(ICON_MAP[s.icon], { size: 14, className: "text-accent-red/40" })}
                              {s.reviews?.some((r: any) => r.status === 'pending') && (
                                <span className="flex h-2 w-2 rounded-full bg-accent-red animate-ping" title="Pending Reviews" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim bg-white/5 px-2 py-0.5 rounded border border-white/5">{s.category}</span>
                               <span className="text-[9px] font-mono text-neutral-600">ID: {s.id.slice(0, 6).toUpperCase()}</span>
                               {s.variants && s.variants.length > 0 && (
                                 <span className="text-[9px] font-black uppercase text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                                   {s.variants.length} Variants
                                 </span>
                               )}
                            </div>
                            {variantMatch && variantMatch.description && (
                              <div className="mt-3 p-3 bg-accent-blue/5 border-l border-accent-blue/30 text-[10px] text-neutral-400 italic leading-snug max-w-md">
                                <span className="text-accent-blue font-black not-italic mr-2">VARIANT NOTE:</span>
                                {variantMatch.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="text-lg font-black text-white italic tracking-tighter">
                          ₹{variantMatch ? variantMatch.price : s.price}
                        </div>
                        <div className="text-[9px] text-text-dim font-black uppercase tracking-widest mt-0.5">
                          {variantMatch ? "Variant Match" : "Base Level"}
                        </div>
                        {variantMatch && (
                          <div className="text-[8px] text-emerald-500 font-black uppercase tracking-tight mt-1 animate-pulse">
                            {previewCar.make} {previewCar.model}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(s.id, s.isActive); }}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.25em] transition-all shadow-xl border",
                            s.isActive 
                              ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30" 
                              : "bg-rose-600/20 text-rose-400 border-rose-600/30 hover:bg-rose-600/30"
                          )}
                        >
                          {s.isActive ? "LIVE" : "OFFLINE"}
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleResearchService(s.title, s.id)}
                    disabled={researching}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 text-text-dim hover:text-cyan-400 hover:border-cyan-400 hover:bg-cyan-400/5 shadow-lg transition-all"
                    title="Search Parts & Diagnostics"
                  >
                    {researching ? <Loader2 size={16} className="animate-spin" /> : <SearchCode size={16} />}
                  </button>
                          <button 
                            onClick={() => startEdit(s)}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-text-dim hover:text-accent-red hover:border-accent-red hover:bg-accent-red/5 shadow-lg transition-all"
                            title="Edit Configuration"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteService(s.id, s.title)}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-text-dim hover:text-rose-500 hover:border-rose-500 hover:bg-rose-500/5 shadow-lg transition-all"
                            title="Decommission Service"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedServiceId === s.id && (
                        <tr>
                          <td colSpan={4} className="px-12 py-10 bg-black/40 border-b border-white/5 shadow-inner">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="grid md:grid-cols-3 gap-10 overflow-hidden"
                            >
                              {/* Features List */}
                              <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                   <h4 className="text-[10px] font-black text-accent-red uppercase tracking-[0.3em] flex items-center gap-3">
                                     <List size={14} /> Operational Protocol
                                   </h4>
                                   <div className="text-[9px] font-black text-text-dim uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                      {s.duration || "EST_NA"} Duration
                                   </div>
                                </div>
                                {s.features && s.features.length > 0 ? (
                                  <ul className="space-y-3">
                                    {s.features.map((f: string, i: number) => (
                                      <li key={i} className="flex gap-3 items-start group/li">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-red/40 mt-1.5 shrink-0 group-hover/li:bg-accent-red transition-colors" />
                                        <span className="text-[11px] font-bold text-neutral-400 group-hover/li:text-neutral-200 transition-colors uppercase tracking-tight">{f}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-[10px] text-neutral-700 italic border border-white/5 p-4 rounded-xl border-dashed">
                                    No features defined for this node.
                                  </div>
                                )}
                                {s.requiredParts && s.requiredParts.length > 0 && (
                                   <div className="pt-6 border-t border-white/5">
                                      <h5 className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-3">Required Artifacts/Parts</h5>
                                      <div className="flex flex-wrap gap-2">
                                         {s.requiredParts.map((p: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[9px] font-black text-white/50 uppercase italic tracking-tighter">
                                               {p}
                                            </span>
                                         ))}
                                      </div>
                                   </div>
                                )}
                              </div>

                              {/* Variants Grid */}
                              <div className="space-y-6 overflow-hidden">
                                <h4 className="text-[10px] font-black text-accent-blue uppercase tracking-[0.3em] flex items-center gap-3">
                                  <Database size={14} /> Price Variation Mesh
                                </h4>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                  {s.variants && s.variants.length > 0 ? (
                                    s.variants.map((v: any, i: number) => (
                                      <div 
                                        key={i} 
                                        className={cn(
                                          "p-4 rounded-2xl border transition-all",
                                          variantMatch === v ? "bg-accent-blue/10 border-accent-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "bg-white/5 border-white/5"
                                        )}
                                      >
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-[10px] font-black text-white uppercase italic">{v.make} {v.model}</span>
                                          <span className="text-xs font-black text-accent-blue italic">₹{v.price}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="px-1.5 py-0.5 rounded bg-black/40 text-[8px] font-black text-neutral-500 border border-white/5 uppercase tracking-widest">{v.fuel}</div>
                                          {variantMatch === v && <div className="text-[8px] font-black text-accent-blue uppercase animate-pulse">Active Match</div>}
                                        </div>
                                        {v.description && (
                                          <p className="text-[9px] text-neutral-600 italic leading-relaxed border-t border-white/5 pt-2 mt-2">{v.description}</p>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[10px] text-neutral-700 italic border border-white/5 p-4 rounded-xl border-dashed">
                                      No variant overlays detected.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Internal Notes */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                  <Info size={14} /> Intelligence Log
                                </h4>
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] h-full shadow-inner relative group">
                                  <div className="text-[11px] font-medium text-neutral-400 leading-relaxed font-mono whitespace-pre-wrap">
                                    {s.notes || "STATIC_SYSTEM_LOG: No internal metadata currently recorded for this service specification."}
                                  </div>
                                  <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                                    <Shield size={32} />
                                  </div>
                                </div>
                              </div>
                              {/* Customer Feedback Mesh */}
                              <div className="md:col-span-3 space-y-8 pt-10 border-t border-white/5">
                                 <div className="flex justify-between items-center px-2">
                                    <div>
                                       <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                          <Quote size={14} /> Customer Feedback Mesh
                                       </h4>
                                       <p className="text-[9px] text-text-dim uppercase tracking-widest mt-1">Review validation and moderation terminal</p>
                                    </div>
                                    <div className="flex gap-4">
                                       <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                          <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                             {(s.reviews || []).filter((r: any) => r.status === 'approved').length} Active
                                          </span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-accent-red" />
                                          <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                             {(s.reviews || []).filter((r: any) => r.status === 'pending').length} Pending
                                          </span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {s.reviews && s.reviews.length > 0 ? (
                                       s.reviews.map((r: any) => (
                                          <div 
                                             key={r.id} 
                                             className={cn(
                                                "p-6 rounded-[2rem] border transition-all relative group/review",
                                                r.status === 'approved' ? "bg-white/5 border-white/5" : "bg-amber-500/5 border-amber-500/20"
                                             )}
                                          >
                                             <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                   <div className="w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center text-[10px] font-black text-white uppercase italic">
                                                      {r.userName?.charAt(0) || "U"}
                                                   </div>
                                                   <div>
                                                      <div className="text-[11px] font-black text-white uppercase tracking-tight">{r.userName}</div>
                                                      <div className="flex gap-0.5 mt-0.5">
                                                         {[1,2,3,4,5].map(star => (
                                                            <Star 
                                                               key={star} 
                                                               size={8} 
                                                               className={cn(star <= r.rating ? "text-amber-500 fill-amber-500" : "text-neutral-700")} 
                                                            />
                                                         ))}
                                                      </div>
                                                   </div>
                                                </div>
                                                <div className={cn(
                                                   "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                                   r.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                )}>
                                                   {r.status || "PENDING"}
                                                </div>
                                             </div>
                                             <p className="text-[11px] text-neutral-400 italic leading-relaxed mb-6 font-medium">"{r.comment}"</p>
                                             
                                             <div className="flex gap-2 opacity-0 group-hover/review:opacity-100 transition-opacity">
                                                {r.status !== 'approved' && (
                                                   <button 
                                                      onClick={(e) => { e.stopPropagation(); handleUpdateReviewStatus(s.id, r.id, 'approved'); }}
                                                      className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                                                   >
                                                      Approve
                                                   </button>
                                                )}
                                                <button 
                                                   onClick={(e) => { e.stopPropagation(); handleRemoveReview(s.id, r.id); }}
                                                   className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                   Remove
                                                </button>
                                             </div>
                                             
                                             <div className="absolute bottom-4 right-6 text-[8px] font-mono text-neutral-600 uppercase tracking-tighter">
                                                {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "Historical Data"}
                                             </div>
                                          </div>
                                       ))
                                    ) : (
                                       <div className="col-span-3 py-10 bg-white/5 border border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-neutral-600 gap-4">
                                          <StarOff size={32} strokeWidth={1} />
                                          <div className="text-[10px] font-black uppercase tracking-[0.2em]">Zero sentiment data detected</div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-6 text-neutral-800">
                      <Package size={64} strokeWidth={1} />
                      <div className="text-[11px] font-black uppercase tracking-[0.3em] italic">No Manifest Matches Detected</div>
                      <button 
                        onClick={() => { setFilterCategories([]); setFilterStatuses([]); setSearchQuery(""); }}
                        className="text-[10px] font-black uppercase tracking-widest text-accent-red hover:underline"
                      >
                        Reset System Parameters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card-bg p-10 rounded-[2.5rem] border border-border-subtle shadow-2xl sticky top-10">
          <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
            <h3 className="text-sm font-black tracking-[0.3em] flex items-center gap-4 uppercase text-white italic">
              {editingId ? <Edit size={20} className="text-accent-red" /> : <Plus size={20} className="text-accent-red" />}
              {editingId ? "Modify Protocol" : "Register Logic"}
            </h3>
            {editingId && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setNewService({ 
                    title: "", excerpt: "", description: "", price: 0, isActive: true, 
                    category: "Maintenance", icon: "Wrench", notes: "", imageUrl: "", 
                    features: [], variants: [], reviews: [], duration: "", requiredParts: [] 
                  });
                }}
                className="text-[10px] text-text-dim hover:text-rose-500 font-black uppercase tracking-[0.2em] transition-colors"
              >
                Abort Edit
              </button>
            )}
          </div>

          {/* Live Preview Card */}
          <div className="mb-10 p-6 bg-black/40 rounded-[2rem] border-2 border-white/5 shadow-2xl relative overflow-hidden group">
             <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] font-black text-accent-red uppercase tracking-[0.3em]">Live Terminal Preview</div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             </div>
             <div className="flex gap-5 items-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent-red shadow-inner">
                   {newService.icon && ICON_MAP[newService.icon] ? React.createElement(ICON_MAP[newService.icon], { size: 24 }) : <Package size={24} />}
                </div>
                <div>
                   <div className="text-xl font-black text-white uppercase italic tracking-tight truncate max-w-[200px]">
                      {newService.title || "UNTITLED_NODE"}
                   </div>
                   <div className="text-2xl font-black text-accent-red italic tracking-tighter">
                      ₹{newService.price || 0}
                   </div>
                </div>
             </div>
             <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1 italic">Public Excerpt:</div>
                <div className="text-[11px] font-bold text-neutral-400 line-clamp-1 italic">
                   {newService.excerpt || "No tagline provided for telemetry stream..."}
                </div>
             </div>
          </div>
          
          <form className="space-y-8" onSubmit={handleSaveService}>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex justify-between items-center ml-1">
                <span>Display Title</span>
                <button 
                  type="button" 
                  onClick={() => handleResearchService()}
                  disabled={researching || !newService.title}
                  className="flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-30"
                >
                  {researching ? <Loader2 size={10} className="animate-spin" /> : <SearchCode size={10} />}
                  <span className="text-[8px] tracking-widest uppercase font-black">Search Grounding</span>
                </button>
              </label>
              <input 
                type="text" 
                required
                value={newService.title}
                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                className="w-full text-sm font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red transition-all shadow-inner text-white placeholder:text-neutral-800 uppercase italic italic"
                placeholder="e.g. EXECUTIVE_AC_FLUSH"
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Short Excerpt / Tagline</label>
              <input 
                type="text" 
                value={newService.excerpt}
                onChange={(e) => setNewService({ ...newService, excerpt: e.target.value })}
                placeholder="Hook users with a catchy tagline..."
                className="w-full text-[11px] font-bold p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white transition-all placeholder:text-neutral-800"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Taxonomy</label>
                <div className="relative">
                  <select 
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    className="w-full text-[11px] font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase tracking-widest appearance-none cursor-pointer"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] text-right block mr-1 flex justify-between">
                  {previewCar.make && (
                    <span className="text-accent-blue animate-pulse">Preview: ₹{getDynamicVariant({ variants: newService.variants, price: newService.price })?.price || newService.price}</span>
                  )}
                  <span>MRP Value</span>
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-text-dim italic">₹</span>
                  <input 
                    type="number" 
                    required
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })}
                    className="w-full text-sm p-4 pl-10 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red font-black font-mono tracking-tighter text-white text-right"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Visual Signature (Icon)</label>
              <div className="grid grid-cols-6 gap-2 bg-black/30 p-4 rounded-[2rem] border border-white/5 shadow-inner">
                {availableIcons.map(iconName => {
                  const IconComp = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewService({ ...newService, icon: iconName })}
                      title={iconName}
                      className={cn(
                        "aspect-square rounded-xl border flex items-center justify-center transition-all group",
                        newService.icon === iconName 
                          ? "bg-accent-red border-accent-red text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] scale-110 z-10" 
                          : "bg-white/5 border-white/5 text-neutral-600 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {IconComp && <IconComp size={18} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-3 ml-1">
                <ImageIcon size={14} className="text-accent-red" /> Media Asset
              </label>
              <div className="flex gap-6">
                <div className="flex-1 space-y-3">
                  <input 
                    type="text" 
                    value={newService.imageUrl}
                    onChange={(e) => setNewService({ ...newService, imageUrl: e.target.value })}
                    placeholder="ENTER_RESOURCE_URL_OR_UPLOAD"
                    className="w-full text-[11px] p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red font-mono tracking-tight text-white placeholder:text-neutral-800"
                  />
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/5 text-text-dim rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:bg-primary/20 hover:text-white transition-all shadow-lg shadow-black/20 group"
                  >
                    <Upload size={14} className="group-hover:animate-bounce" />
                    UPLOAD MASTER ASSET
                  </button>
                </div>
                <div className="w-28 h-28 bg-black/60 rounded-[2rem] border-2 border-white/5 flex items-center justify-center text-neutral-800 overflow-hidden shadow-2xl shrink-0 group relative">
                  {newService.imageUrl ? (
                    <>
                      <img src={newService.imageUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" referrerPolicy="no-referrer" />
                      <div 
                        className="absolute inset-0 bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm cursor-pointer" 
                        onClick={() => setNewService({ ...newService, imageUrl: "" })}
                      >
                        <Trash2 size={24} strokeWidth={3} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-20">
                      <ImageIcon size={32} strokeWidth={1} />
                      <span className="text-[8px] font-black uppercase">No Media</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-4">
                  Process Map (Features)
                  <button 
                    type="button"
                    onClick={() => handleGenerateAIContent('features')}
                    disabled={generatingAI || !newService.title}
                    className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Sparkles size={10} />
                    <span className="text-[8px] font-black uppercase">AI_Features</span>
                  </button>
                </label>
                <button 
                  type="button"
                  onClick={addFeature}
                  className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-red flex items-center gap-2 hover:scale-110 transition-transform"
                >
                  <PlusCircle size={16} /> ADD_PROTOCOL
                </button>
              </div>
              <div className="p-6 bg-black/40 rounded-[2rem] border border-white/10 shadow-inner">
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                  {newService.features.map((feature, idx) => (
                    <div key={idx} className="flex gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-black text-accent-red shrink-0 shadow-inner">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <input 
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeatureSnapshot(idx, e.target.value)}
                        placeholder={`PROTOCOL_STEP_THROUGH...`}
                        className="flex-1 text-[11px] font-bold p-3 bg-black/20 border border-white/5 rounded-xl outline-none focus:border-accent-red text-white transition-all placeholder:text-neutral-800"
                      />
                      <button 
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="text-neutral-700 hover:text-rose-500 transition-colors p-3"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {newService.features.length === 0 && (
                    <div className="text-[10px] text-neutral-800 italic py-10 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                      NO_PROTOCOL_STEPS_DEFINED
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div 
                className="flex items-center justify-between cursor-pointer group ml-1"
                onClick={() => setPricingExpanded(!pricingExpanded)}
              >
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex items-center gap-3 transition-colors group-hover:text-white">
                  <div className={cn("p-1.5 rounded-lg bg-white/5 border border-white/10 transition-transform", pricingExpanded ? "rotate-180" : "rotate-0")}>
                    <ChevronDown size={14} />
                  </div>
                  Pricing Intelligence Matrix
                </label>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); addVariant(); }}
                  className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-red flex items-center gap-2 hover:scale-110 transition-transform"
                >
                  <PlusCircle size={16} /> APPEND_VARIANT
                </button>
              </div>

              <AnimatePresence>
                {pricingExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar pb-4 pt-2">
                      {newService.variants.map((v, idx) => (
                        <div key={idx} className="p-6 bg-black/60 rounded-[2.5rem] border border-white/10 space-y-5 relative group shadow-2xl">
                          <button 
                            type="button"
                            onClick={() => removeVariant(idx)}
                            className="absolute -top-3 -right-3 bg-accent-red text-white p-2 rounded-full border-4 border-card-bg shadow-xl opacity-0 group-hover:opacity-100 transition-all z-10 scale-0 group-hover:scale-100"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1 opacity-60">Brand Node</label>
                              <div className="relative">
                                <select 
                                  value={v.make}
                                  onChange={(e) => {
                                    const make = e.target.value;
                                    const defaultModel = (carData as any)[make]?.models?.[0]?.name || "All";
                                    updateVariant(idx, "make", make);
                                    updateVariant(idx, "model", defaultModel);
                                  }}
                                  className="w-full text-[11px] font-black p-3 bg-black/40 border border-white/5 rounded-xl outline-none text-white appearance-none uppercase"
                                >
                                  <option value="">SELECT MAKE</option>
                                  <option value="All">All Brands</option>
                                  {Object.keys(carData).map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1 opacity-60">Model Spec</label>
                              <div className="relative">
                                <select 
                                  value={v.model}
                                  onChange={(e) => updateVariant(idx, "model", e.target.value)}
                                  disabled={!v.make || v.make === "All"}
                                  className="w-full text-[11px] font-black p-3 bg-black/40 border border-white/5 rounded-xl outline-none text-white appearance-none uppercase"
                                >
                                  <option value="All">All Models</option>
                                  {v.make && (carData as any)[v.make]?.models?.map((mod: any) => (
                                    <option key={mod.name} value={mod.name}>{mod.name}</option>
                                  ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1 opacity-60">Propulsion</label>
                              <div className="relative">
                                <select 
                                  value={v.fuel}
                                  onChange={(e) => updateVariant(idx, "fuel", e.target.value)}
                                  className="w-full text-[11px] font-black p-3 bg-black/40 border border-white/5 rounded-xl outline-none text-white focus:border-accent-red appearance-none uppercase"
                                >
                                  <option>All</option>
                                  <option>Petrol</option>
                                  <option>Diesel</option>
                                  <option>CNG</option>
                                  <option>Electric</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1 opacity-60">Engine Capacity / Rules</label>
                              <input 
                                type="text"
                                value={v.engine || ""}
                                onChange={(e) => updateVariant(idx, "engine", e.target.value)}
                                placeholder="e.g. 1.2L, 1.5L, ALL"
                                className="w-full text-[11px] font-black p-3 bg-black/40 border border-white/5 rounded-xl outline-none text-white focus:border-accent-red uppercase"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1 opacity-60">Override Value</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-accent-red italic">₹</span>
                                <input 
                                  type="number"
                                  value={v.price}
                                  onChange={(e) => updateVariant(idx, "price", Number(e.target.value))}
                                  className="w-full text-[11px] p-3 pl-7 bg-black/40 border border-white/5 rounded-xl outline-none font-black text-white focus:border-accent-red text-right font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1 opacity-60">Contextual Meta</label>
                            <textarea 
                              value={v.description}
                              onChange={(e) => updateVariant(idx, "description", e.target.value)}
                              placeholder="Operational rationale for price divergence..."
                              className="w-full text-[10px] p-3 bg-black/40 border border-white/5 rounded-xl outline-none font-medium text-neutral-500 leading-relaxed focus:border-accent-red"
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}
                      {newService.variants.length === 0 && (
                        <div className="text-[10px] text-neutral-800 italic py-10 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-black/20">
                          NO_VARIANT_OVERLAYS_DETECTED
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] flex justify-between items-center ml-1">
                <span>Detailed Narrative</span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handleGenerateAIContent('description')}
                    disabled={generatingAI || !newService.title}
                    className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">AI Description</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleGenerateAIContent('all')}
                    disabled={generatingAI || !newService.title}
                    className="flex items-center gap-2 bg-accent-red/10 text-accent-red px-3 py-1.5 rounded-xl border border-accent-red/20 hover:bg-accent-red hover:text-white transition-all disabled:opacity-50"
                   >
                     {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                     <span className="text-[9px] font-black uppercase tracking-widest">AI Sync All</span>
                   </button>
                </div>
              </label>
              <textarea 
                required
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                className="w-full text-[11px] font-bold p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white leading-relaxed placeholder:text-neutral-800"
                rows={4}
                placeholder="High-conversion marketing summary..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Estimated Duration</label>
                  <input 
                    type="text" 
                    value={newService.duration}
                    onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                    placeholder="e.g. 2 hrs"
                    className="w-full text-[11px] font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase italic shadow-inner"
                  />
               </div>
               <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Required Parts (List)</label>
                  <input 
                    type="text" 
                    value={newService.requiredParts.join(", ")}
                    onChange={(e) => setNewService({ ...newService, requiredParts: e.target.value.split(",").map(p => p.trim()).filter(p => p !== "") })}
                    placeholder="Oil, Filter, etc."
                    className="w-full text-[11px] font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase italic shadow-inner"
                  />
               </div>
            </div>

            <div className="space-y-3 bg-neutral-950 p-8 rounded-[2rem] border border-white/5 shadow-2xl">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4 block italic">Intelligence & Security Metadata</label>
              <textarea 
                value={newService.notes}
                onChange={(e) => setNewService({ ...newService, notes: e.target.value })}
                className="w-full text-xs p-5 bg-black/60 text-emerald-400 border border-white/5 rounded-2xl outline-none focus:border-accent-red font-mono text-[10px] shadow-inner"
                placeholder="SYSTEM_INTERNAL_LOG_NOTE..."
                rows={3}
              />
              <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/5">
                <input 
                  type="checkbox"
                  id="isActive"
                  checked={newService.isActive}
                  onChange={(e) => setNewService({ ...newService, isActive: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-accent-red focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <label htmlFor="isActive" className="text-[11px] font-black text-white uppercase tracking-[0.25em] cursor-pointer select-none group flex items-center gap-3">
                  ACTIVATE SYSTEM DEPLOYMENT
                  <div className={cn("w-2 h-2 rounded-full", newService.isActive ? "bg-emerald-500 shadow-[0_0_10px_#10B981] animate-pulse" : "bg-neutral-800")} />
                </label>
              </div>
            </div>

            <button className="w-full bg-accent-red text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-neutral-100 hover:text-black transition-all flex items-center justify-center gap-5 shadow-[0_20px_40px_-10px_rgba(239,68,68,0.3)] hover:shadow-white/10 active:scale-[0.98] group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Save size={20} className="group-hover:rotate-12 transition-transform" />
              {editingId ? "INITIALIZE_RECONFIGURATION" : "COMMIT_PROTOCOL_TO_BLOCKCHAIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ContentTab({ config, setConfig }: { config: any, setConfig: any }) {
  const handleUpdateConfig = async () => {
    try {
      await setDoc(doc(db, "config", "ui"), config, { merge: true });
      toast.success("Config updated! Refresh the site to see changes.");
    } catch (err) {
      console.error(err);
      toast.error("Only admins can update public config.");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-10 max-w-7xl mx-auto pb-20">
      {/* COLUMN 1: Visual Identity & Hero */}
      <div className="space-y-10">
        <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layout size={100} strokeWidth={1} />
          </div>
          <h3 className="text-sm font-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em] text-white italic border-b border-white/5 pb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-red border border-white/5 shadow-inner">
              <Layout size={20} />
            </div>
            Hero Interface Management
          </h3>
          <div className="space-y-8 relative z-10">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Vanguard Heading</label>
              <input 
                type="text" 
                value={config.heroTitle}
                onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                className="w-full text-sm font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase italic shadow-inner"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px) font-black text-text-dim uppercase tracking-[0.25em] ml-1">Sub-Atmospheric Tagline</label>
              <input 
                type="text" 
                value={config.heroSubtitle}
                onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
                className="w-full text-sm font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase italic shadow-inner"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Cinematic Asset Anchor (URL)</label>
              <input 
                type="text" 
                value={config.heroImage}
                onChange={(e) => setConfig({ ...config, heroImage: e.target.value })}
                placeholder="HTTPS://CDN.RESOURCE.IO/ASSET.JPG"
                className="w-full text-[11px] font-mono p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-accent-blue shadow-inner"
              />
            </div>
          </div>
        </div>

        <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Palette size={100} strokeWidth={1} />
          </div>
          <h3 className="text-sm font-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em] text-white italic border-b border-white/5 pb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
              <Palette size={20} />
            </div>
            Chromatic Identity
          </h3>
          <div className="space-y-8 relative z-10">
            <div className="flex gap-6 items-center">
              <input 
                type="color" 
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="h-20 w-32 p-1.5 bg-black/40 border-4 border-white/5 rounded-2xl cursor-pointer shadow-2xl"
              />
              <div className="flex-1 space-y-2">
                <input 
                  type="text" 
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-full text-lg font-mono font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase tracking-wider"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Globe size={100} strokeWidth={1} />
          </div>
          <h3 className="text-sm font-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em] text-white italic border-b border-white/5 pb-8 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 border border-white/5 shadow-inner">
              <Globe size={20} />
            </div>
            SEO & Search Presence
          </h3>
          <div className="space-y-6 relative z-10">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">SEO Title Protocol</label>
              <input 
                type="text" 
                value={config.seoTitle}
                onChange={(e) => setConfig({ ...config, seoTitle: e.target.value })}
                className="w-full text-xs font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-white shadow-inner"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Meta Description Array</label>
              <textarea 
                value={config.seoDescription}
                onChange={(e) => setConfig({ ...config, seoDescription: e.target.value })}
                className="w-full text-xs font-bold p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-white leading-relaxed shadow-inner"
                rows={2}
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Keyword Identifiers</label>
              <input 
                type="text" 
                value={config.seoKeywords}
                onChange={(e) => setConfig({ ...config, seoKeywords: e.target.value })}
                className="w-full text-xs font-mono p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-emerald-400 shadow-inner"
              />
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Logistics & Navigation */}
      <div className="space-y-10">
        <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <h3 className="text-sm font-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em] text-white italic border-b border-white/5 pb-8 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent-blue border border-white/5 shadow-inner">
              <MessageSquare size={20} />
            </div>
            Data Logistics & Brand
          </h3>
          <div className="space-y-6 relative z-10">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Brand Identifier (Text)</label>
              <input 
                type="text" 
                value={config.logoText}
                onChange={(e) => setConfig({ ...config, logoText: e.target.value })}
                className="w-full text-lg font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase italic shadow-inner"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Brand Visual Anchor (Logo URL)</label>
              <input 
                type="text" 
                value={config.logoUrl}
                onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                className="w-full text-[11px] font-mono p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Universal Font Family</label>
                <select 
                  value={config.fontFamily}
                  onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                  className="w-full text-xs font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-white"
                >
                  <option value="Inter">Inter (Swiss)</option>
                  <option value="Space Grotesk">Space Grotesk (Tech)</option>
                  <option value="Outfit">Outfit (Geometric)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Mono)</option>
                </select>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Base Font Scale</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="14" max="22" step="1"
                    value={config.baseFontSize || 16}
                    onChange={(e) => setConfig({ ...config, baseFontSize: parseInt(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-mono font-black text-white">{config.baseFontSize || 16}px</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Universal Font Color</label>
                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/10">
                  <input 
                    type="color" 
                    value={config.fontColor || "#1e293b"}
                    onChange={(e) => setConfig({ ...config, fontColor: e.target.value })}
                    className="w-10 h-10 rounded-lg p-0 bg-transparent cursor-pointer border-none"
                  />
                  <input 
                    type="text"
                    value={config.fontColor || "#1e293b"}
                    onChange={(e) => setConfig({ ...config, fontColor: e.target.value })}
                    className="flex-1 bg-transparent text-[11px] font-mono font-black text-white uppercase outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Heading Font Color</label>
                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/10">
                  <input 
                    type="color" 
                    value={config.headingColor || "#0f172a"}
                    onChange={(e) => setConfig({ ...config, headingColor: e.target.value })}
                    className="w-10 h-10 rounded-lg p-0 bg-transparent cursor-pointer border-none"
                  />
                  <input 
                    type="text"
                    value={config.headingColor || "#0f172a"}
                    onChange={(e) => setConfig({ ...config, headingColor: e.target.value })}
                    className="flex-1 bg-transparent text-[11px] font-mono font-black text-white uppercase outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Support Email</label>
                <input 
                  type="text" 
                  value={config.supportEmail}
                  onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                  className="w-full text-[11px] font-mono p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-white"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Support Phone</label>
                <input 
                  type="text" 
                  value={config.supportPhone}
                  onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                  className="w-full text-[11px] font-mono p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-white"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Footer Narrative</label>
              <textarea 
                value={config.footerText}
                onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                className="w-full text-[11px] font-bold p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-primary text-white leading-relaxed"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <h3 className="text-sm font-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em] text-white italic border-b border-white/5 pb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
              <Database size={20} />
            </div>
            Navigation Mapping
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Header Terminal Links</label>
              {(config.navLinks || []).map((link: any, idx: number) => (
                <div key={idx} className="p-3 bg-black/40 rounded-xl border border-white/5 flex gap-3 items-center">
                  <input 
                    type="text" value={link.name} 
                    onChange={(e) => {
                      const updated = [...config.navLinks];
                      updated[idx].name = e.target.value;
                      setConfig({ ...config, navLinks: updated });
                    }}
                    className="flex-1 bg-transparent text-[10px] font-black uppercase text-white outline-none"
                  />
                  <input 
                    type="text" value={link.href} 
                    onChange={(e) => {
                      const updated = [...config.navLinks];
                      updated[idx].href = e.target.value;
                      setConfig({ ...config, navLinks: updated });
                    }}
                    className="flex-1 bg-transparent text-[10px] font-mono text-text-dim outline-none"
                  />
                  <button onClick={() => setConfig({ ...config, navLinks: config.navLinks.filter((_: any, i: number) => i !== idx) })} className="text-rose-500/40 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setConfig({ ...config, navLinks: [...(config.navLinks || []), { name: "NEW", href: "#" }] })}
                className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase text-text-dim hover:text-white"
              >
                + ADD_NAV_NODE
              </button>
            </div>
            
            <div className="space-y-2 pt-6">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Footer Quick Protocols</label>
              {(config.footerQuickLinks || []).map((link: any, idx: number) => (
                <div key={idx} className="p-3 bg-black/40 rounded-xl border border-white/5 flex gap-3 items-center">
                  <input 
                    type="text" value={link.name} 
                    onChange={(e) => {
                      const updated = [...config.footerQuickLinks];
                      updated[idx].name = e.target.value;
                      setConfig({ ...config, footerQuickLinks: updated });
                    }}
                    className="flex-1 bg-transparent text-[10px] font-black uppercase text-white outline-none"
                  />
                  <input 
                    type="text" value={link.href} 
                    onChange={(e) => {
                      const updated = [...config.footerQuickLinks];
                      updated[idx].href = e.target.value;
                      setConfig({ ...config, footerQuickLinks: updated });
                    }}
                    className="flex-1 bg-transparent text-[10px] font-mono text-text-dim outline-none"
                  />
                  <button onClick={() => setConfig({ ...config, footerQuickLinks: config.footerQuickLinks.filter((_: any, i: number) => i !== idx) })} className="text-rose-500/40 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setConfig({ ...config, footerQuickLinks: [...(config.footerQuickLinks || []), { name: "NEW", href: "#" }] })}
                className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase text-text-dim hover:text-white"
              >
                + ADD_QUICK_NODE
              </button>
            </div>

            <div className="space-y-2 pt-6">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Footer Legal Protocols</label>
              {(config.footerLegalLinks || []).map((link: any, idx: number) => (
                <div key={idx} className="p-3 bg-black/40 rounded-xl border border-white/5 flex gap-3 items-center">
                  <input 
                    type="text" value={link.name} 
                    onChange={(e) => {
                      const updated = [...config.footerLegalLinks];
                      updated[idx].name = e.target.value;
                      setConfig({ ...config, footerLegalLinks: updated });
                    }}
                    className="flex-1 bg-transparent text-[10px] font-black uppercase text-white outline-none"
                  />
                  <input 
                    type="text" value={link.href} 
                    onChange={(e) => {
                      const updated = [...config.footerLegalLinks];
                      updated[idx].href = e.target.value;
                      setConfig({ ...config, footerLegalLinks: updated });
                    }}
                    className="flex-1 bg-transparent text-[10px] font-mono text-text-dim outline-none"
                  />
                  <button onClick={() => setConfig({ ...config, footerLegalLinks: config.footerLegalLinks.filter((_: any, i: number) => i !== idx) })} className="text-rose-500/40 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setConfig({ ...config, footerLegalLinks: [...(config.footerLegalLinks || []), { name: "LEGAL", href: "#" }] })}
                className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase text-text-dim hover:text-white"
              >
                + ADD_LEGAL_NODE
              </button>
            </div>

            <div className="space-y-4 pt-10 border-t border-white/5">
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <Fuel size={14} className="text-accent-red" /> Operational Fuel Matrix
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {(config.fuelTypes || ["Petrol", "Diesel", "Electric (EV)", "Hybrid", "CNG", "Solar"]).map((fuel: string, idx: number) => (
                  <div key={idx} className="group p-3 bg-black/40 rounded-xl border border-white/5 flex gap-3 items-center">
                    <input 
                      type="text" value={fuel} 
                      onChange={(e) => {
                        const updated = [...(config.fuelTypes || ["Petrol", "Diesel", "Electric (EV)", "Hybrid", "CNG", "Solar"])];
                        updated[idx] = e.target.value;
                        setConfig({ ...config, fuelTypes: updated });
                      }}
                      className="flex-1 bg-transparent text-[10px] font-black uppercase text-white outline-none focus:text-accent-red transition-colors"
                    />
                    <button 
                      onClick={() => {
                        const updated = (config.fuelTypes || ["Petrol", "Diesel", "Electric (EV)", "Hybrid", "CNG", "Solar"]).filter((_: any, i: number) => i !== idx);
                        setConfig({ ...config, fuelTypes: updated });
                      }}
                      className="text-rose-500/20 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setConfig({ ...config, fuelTypes: [...(config.fuelTypes || ["Petrol", "Diesel", "Electric (EV)", "Hybrid", "CNG", "Solar"]), "NEW_SOURCE"] })}
                className="w-full py-3 mt-2 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase text-text-dim hover:text-white transition-all hover:bg-white/5"
              >
                + INITIALIZE_FUEL_PROTOCOL
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={handleUpdateConfig}
          className="w-full bg-white text-black py-6 rounded-[3rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-accent-red hover:text-white transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-[0.98] group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Save size={20} className="group-hover:rotate-12 transition-transform" />
          SYNCHRONIZE_PRODUCTION_STATE
        </button>
      </div>
    </div>
  );
}

// Note: serverTimestamp is now imported from firebase/firestore

function CarHubTab({ carData, setCarData }: { carData: Record<string, { logo: string, models: { name: string, logo: string, fuelTypes?: string[] }[] }>, setCarData: any }) {
  const [newBrand, setNewBrand] = useState("");
  const [newBrandLogo, setNewBrandLogo] = useState("");
  const [newModel, setNewModel] = useState<{ [brand: string]: string }>({});
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editLogoRef = useRef<HTMLInputElement>(null);
  const modelLogoRef = useRef<HTMLInputElement>(null);
  const [editingBrandLogo, setEditingBrandLogo] = useState<string | null>(null);
  const [editingModelContext, setEditingModelContext] = useState<{ brand: string, index: number } | null>(null);

  const filteredBrands = Object.entries(carData).filter(([brand, data]) => {
    const brandMatch = brand.toLowerCase().includes(search.toLowerCase());
    const modelMatch = data.models.some(m => m.name.toLowerCase().includes(search.toLowerCase()));
    return brandMatch || modelMatch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'brand' | 'model' | 'newBrand', context?: any) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.warning("File too large. Please use a compressed logo (max 500KB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (type === 'newBrand') {
          setNewBrandLogo(base64);
        } else if (type === 'brand' && context?.brand) {
          await updateBrandLogo(context.brand, base64);
          setEditingBrandLogo(null);
        } else if (type === 'model' && context?.brand && context?.index !== undefined) {
          await updateModelLogo(context.brand, context.index, base64);
          setEditingModelContext(null);
        }
      };
      reader.readAsDataURL(file);
      // Reset input value to allow uploading same file again
      e.target.value = '';
    }
  };

  const handleAddBrand = async () => {
    const brandId = newBrand.trim();
    if (!brandId) {
      toast.error("Operational Error: Brand identifier cannot be null or empty space.");
      return;
    }
    
    const exists = Object.keys(carData).some(b => b.toLowerCase() === brandId.toLowerCase());
    if (exists) {
      toast.warning("System Warning: Brand already registered in manifest.");
      return;
    }

    const finalLogo = newBrandLogo.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandId)}&backgroundColor=0f172a&fontSize=45&bold=true&chars=1`;
    const updated = { logo: finalLogo, models: [] };
    await setDoc(doc(db, "carBrands", brandId), updated);
    setNewBrand("");
    setNewBrandLogo("");
  };

  const updateBrandLogo = async (brand: string, logo: string) => {
    await updateDoc(doc(db, "carBrands", brand), { logo });
  };

  const updateModelLogo = async (brand: string, index: number, logo: string) => {
    const updatedModels = [...(carData[brand]?.models || [])];
    if (updatedModels[index]) {
      updatedModels[index].logo = logo;
      await updateDoc(doc(db, "carBrands", brand), { models: updatedModels });
    }
  };

  const handleDeleteBrand = async (brand: string) => {
    if (!window.confirm(`Delete entire brand "${brand}" and all its models?`)) return;
    await deleteDoc(doc(db, "carBrands", brand));
  };

  const handleAddModel = async (brand: string) => {
    const modelName = newModel[brand]?.trim();
    if (!modelName) {
      toast.error("Operational Error: Model name cannot be void.");
      return;
    }

    const models = carData[brand]?.models || [];
    
    if (models.some(m => m.name.toLowerCase() === modelName.toLowerCase())) {
      toast.warning("System Warning: Model name already exists for this branch.");
      return;
    }

    const logoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(modelName)}&backgroundColor=334155&fontSize=45&bold=true`;

    const fuelTypes = window.confirm(`Initial configuration: Include Diesel as well? (OK for Petrol+Diesel, Cancel for Petrol only)`) 
      ? ["Petrol", "Diesel"] 
      : ["Petrol"];

    await updateDoc(doc(db, "carBrands", brand), { 
      models: [...models, { name: modelName, logo: logoUrl, fuelTypes }] 
    });
    setNewModel({ ...newModel, [brand]: "" });
  };

  const handleDeleteModel = async (brand: string, index: number) => {
    const updatedModels = (carData[brand]?.models || []).filter((_, i) => i !== index);
    await updateDoc(doc(db, "carBrands", brand), { models: updatedModels });
  };

  const handleGlobalAutoRepair = async () => {
    let repairedCount = 0;
    const batchWork = { ...carData };
    
    toast.info("Commencing global visual synchronization...");

    for (const [brand, data] of Object.entries(batchWork)) {
      let brandChanged = false;
      const brandData = { ...data };
      
      // Repair Brand Logo
      if (!brandData.logo || brandData.logo === "") {
        brandData.logo = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brand)}&backgroundColor=0f172a&fontSize=45&bold=true&chars=1`;
        brandChanged = true;
      }
      
      // Repair Model Logos
      const updatedModels = [...(brandData.models || [])];
      updatedModels.forEach((model: any, idx: number) => {
        if (!model.logo || model.logo === "") {
          model.logo = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(model.name)}&backgroundColor=334155&fontSize=45&bold=true`;
          brandChanged = true;
        }
      });
      
      if (brandChanged) {
        brandData.models = updatedModels;
        try {
          await updateDoc(doc(db, "carBrands", brand), brandData);
          repairedCount++;
        } catch (err) {
          console.error(`Repair failure for ${brand}:`, err);
        }
      }
    }
    
    if (repairedCount > 0) {
      toast.success(`Visual Synchronization Complete: ${repairedCount} brands re-mapped with generated identity tokens.`);
    } else {
      toast.info("Database Integrity Verified: All visual nodes are active.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden">
        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Car size={22} />
            </div>
            Universal Car Database
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleGlobalAutoRepair}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-accent-red hover:bg-accent-red hover:text-white transition-all flex items-center gap-2"
              title="Auto-generate missing logos"
            >
              <Zap size={14} />
              Repair Visuals
            </button>
            <div className="relative group/search w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors group-focus-within/search:text-primary" size={14} />
              <input 
                type="text"
                placeholder="SEARCH BRANDS/MODELS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-white outline-none focus:border-primary/50 transition-all shadow-inner placeholder:text-neutral-700"
              />
            </div>
          </div>
        </h3>
        
        <div className="space-y-4 mb-12">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Brand Identity</label>
              <input 
                type="text" 
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="E.G. TOYOTA, HONDA..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-black uppercase tracking-widest placeholder:text-neutral-800 outline-none focus:border-primary transition-all"
              />
            </div>
            
            <div className="flex-[1.5] space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Logo Resource (URL or Upload)</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newBrandLogo}
                  onChange={(e) => setNewBrandLogo(e.target.value)}
                  placeholder="HTTPS://..."
                  className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-black tracking-widest placeholder:text-neutral-800 outline-none focus:border-primary transition-all text-xs"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-text-dim hover:text-white transition-all shadow-inner shrink-0"
                  title="Upload Logo"
                >
                  <Upload size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'newBrand')}
                />
              </div>
            </div>

            <button 
              onClick={handleAddBrand}
              className="h-14 bg-primary text-white px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all mb-[1px]"
            >
              Append Brand
            </button>
          </div>
          {newBrandLogo && newBrandLogo.startsWith('data:') && (
            <div className="flex items-center gap-3 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-fit">
              <img src={newBrandLogo} className="w-10 h-10 object-contain bg-white rounded-lg p-1" alt="Preview" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Logo Buffered for sync</span>
              <button onClick={() => setNewBrandLogo("")} className="text-emerald-500/50 hover:text-rose-500"><X size={14} /></button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.map(([brand, data]) => (
            <div key={brand} className="bg-white/5 rounded-[2.5rem] border border-white/5 p-8 flex flex-col group relative overflow-hidden transition-all hover:bg-white/[0.07]">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="relative group/logo">
                       <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl overflow-hidden">
                         {data.logo ? (
                           <img src={data.logo} alt={brand} className="w-full h-full object-contain" />
                         ) : (
                           <Car size={24} className="text-neutral-300" />
                         )}
                       </div>
                       <button 
                         className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-black border border-white/10 flex items-center justify-center text-text-dim hover:text-primary transition-all shadow-lg opacity-0 group-hover/logo:opacity-100 z-10"
                         onClick={() => {
                           setEditingBrandLogo(brand);
                           editLogoRef.current?.click();
                         }}
                       >
                         <Upload size={12} />
                       </button>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                           <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{brand}</h4>
                           <button 
                            onClick={async () => {
                               const newName = window.prompt("Rename brand '" + brand + "' to:", brand);
                               if (newName && newName.trim() && newName !== brand) {
                                const newId = newName.trim();
                                await setDoc(doc(db, "carBrands", newId), carData[brand]);
                                await deleteDoc(doc(db, "carBrands", brand));
                              }
                            }}
                            className="text-text-dim hover:text-white transition-all opacity-0 group-hover:opacity-100"
                           >
                              <Edit size={12} />
                           </button>
                        </div>
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">{data.models.length} Variants</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => handleDeleteBrand(brand)}
                   className="text-neutral-700 hover:text-rose-500 transition-colors p-1"
                 >
                   <Trash2 size={16} />
                 </button>
              </div>

              <div className="flex-1 space-y-2 mb-6 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {(data.models || []).map((model: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-black/20 px-4 py-2.5 rounded-xl group/model">
                    <div className="flex items-center gap-3">
                       <div className="relative group/modellogo">
                          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden">
                             {model.logo ? (
                               <img src={model.logo} alt={model.name} className="w-full h-full object-contain" />
                             ) : (
                               <Car size={14} className="text-neutral-300" />
                             )}
                          </div>
                          <button 
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-black border border-white/10 flex items-center justify-center text-text-dim hover:text-primary transition-all shadow-lg opacity-0 group-hover/modellogo:opacity-100 z-10"
                            onClick={() => {
                              setEditingModelContext({ brand, index: idx });
                              modelLogoRef.current?.click();
                            }}
                          >
                             <Upload size={8} />
                          </button>
                       </div>
                       <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{model.name}</span>
                       <div className="flex items-center gap-1.5 ml-2">
                          {(model.fuelTypes || ["Petrol", "Diesel"]).map((f: string) => (
                            <span key={f} className="text-[7px] font-black px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-neutral-500 uppercase tracking-tighter">
                              {f.slice(0, 1)}
                            </span>
                          ))}
                       </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover/model:opacity-100 transition-all">
                       <button 
                         onClick={async () => {
                           const currentFuels = model.fuelTypes || ["Petrol", "Diesel"];
                           const commonFuels = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"];
                           const newFuelsStr = window.prompt(`Define fuel matrix for "${model.name}" in ${brand}. Comma separate types.\nSuggested: ${commonFuels.join(", ")}`, currentFuels.join(", "));
                           
                           if (newFuelsStr !== null) {
                             const updatedFuels = newFuelsStr.split(",")
                               .map(f => f.trim())
                               .filter(f => f.length > 0)
                               .map(f => f.charAt(0).toUpperCase() + f.slice(1).toLowerCase());
                             
                             if (updatedFuels.length === 0) {
                               toast.error("Fuel protocol requires at least one type.");
                               return;
                             }

                             const updatedModels = [...carData[brand].models];
                             updatedModels[idx].fuelTypes = updatedFuels;
                             
                             try {
                               await updateDoc(doc(db, "carBrands", brand), { models: updatedModels });
                               toast.success(`Fuel matrix for ${model.name} synchronized.`);
                             } catch (err) {
                               console.error(err);
                               toast.error("Registry update failed.");
                             }
                           }
                         }}
                         className="text-neutral-600 hover:text-emerald-500 transition-all p-1"
                         title="Calibrate Fuel Types"
                       >
                         <Fuel size={12} />
                       </button>
                       <button 
                         onClick={async () => {
                           const newName = window.prompt(`Rename model node "${model.name}" in branch ${brand}:`, model.name);
                           if (newName && newName.trim() && newName !== model.name) {
                             const updatedModels = [...carData[brand].models];
                             updatedModels[idx].name = newName.trim().toUpperCase();
                             await updateDoc(doc(db, "carBrands", brand), { models: updatedModels });
                             toast.success("Identifier re-mapped.");
                           }
                         }}
                         className="text-neutral-600 hover:text-white transition-all p-1"
                       >
                         <Edit2 size={10} />
                       </button>
                       <button 
                        onClick={() => handleDeleteModel(brand, idx)}
                        className="text-neutral-600 hover:text-rose-500 transition-all p-1"
                       >
                         <X size={12} />
                       </button>
                    </div>
                  </div>
                ))}
                {data.models.length === 0 && (
                  <p className="text-[9px] text-neutral-800 italic text-center py-4 border border-dashed border-white/5 rounded-xl">Empty Roster</p>
                )}
              </div>

              <div className="relative flex gap-2">
                <input 
                  type="text" 
                  value={newModel[brand] || ""}
                  onChange={(e) => setNewModel({ ...newModel, [brand]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddModel(brand)}
                  placeholder="APPEND MODEL..."
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl pl-4 pr-4 py-3 text-[9px] font-black uppercase tracking-widest text-white outline-none focus:border-primary transition-all"
                />
                <button 
                  onClick={() => handleAddModel(brand)}
                  className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 shrink-0"
                  title="Add Model"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <input 
          type="file" 
          ref={editLogoRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => editingBrandLogo && handleFileUpload(e, 'brand', { brand: editingBrandLogo })}
        />
        <input 
          type="file" 
          ref={modelLogoRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => editingModelContext && handleFileUpload(e, 'model', editingModelContext)}
        />
      </div>
    </div>
  );
}

function TasksTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "" });
  const [sendingNotify, setSendingNotify] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Tasks sync error handled:", err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      if (editingTask) {
        await updateDoc(doc(db, "tasks", editingTask.id), {
          ...newTask,
          updatedAt: serverTimestamp()
        });
        toast.success("Task updated successfully.");
      } else {
        await addDoc(collection(db, "tasks"), {
          ...newTask,
          status: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Task created successfully.");
      }
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "" });
      setShowCreate(false);
      setEditingTask(null);
    } catch (err) {
      console.error(err);
      toast.error("System failure: Task protocol aborted.");
    }
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate || "",
      assignedTo: task.assignedTo || ""
    });
    setShowCreate(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "tasks", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Task status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error("Status update sync failed.");
    }
  };

  const checkDueTasks = async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    let notifyCount = 0;
    for (const task of tasks) {
      if (task.status === "completed" || !task.dueDate) continue;
      
      const dueDate = new Date(task.dueDate);
      const isDueSoon = dueDate > now && dueDate < soon;
      const isOverdue = dueDate < now;
      
      if (isDueSoon || isOverdue) {
        // Simple heuristic to prevent spam: don't notify if notified in last 6 hours
        const lastNotified = task.lastNotifiedAt?.toMillis() || 0;
        if (Date.now() - lastNotified > 6 * 60 * 60 * 1000) {
          const recipient = task.assignedTo || "assist@carmechs.in";
          await sendTaskNotification(recipient, task);
          await updateDoc(doc(db, "tasks", task.id), {
            lastNotifiedAt: serverTimestamp()
          });
          notifyCount++;
        }
      }
    }
    if (notifyCount > 0) {
      toast.info(`Dispatched ${notifyCount} priority alerts for due/overdue tasks.`);
    } else {
      toast.success("Operational readiness check: All tasks synchronized.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Purge this task from the registry?")) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNotification = async (task: any) => {
    setSendingNotify(task.id);
    try {
      const result = await sendTaskNotification(auth.currentUser?.email || "assist@carmechs.in", task);
      if (result.success) {
        toast.success("Operational alert transmitted to command node.");
      } else {
        toast.error("Transmission failed: Relay node unresponsive.");
      }
    } catch (err) {
      toast.error("System Error: Notification protocol failure.");
    } finally {
      setSendingNotify(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const statusMatch = filterStatus === "all" || t.status === filterStatus;
    const priorityMatch = filterPriority === "all" || t.priority === filterPriority;
    const searchMatch = robustSearch(t, search, ["title", "description", "id", "status", "priority"]);
    return statusMatch && priorityMatch && searchMatch;
  }).sort((a, b) => {
    if (sortBy === "priority") {
      const pScale: any = { high: 3, medium: 2, low: 1 };
      return pScale[b.priority] - pScale[a.priority];
    }
    if (sortBy === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return b.createdAt?.toMillis() - a.createdAt?.toMillis();
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <ListTodo size={120} strokeWidth={1} />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent-red border border-white/5 shadow-inner">
                <ListTodo size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic leading-none mb-1 text-white">Task Command</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Internal operational objectives</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={checkDueTasks}
              className="flex items-center gap-3 bg-white/5 text-white/70 border border-white/10 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all group"
            >
              <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              Sync Alarms
            </button>
            <button 
              onClick={() => setShowCreate(!showCreate)}
              className="group flex items-center gap-3 bg-accent-red text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-accent-red/20 hover:scale-105 active:scale-95 transition-all"
            >
              <PlusCircle size={18} className="group-hover:rotate-90 transition-transform" />
              Append Task
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card-bg p-10 rounded-[2.5rem] border border-border-subtle shadow-2xl relative">
              <form onSubmit={handleCreateTask} className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Objective Identifier</label>
                    <input 
                      required
                      type="text" 
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Transmission target..."
                      className="w-full text-sm font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase italic"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Narrative Parameters</label>
                    <textarea 
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Detailed operational metadata..."
                      rows={3}
                      className="w-full text-xs p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Assigned Operative (Email)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700" size={14} />
                      <input 
                        type="email" 
                        value={newTask.assignedTo}
                        onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                        placeholder="operator@carmechs.in"
                        className="w-full text-xs font-bold pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Priority Level</label>
                      <select 
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        className="w-full text-xs font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white uppercase appearance-none"
                      >
                        <option value="low">LOW_PRIORITY</option>
                        <option value="medium">MEDIUM_PRIORITY</option>
                        <option value="high">HIGH_PRIORITY</option>
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Deadline Anchor</label>
                      <input 
                        type="datetime-local" 
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="w-full text-xs font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-accent-red hover:text-white transition-all shadow-xl active:scale-95"
                    >
                      COMMIT_TO_REGISTRY
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="px-8 bg-white/5 text-text-dim py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border border-white/5 hover:bg-white/10 transition-all"
                    >
                      ABORT
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-64 group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim transition-colors group-focus-within/search:text-accent-red" size={14} />
              <input 
                type="text"
                placeholder="Search objectives..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-[11px] font-bold text-white focus:outline-none focus:border-accent-red transition-all shadow-inner placeholder:text-neutral-700 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
              {["all", "pending", "in-progress", "completed"].map(status => (
                <button 
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    filterStatus === status ? "bg-accent-red text-white shadow-lg" : "text-text-dim hover:text-white"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Priority</label>
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase text-white outline-none focus:border-accent-red cursor-pointer"
              >
                <option value="all">ALL_PRIORITY</option>
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Sort</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase text-white outline-none focus:border-accent-red cursor-pointer"
              >
                <option value="createdAt">CREATION_SEQ</option>
                <option value="priority">PRIORITY_RANK</option>
                <option value="dueDate">DEADLINE_ANCHOR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card-bg rounded-[2.5rem] border border-border-subtle overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Objective</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Priority</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Assigned To</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Deadline</th>
                <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
                
                return (
                  <tr 
                    key={task.id}
                    className={cn(
                      "hover:bg-white/[0.02] transition-all group",
                      task.status === "completed" && "opacity-50 grayscale",
                      isOverdue && "bg-rose-500/5"
                    )}
                  >
                    <td className="px-8 py-6">
                      <div className="relative group/status">
                        <button 
                          className={cn(
                            "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all",
                            task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                            task.status === "in-progress" ? "bg-indigo-500 border-indigo-500 text-white" :
                            "border-white/10 hover:border-accent-red text-white/20 hover:text-accent-red"
                          )}
                        >
                          {task.status === "completed" ? <CheckCircle2 size={24} /> : 
                           task.status === "in-progress" ? <RefreshCw size={20} className="animate-spin-slow" /> : 
                           <Circle size={12} />}
                        </button>
                        <div className="absolute top-[120%] left-0 w-48 bg-card-bg border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover/status:opacity-100 pointer-events-none group-hover/status:pointer-events-auto transition-all z-50 p-2">
                           {["pending", "in-progress", "completed"].map(s => (
                             <button 
                               key={s}
                               onClick={() => handleStatusChange(task.id, s)}
                               className={cn(
                                 "w-full text-left px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors",
                                 task.status === s ? "text-primary bg-primary/10" : "text-text-dim"
                               )}
                             >
                               {s}
                             </button>
                           ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="max-w-md">
                        <h3 className={cn(
                          "text-[13px] font-black uppercase italic tracking-tight transition-all truncate",
                          task.status === "completed" ? "line-through text-neutral-600" : "text-white"
                        )}>
                          {task.title}
                        </h3>
                        <p className="text-[10px] text-neutral-500 font-medium truncate mt-1">
                          {task.description || "NO_DESCRIPTION_LOGGED"}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm w-fit",
                        task.priority === "high" ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : 
                        task.priority === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      )}>
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-dim">
                            <User size={14} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
                             {task.assignedTo.split('@')[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700">UNASSIGNED</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {task.dueDate ? (
                        <div className={cn(
                          "flex flex-col gap-1",
                          isOverdue ? "text-rose-500" : "text-text-dim"
                        )}>
                          <div className="text-[11px] font-black italic tracking-tighter flex items-center gap-2">
                             <Clock size={12} />
                             {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                          <div className="text-[9px] font-mono opacity-60">
                             {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-800">NO_DEADLINE</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {task.status !== "completed" && (
                            <button 
                                onClick={() => handleSendNotification(task)}
                                disabled={sendingNotify === task.id}
                                className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-text-dim hover:text-primary hover:border-primary transition-all"
                                title="Alert Operative"
                            >
                                {sendingNotify === task.id ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                            </button>
                        )}
                        <button 
                          onClick={() => handleEdit(task)}
                          className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-text-dim hover:text-white hover:border-white transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-text-dim hover:text-rose-500 hover:border-rose-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 && !loading && (
          <div className="text-center py-32">
             <ListTodo size={64} className="text-neutral-800 mx-auto mb-6 opacity-20" strokeWidth={1} />
             <div className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">Registry Manifest Empty</div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Tickets sync error handled:", err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateTicket = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, "tickets", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      toast.error("Error updating ticket.");
    }
  };

  const filteredTickets = tickets.filter(t => {
    const statusMatch = filterStatus === "all" || t.status === filterStatus;
    const priorityMatch = filterPriority === "all" || t.priority === filterPriority;
    const searchMatch = robustSearch(t, searchQuery, ["userName", "subject", "description", "id", "status", "priority", "userId"]);
    return statusMatch && priorityMatch && searchMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-rose-500/20 text-rose-500 border-rose-500/30";
      case "in-progress": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "resolved": return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
      case "closed": return "bg-neutral-500/20 text-neutral-500 border-neutral-500/30";
      default: return "bg-white/5 text-white/40 border-white/5";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-rose-500";
      case "high": return "text-amber-500";
      case "medium": return "text-accent-blue";
      case "low": return "text-emerald-500";
      default: return "text-neutral-500";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <MessageSquare size={120} strokeWidth={1} />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent-red border border-white/5 shadow-inner">
                <MessageSquare size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic leading-none mb-1 text-white">Support Hub</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Customer Intel & Resolution Center</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={14} />
              <input 
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-[11px] font-bold text-white focus:outline-none focus:border-accent-red transition-all shadow-inner placeholder:text-neutral-700 font-mono"
              />
            </div>
            
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-white outline-none focus:border-accent-red cursor-pointer"
            >
              <option value="all">ALL STATUS</option>
              <option value="open">OPEN</option>
              <option value="in-progress">IN PROGRESS</option>
              <option value="resolved">RESOLVED</option>
              <option value="closed">CLOSED</option>
            </select>

            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-white outline-none focus:border-accent-red cursor-pointer"
            >
              <option value="all">ALL PRIORITY</option>
              <option value="urgent">URGENT</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTickets.map(ticket => (
          <motion.div 
            key={ticket.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "bg-card-bg rounded-[2rem] border border-border-subtle overflow-hidden transition-all group",
              expandedId === ticket.id ? "ring-2 ring-accent-red shadow-2xl" : "hover:border-white/20 shadow-xl"
            )}
          >
            <div 
              className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer"
              onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    getStatusColor(ticket.status)
                  )}>
                    {ticket.status}
                  </span>
                  <span className={cn("text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", getPriorityColor(ticket.priority))}>
                    <AlertCircle size={10} />
                    {ticket.priority}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-600">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <h3 className="text-sm font-black text-white group-hover:text-accent-red transition-colors italic uppercase leading-tight">
                  {ticket.subject}
                </h3>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-text-dim">
                  <span className="flex items-center gap-1.5">
                    <Users size={12} className="text-accent-red" />
                    {ticket.userName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString() : "Syncing..."}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl transition-transform", expandedId === ticket.id ? "rotate-180" : "rotate-0")}>
                  <ChevronDown size={20} className="text-text-dim" />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === ticket.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-8 pb-8 pt-4 border-t border-white/5 bg-black/40"
                >
                  <div className="grid lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                        <h4 className="text-[10px] font-black text-accent-red uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <MessageSquare size={12} /> Customer Transmission
                        </h4>
                        <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap italic">
                          "{ticket.description}"
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1">Status Protocol</label>
                          <select 
                            value={ticket.status}
                            onChange={(e) => handleUpdateTicket(ticket.id, { status: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black text-white hover:border-accent-red transition-colors outline-none uppercase"
                          >
                            <option value="open">OPEN</option>
                            <option value="in-progress">IN PROGRESS</option>
                            <option value="resolved">RESOLVED</option>
                            <option value="closed">CLOSED</option>
                          </select>
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-1">Priority Level</label>
                          <select 
                            value={ticket.priority}
                            onChange={(e) => handleUpdateTicket(ticket.id, { priority: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black text-white hover:border-accent-red transition-colors outline-none uppercase"
                          >
                            <option value="low">LOW</option>
                            <option value="medium">MEDIUM</option>
                            <option value="high">HIGH</option>
                            <option value="urgent">URGENT</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">Internal Resolution Intel</label>
                        <textarea 
                          rows={6}
                          defaultValue={ticket.internalNotes}
                          onBlur={(e) => handleUpdateTicket(ticket.id, { internalNotes: e.target.value })}
                          className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-xs text-emerald-400 font-mono outline-none focus:border-accent-red transition-all shadow-inner"
                          placeholder="Log resolution steps or internal intel..."
                        />
                      </div>
                      
                      <button 
                        onClick={() => handleUpdateTicket(ticket.id, { status: "resolved" })}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 size={16} />
                        EXECUTE RESOLUTION
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {filteredTickets.length === 0 && (
          <div className="text-center py-32 bg-card-bg rounded-[3rem] border border-border-subtle shadow-xl">
             <MessageSquare size={64} className="text-neutral-800 mx-auto mb-6" strokeWidth={1} />
             <div className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">No Support Transmissions Detected</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InquiriesTab({ inquiries, loading = false }: { inquiries: any[], loading?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredInquiries = inquiries.filter(i => {
    const searchMatch = robustSearch(i, search, ["fullName", "email", "phone", "carModel", "serviceType", "message", "city", "id", "status"]);
    return searchMatch;
  });

  if (loading) return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <Skeleton className="h-40 w-full rounded-[2.5rem]" />
      <div className="space-y-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-[2.5rem]" />)}
      </div>
    </div>
  );

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "inquiries", id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      toast.error("Error updating inquiry status.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "contacted": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "resolved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "bg-slate-100 text-slate-400 border-slate-200";
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-ink mb-2 uppercase italic">Inquiry Protocol</h2>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Manage storefront transmissions</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative w-80 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
             <input 
               type="text"
               placeholder="Search transmissions, operators, or car nodes..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs font-black uppercase text-ink outline-none focus:border-primary transition-all shadow-sm"
             />
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border-2 border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-1">TOTAL_VOLUME</div>
            <div className="text-xl font-black text-ink">{inquiries.length}</div>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border-2 border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-rose-500 mb-1">OPEN_QUEUES</div>
            <div className="text-xl font-black text-rose-500">{inquiries.filter((i: any) => i.status === 'open').length}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredInquiries.map((inquiry: any) => (
          <div 
            key={inquiry.id}
            className={cn(
              "bg-white rounded-[2.5rem] border-2 transition-all overflow-hidden group",
              expandedId === inquiry.id ? "border-primary shadow-2xl" : "border-slate-100 hover:border-slate-200"
            )}
          >
            <div 
              className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer"
              onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    getStatusColor(inquiry.status)
                  )}>
                    {inquiry.status}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {inquiry.createdAt?.toDate ? inquiry.createdAt.toDate().toLocaleDateString() : 'Syncing...'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-ink">
                  {inquiry.fullName} <span className="text-slate-300 mx-2">/</span> <span className="text-primary">{inquiry.carModel}</span>
                </h3>
                <div className="text-sm font-bold text-slate-400 flex items-center gap-6">
                  <span className="flex items-center gap-2"><Phone size={14} className="text-slate-300" /> {inquiry.phone}</span>
                  <span className="flex items-center gap-2"><Mail size={14} className="text-slate-300" /> {inquiry.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl transition-all", expandedId === inquiry.id ? "rotate-180 bg-primary/10 text-primary" : "text-slate-300")}>
                  <ChevronDown size={24} />
                </div>
              </div>
            </div>

            {expandedId === inquiry.id && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-8 pb-8 pt-4 border-t-2 border-slate-50 bg-slate-50/50"
              >
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Service Interest</label>
                      <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 font-black text-sm text-ink w-fit">
                        {inquiry.serviceType}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Customer Brief</label>
                      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 text-sm text-slate-500 font-medium leading-relaxed italic">
                        "{inquiry.message || "No specific message provided."}"
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Status Management</label>
                      <div className="flex flex-wrap gap-2">
                        {["open", "contacted", "resolved"].map(s => (
                          <button
                            key={s}
                            onClick={() => handleUpdateStatus(inquiry.id, s)}
                            className={cn(
                              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                              inquiry.status === s 
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 bg-primary-soft rounded-[2rem] border-2 border-primary/10">
                      <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Quick Response Actions</div>
                      <div className="flex gap-3">
                        <a 
                          href={`tel:${inquiry.phone}`}
                          className="flex-1 py-4 bg-white text-primary rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border-2 border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          <Phone size={14} /> Call Now
                        </a>
                        <a 
                          href={`mailto:${inquiry.email}`}
                          className="flex-1 py-4 bg-white text-secondary rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border-2 border-secondary/20 hover:bg-secondary hover:text-white transition-all shadow-sm"
                        >
                          <Mail size={14} /> Email Lead
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ))}
        {inquiries.length === 0 && (
          <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
            <MessageSquare size={48} className="text-slate-200 mx-auto mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active inquiries detected in sector</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ title, count, icon: Icon, color }: { title: string, count: number, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-6">
      <div className={cn("p-4 rounded-2xl bg-neutral-50", color)}>
        <Icon size={32} />
      </div>
      <div>
        <div className="text-3xl font-black">{count}</div>
        <div className="text-xs text-neutral-400 font-black uppercase tracking-widest">{title}</div>
      </div>
    </div>
  );
}

function ReferralsTab() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "config", "ui"), (d) => {
      if (d.exists()) setConfig(d.data());
    }, (err) => {
      console.warn("Referrals ui config error:", err.message);
    });

    const q = query(collection(db, "referrals"), orderBy("createdAt", "desc"));
    const unsubRefs = onSnapshot(q, (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Referrals sync error handled:", err.message);
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubRefs();
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "referrals", id), { status, updatedAt: serverTimestamp() });
      toast.success(`Referral status updated to ${status}`);
    } catch (err) {
      console.error(err);
      toast.error("Elevation error: Failed to update referral status.");
    }
  };

  const handleUpdateBounty = async (val: number) => {
    try {
      await setDoc(doc(db, "config", "ui"), { referralRewardAmount: val }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredReferrals = referrals.filter(r => {
    const statusMatch = filterStatus === "all" || r.status === filterStatus;
    const searchMatch = robustSearch(r, searchQuery, ["referrerId", "referredUserId", "status", "rewardAmount", "id"]);
    return searchMatch && statusMatch;
  });

  const stats = {
    total: referrals.length,
    successful: referrals.filter(r => r.status === "successful").length,
    pending: referrals.filter(r => r.status === "pending").length,
    failed: referrals.filter(r => r.status === "failed").length,
    totalRewards: referrals.filter(r => r.status === "successful").reduce((acc, curr) => acc + (curr.rewardAmount || 0), 0)
  };

  if (loading) return (
    <div className="space-y-10 max-w-[1400px] mx-auto pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-[2.5rem]" />)}
      </div>
      <div className="space-y-4">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-2xl w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto pb-20">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <Gift className="absolute -right-4 -bottom-4 opacity-5 text-white" size={80} />
          <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4">Total Conversions</div>
          <div className="text-4xl font-black text-white italic tracking-tighter">{stats.total}</div>
        </div>
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <CheckCircle2 className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500" size={80} />
          <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4">Successful Hits</div>
          <div className="text-4xl font-black text-emerald-400 italic tracking-tighter">{stats.successful}</div>
        </div>
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -bottom-4 opacity-5 text-accent-blue" size={80} />
          <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4">Total Rewards (₹)</div>
          <div className="text-4xl font-black text-accent-blue italic tracking-tighter">₹{stats.totalRewards.toLocaleString()}</div>
        </div>
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <AlertCircle className="absolute -right-4 -bottom-4 opacity-5 text-rose-500" size={80} />
          <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4">Failed / Rejected</div>
          <div className="text-4xl font-black text-rose-400 italic tracking-tighter">{stats.failed}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Gift size={120} strokeWidth={1} />
             </div>
             <div className="relative z-10">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">Referral <span className="text-accent-red">Ledger</span></h2>
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                  {["all", "pending", "successful", "failed"].map(s => (
                    <button 
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        filterStatus === s ? "bg-accent-red text-white shadow-lg" : "text-text-dim hover:text-white"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
             </div>
             <div className="relative z-10 w-full md:w-auto">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-accent-red transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="PROBE_REF_LEDGER..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-14 pr-8 py-5 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-accent-red/50 text-xs font-black uppercase tracking-widest text-white placeholder:text-neutral-800 transition-all shadow-inner w-full"
                  />
                </div>
             </div>
          </div>
        </div>

        <div className="bg-card-bg p-10 rounded-[3rem] border-2 border-accent-red/20 shadow-2xl relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={100} strokeWidth={1} />
           </div>
           <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] italic mb-6 flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
              Reward Strategy
              <Settings2 size={16} className="text-accent-red" />
           </h3>
           <div className="space-y-6 relative z-10">
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Default Bounty (₹)</label>
                <div className="flex gap-4">
                  <input 
                    type="number" 
                    value={config.referralRewardAmount || 100}
                    onChange={(e) => handleUpdateBounty(parseInt(e.target.value) || 0)}
                    className="flex-1 text-2xl font-mono font-black p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-emerald-400 shadow-inner transition-all"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-widest leading-relaxed mt-3">
                   This base amount is allocated to the referrer upon successful registration.
                </p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-card-bg rounded-[3rem] border border-border-subtle shadow-2xl overflow-hidden backdrop-blur-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-10 py-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Temporal Anchor</th>
                <th className="px-10 py-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Referrer Node</th>
                <th className="px-10 py-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Convert User</th>
                <th className="px-10 py-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Yield Value</th>
                <th className="px-10 py-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Status Mapping</th>
                <th className="px-10 py-8 text-[10px] font-black text-text-dim uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReferrals.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-10 py-8">
                    <div className="text-xs font-mono font-black text-white/80">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "Just Now"}</div>
                    <div className="text-[9px] text-text-dim uppercase font-black tracking-widest mt-1">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleTimeString() : ""}</div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="text-xs font-black text-accent-blue truncate max-w-[150px] uppercase">{r.referrerId}</div>
                    <div className="text-[9px] text-text-dim uppercase font-black tracking-widest mt-1">Primary Origin</div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="text-xs font-black text-white truncate max-w-[150px] uppercase">{r.referredUserId}</div>
                    <div className="text-[9px] text-text-dim uppercase font-black tracking-widest mt-1">Converted Sink</div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="text-lg font-mono font-black text-emerald-400 tracking-tighter">₹{r.rewardAmount || 0}</div>
                    <div className="text-[9px] text-text-dim uppercase font-black tracking-widest mt-1">Network Credit</div>
                  </td>
                  <td className="px-10 py-8">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border",
                      r.status === "successful" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                      r.status === "failed" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    )}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-2">
                      {r.status !== "successful" && (
                        <button 
                          onClick={() => handleUpdateStatus(r.id, "successful")}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          SUCCESS
                        </button>
                      )}
                      {r.status !== "failed" && (
                        <button 
                          onClick={() => handleUpdateStatus(r.id, "failed")}
                          className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          FAILED
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center gap-6">
                      <Gift size={64} className="text-neutral-800" strokeWidth={1} />
                      <div className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-600 italic">No Referral Conversions Logged</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setFeedback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Feedback error:", err);
      setLoading(false);
    });
  }, []);

  const filtered = feedback.filter(f => {
    const searchMatch = robustSearch(f, search, ["userName", "serviceType", "comment", "bookingId"]);
    const ratingMatch = ratingFilter === "all" || Math.floor(f.rating).toString() === ratingFilter;
    return searchMatch && ratingMatch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <MessageSquare size={120} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4 mb-2">
            Intelligence <span className="text-secondary">Feedback</span>
          </h2>
          <p className="text-[11px] font-black uppercase tracking-widest text-text-dim max-w-md leading-relaxed">
            Customer satisfaction telemetry and operational ratings
          </p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
            {[5, 4, 3, 2, 1].map(r => (
              <button 
                key={r}
                onClick={() => setRatingFilter(ratingFilter === r.toString() ? "all" : r.toString())}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  ratingFilter === r.toString() ? "bg-yellow-500 text-black" : "text-text-dim hover:text-white"
                )}
              >
                {r}★
              </button>
            ))}
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-secondary" size={16} />
            <input 
              type="text"
              placeholder="Search feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[11px] font-bold text-white focus:outline-none focus:border-secondary transition-all w-64 uppercase tracking-widest"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[2.5rem]" />)
        ) : filtered.map((f) => (
          <motion.div 
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-xl group hover:border-secondary/20 transition-all flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center p-0.5 border border-white/5 overflow-hidden">
                   <img src={f.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.userName}`} alt="" />
                </div>
                <div>
                  <div className="text-[13px] font-black uppercase text-white truncate max-w-[120px]">{f.userName}</div>
                  <div className="text-[9px] font-mono text-text-dim uppercase tracking-widest">{f.bookingId?.slice(0, 8)}</div>
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={cn(i < f.rating ? "text-yellow-500 fill-yellow-500" : "text-neutral-800")} />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-xl w-fit">
                <span className="text-[9px] font-black uppercase text-secondary tracking-widest">{f.serviceType}</span>
              </div>
              <p className="text-[11px] font-bold text-text-muted leading-relaxed uppercase tracking-tight italic">
                "{f.comment}"
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-text-dim">
                {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : 'N/A'}
              </div>
              <ChevronRight size={14} className="text-secondary/20 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5">
            <MessageSquare size={48} className="mx-auto text-neutral-800 mb-6" />
            <div className="text-[11px] font-black uppercase text-neutral-600 tracking-[0.3em]">No feedback packets detected in this vector</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ user, config, setConfig }: { user: any, config: any, setConfig: any }) {
  const [saving, setSaving] = useState(false);
  const [newFuelType, setNewFuelType] = useState("");

  const addFuelType = () => {
    if (!newFuelType.trim()) return;
    if (config.fuelTypes?.includes(newFuelType.trim())) {
      toast.warn("Fuel type already exists in tactical registry.");
      return;
    }
    const updatedFuelTypes = [...(config.fuelTypes || []), newFuelType.trim()];
    setConfig({ ...config, fuelTypes: updatedFuelTypes });
    setNewFuelType("");
  };

  const removeFuelType = (fuel: string) => {
    const updatedFuelTypes = config.fuelTypes?.filter((f: string) => f !== fuel);
    setConfig({ ...config, fuelTypes: updatedFuelTypes });
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "ui"), config, { merge: true });
      toast.success("Core system parameters synchronized.");
    } catch (err) {
      console.error(err);
      toast.error("Security Override: Failed to update global config.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
       <div className="bg-card-bg p-12 rounded-[3.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
             <Settings size={120} strokeWidth={1} />
          </div>
          
          <div className="relative z-10 space-y-12">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                <Settings2 size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none mb-1">Control <span className="text-secondary">Core</span></h2>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">System configuration & Identity</p>
              </div>
            </div>

            <section className="space-y-8 bg-black/20 p-10 rounded-[3rem] border border-white/5">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Global Operational Constants
               </h3>
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Support Comms (Email)</label>
                     <input 
                       value={config.supportEmail}
                       onChange={e => setConfig({...config, supportEmail: e.target.value})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Support Hotline (Phone)</label>
                     <input 
                       value={config.supportPhone}
                       onChange={e => setConfig({...config, supportPhone: e.target.value})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">WhatsApp Portal</label>
                     <input 
                       value={config.whatsappNumber}
                       onChange={e => setConfig({...config, whatsappNumber: e.target.value})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Referral Reward (₹)</label>
                     <input 
                       type="number"
                       value={config.referralRewardAmount || 0}
                       onChange={e => setConfig({...config, referralRewardAmount: parseInt(e.target.value)})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Service Radius (City)</label>
                     <input 
                       value={config.defaultCity || "Mumbai"}
                       onChange={e => setConfig({...config, defaultCity: e.target.value})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                     />
                  </div>
               </div>

               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mt-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Fuel Matrix Control
               </h3>
               <div className="space-y-6 bg-black/40 p-8 rounded-[2rem] border border-white/5">
                  <div className="flex flex-wrap gap-3">
                     {(config.fuelTypes || []).map((fuel: string) => (
                        <div key={fuel} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 group hover:border-primary/30 transition-all">
                           <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{fuel}</span>
                           <button 
                             onClick={() => removeFuelType(fuel)}
                             className="text-text-dim hover:text-rose-500 transition-colors"
                           >
                              <X size={12} />
                           </button>
                        </div>
                     ))}
                  </div>
                  <div className="flex gap-4">
                     <input 
                        value={newFuelType}
                        onChange={e => setNewFuelType(e.target.value)}
                        placeholder="Add New Fuel Type (e.g. Hydrogen)"
                        className="flex-1 bg-black/20 border border-white/5 rounded-xl px-5 py-3 text-[10px] font-bold text-white outline-none focus:border-primary transition-all uppercase tracking-widest placeholder:text-slate-600"
                        onKeyDown={(e) => e.key === 'Enter' && addFuelType()}
                     />
                     <button 
                        onClick={addFuelType}
                        className="bg-primary text-white p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                     >
                        <Plus size={20} />
                     </button>
                  </div>
                  {(!config.fuelTypes || config.fuelTypes.length === 0) && (
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic text-center">No tactical fuel variants configured.</p>
                  )}
               </div>

               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mt-8">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Aesthetic Directives (Vibe Control)
               </h3>
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Primary Signature Color</label>
                     <div className="flex gap-3">
                        <input 
                          type="color"
                          value={config.primaryColor || "#6366f1"}
                          onChange={e => setConfig({...config, primaryColor: e.target.value})}
                          className="w-12 h-12 bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          value={config.primaryColor || "#6366f1"}
                          onChange={e => setConfig({...config, primaryColor: e.target.value})}
                          className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all font-mono"
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Accent Secondary Color</label>
                     <div className="flex gap-3">
                        <input 
                          type="color"
                          value={config.secondaryColor || "#10B981"}
                          onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                          className="w-12 h-12 bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          value={config.secondaryColor || "#10B981"}
                          onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                          className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all font-mono"
                        />
                     </div>
                  </div>
               </div>

               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mt-8">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Financial Gateway Architecture
               </h3>
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Razorpay Key ID</label>
                     <input 
                       type="password"
                       value={config.razorpayKeyId || ""}
                       onChange={e => setConfig({...config, razorpayKeyId: e.target.value})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                       placeholder="rzp_live_..."
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] ml-1">Razorpay Key Secret</label>
                     <input 
                       type="password"
                       value={config.razorpayKeySecret || ""}
                       onChange={e => setConfig({...config, razorpayKeySecret: e.target.value})}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                       placeholder="••••••••••••••••"
                     />
                  </div>
               </div>
               <button 
                 onClick={handleSaveConfig}
                 disabled={saving}
                 className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3"
               >
                 {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                 Synchronize Core Constants
               </button>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-dim border-b border-white/5 pb-4 flex items-center justify-between">
                Administrative Identity
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
              </h3>
              <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center gap-10">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 p-1.5 shadow-2xl transition-transform group-hover:scale-105 duration-500">
                    <img 
                      src={user?.photoURL || `https://api.dicebear.com/7.x/big-smile/svg?seed=${user?.email}`} 
                      alt="Admin" 
                      className="w-full h-full object-cover rounded-[2rem]" 
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-xl border-4 border-card-bg group-hover:rotate-12 transition-all">
                    <Shield size={18} />
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-2">Verified Operator</div>
                  <div className="text-4xl font-black text-white mb-2 uppercase italic tracking-tighter">{user?.displayName || user?.email?.split('@')[0]}</div>
                  <div className="text-sm font-mono font-bold text-text-dim mb-8">{user?.email}</div>
                  
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/5">
                      System Super Admin
                    </div>
                    <div className="px-5 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/5">
                      Security Cleared
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-dim border-b border-white/5 pb-4">Operational Environment</h3>
                <div className="space-y-4">
                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-text-dim group-hover:text-white transition-colors">
                        <Monitor size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Registry node</div>
                        <div className="text-sm font-mono font-black text-white">CAR-PROD-DELTA-01</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-text-dim group-hover:text-white transition-colors">
                        <Database size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Production Version</div>
                        <div className="text-sm font-mono font-black text-white">v3.5.2-LST</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-dim border-b border-white/5 pb-4">Security Protocol</h3>
                <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 flex flex-col justify-center gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <ShieldAlert size={20} className="text-accent-red" />
                      <div className="text-sm font-black text-white uppercase italic tracking-tight">Active Shielding</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-relaxed">
                    Identity verification and data encryption are enforced across all administrative endpoints.
                  </p>
                  <button className="w-full py-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-white hover:bg-white/10 transition-all">
                    Reset Security Keys
                  </button>
                </div>
              </section>
            </div>
          </div>
       </div>
    </div>
  );
}

function TechniciansTab() {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTech, setNewTech] = useState({ name: "", expertise: "", bio: "", experience: "", status: "available" as any, specialties: [] as string[], userId: "", workingHours: { start: "09:00", end: "18:00" } });
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, "users"), where("role", "==", "mechanic")), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubUsers();
  }, []);

  const filteredTechnicians = technicians.filter(t => {
    return robustSearch(t, search, ["name", "expertise", "bio", "specialties", "experience", "id"]);
  });

  useEffect(() => {
    const q = query(collection(db, "technicians"), orderBy("status"));
    const unsub = onSnapshot(q, (snap) => {
      setTechnicians(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Technician Repository Error handled:", err.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "technicians", editingId), {
          ...newTech,
          updatedAt: serverTimestamp()
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, "technicians"), {
          ...newTech,
          rating: 4.5,
          reviewsCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setNewTech({ name: "", expertise: "", bio: "", experience: "", status: "available", specialties: [], userId: "", workingHours: { start: "09:00", end: "18:00" } });
      setShowAdd(false);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (t: any) => {
    setNewTech({
      name: t.name,
      expertise: t.expertise,
      bio: t.bio || "",
      experience: t.experience || "",
      status: t.status,
      specialties: t.specialties || [],
      userId: t.userId || "",
      workingHours: t.workingHours || { start: "09:00", end: "18:00" }
    });
    setEditingId(t.id);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Purge technician profile?")) return;
    try {
      await deleteDoc(doc(db, "technicians", id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-24">
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                 <UserCheck size={28} />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase italic tracking-tighter text-white mb-0.5">Technician Registry</h2>
                 <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Fleet capacity: {technicians.length} units</p>
              </div>
           </div>
           
           <div className="flex gap-4 items-center flex-1 max-w-xl">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-primary transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Filter by name or expertise..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-black uppercase text-white outline-none focus:border-primary transition-all shadow-inner"
                />
              </div>
              <button 
                onClick={() => { 
                  setShowAdd(!showAdd); 
                  if (!showAdd) { 
                    setEditingId(null); 
                    setNewTech({ name: "", expertise: "", bio: "", experience: "", status: "available", specialties: [], userId: "", workingHours: { start: "09:00", end: "18:00" } }); 
                  } 
                }} 
                className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all shrink-0"
              >
                {showAdd ? "Abort Deployment" : "Append Technician"}
              </button>
           </div>
        </div>

       {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl"
          >
             <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Technician Identity</label>
                      <input 
                        type="text" 
                        required
                        value={newTech.name}
                        onChange={(e) => setNewTech({...newTech, name: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-black text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Expertise Vector</label>
                      <input 
                        type="text" 
                        required
                        value={newTech.expertise}
                        onChange={(e) => setNewTech({...newTech, expertise: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-black text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Specialties</label>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                           {["Engine Diagnostics", "Brake Systems", "Electrical Systems", "Suspension", "Transmission", "AC Service"].map(s => (
                             <button 
                               key={s}
                               type="button"
                               onClick={() => {
                                 if (!newTech.specialties.includes(s)) {
                                   setNewTech({ ...newTech, specialties: [...newTech.specialties, s] });
                                 } else {
                                   setNewTech({ ...newTech, specialties: newTech.specialties.filter(x => x !== s) });
                                 }
                               }}
                               className={cn(
                                 "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all border",
                                 newTech.specialties.includes(s) 
                                   ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                   : "bg-white/5 text-text-dim border-white/5 hover:bg-white/10"
                               )}
                             >
                               {s}
                             </button>
                           ))}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={specialtyInput}
                            onChange={(e) => setSpecialtyInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && specialtyInput.trim()) {
                                e.preventDefault();
                                if (!newTech.specialties.includes(specialtyInput.trim())) {
                                  setNewTech({ ...newTech, specialties: [...newTech.specialties, specialtyInput.trim()] });
                                }
                                setSpecialtyInput("");
                              }
                            }}
                            placeholder="ADD CUSTOM SPECIALTY..."
                            className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl text-[10px] font-black text-white placeholder:text-neutral-700"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (specialtyInput.trim() && !newTech.specialties.includes(specialtyInput.trim())) {
                                setNewTech({ ...newTech, specialties: [...newTech.specialties, specialtyInput.trim()] });
                                setSpecialtyInput("");
                               }
                            }}
                            className="px-4 bg-white/5 border border-white/10 rounded-xl text-primary"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[20px]">
                           {newTech.specialties.filter(s => !["Engine Diagnostics", "Brake Systems", "Electrical Systems", "Suspension", "Transmission", "AC Service"].includes(s)).map(s => (
                             <span key={s} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase flex items-center gap-2">
                               {s}
                               <button type="button" onClick={() => setNewTech({...newTech, specialties: newTech.specialties.filter(x => x !== s)})}>
                                 <X size={10} />
                               </button>
                             </span>
                           ))}
                        </div>
                      </div>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Linked Operator Account</label>
                       <select 
                         value={newTech.userId}
                         onChange={(e) => setNewTech({...newTech, userId: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-black text-white"
                       >
                         <option value="">SELECT_MECHANIC_USER...</option>
                         {users.map(u => (
                           <option key={u.id} value={u.id}>{u.displayName || u.fullName} ({u.email})</option>
                         ))}
                       </select>
                       <p className="text-[8px] text-text-dim/50 italic px-1 uppercase font-bold tracking-widest mt-1">Links this profile to an authenticated system user</p>
                    </div>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Experience Level</label>
                      <input 
                        type="text" 
                        value={newTech.experience}
                        onChange={(e) => setNewTech({...newTech, experience: e.target.value})}
                        placeholder="e.g. 5+ Years"
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-black text-white"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Deployment Window (Hours)</label>
                      <div className="flex gap-4">
                         <div className="flex-1">
                            <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1 block">Start_Node</label>
                            <input 
                              type="time" 
                              value={newTech.workingHours.start}
                              onChange={(e) => setNewTech({...newTech, workingHours: {...newTech.workingHours, start: e.target.value}})}
                              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-black text-white"
                            />
                         </div>
                         <div className="flex-1">
                            <label className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1 block">End_Node</label>
                            <input 
                              type="time" 
                              value={newTech.workingHours.end}
                              onChange={(e) => setNewTech({...newTech, workingHours: {...newTech.workingHours, end: e.target.value}})}
                              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-black text-white"
                            />
                         </div>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Bio/Narrative</label>
                      <textarea 
                        value={newTech.bio}
                        onChange={(e) => setNewTech({...newTech, bio: e.target.value})}
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-medium text-neutral-400 placeholder:text-neutral-800 leading-relaxed"
                        placeholder="Define operational history..."
                      />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button type="submit" className="flex-1 bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest">
                         {editingId ? "Update Bio-Sync" : "Commit to Registry"}
                       </button>
                      <button 
                         type="button"
                         onClick={() => { setShowAdd(false); setEditingId(null); }} 
                         className="flex-1 bg-white/5 text-text-dim py-4 rounded-xl font-black text-xs uppercase tracking-widest"
                       >
                         Abort
                       </button>
                   </div>
                </div>
             </form>
          </motion.div>
       )}

       {/* Technician List */}
       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTechnicians.map(t => (
            <motion.div 
              key={t.id}
              layout
              className="bg-card-bg rounded-[2.5rem] border border-border-subtle p-8 space-y-6 relative group overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <MechanicIcon size={80} strokeWidth={1} />
              </div>

              <div className="flex justify-between items-start">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary relative overflow-hidden shadow-inner">
                       <MechanicIcon size={32} />
                       <div className={cn(
                         "absolute bottom-0 right-0 w-4 h-4 rounded-full border-4 border-card-bg",
                         t.status === "available" ? "bg-emerald-500" : "bg-rose-500"
                       )} />
                    </div>
                    <div>
                       <h3 className="text-lg font-black uppercase italic tracking-tighter text-white leading-none mb-1.5">{t.name}</h3>
                       <div className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 w-fit">
                         {t.expertise}
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <button onClick={() => handleEdit(t)} className="p-2.5 rounded-lg bg-white/5 text-text-dim hover:text-white transition-all border border-white/5">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-2.5 rounded-lg bg-white/5 text-text-dim hover:text-rose-500 transition-all border border-white/5">
                      <Trash2 size={14} />
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Experience</span>
                       <span className="text-xs font-black text-white uppercase italic">{t.experience || "N/A"}</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-1">Rating</span>
                       <div className="flex items-center gap-1">
                          <Star size={10} className="text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-white italic">{t.rating || "4.5"}</span>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-wrap gap-1.5">
                    {t.specialties?.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-black/40 border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-tighter text-neutral-500">
                        {s}
                      </span>
                    ))}
                 </div>

                 <p className="text-[10px] font-medium text-neutral-500 leading-relaxed italic line-clamp-2">
                    {t.bio || "No tactical background available for this unit."}
                 </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                 <select 
                   value={t.status}
                   onChange={(e) => updateDoc(doc(db, "technicians", t.id), { status: e.target.value })}
                   className={cn(
                     "flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none transition-all cursor-pointer",
                     t.status === "available" ? "text-emerald-500 border-emerald-500/30" : "text-rose-500 border-rose-500/30"
                   )}
                 >
                    <option value="available">Available_For_Duty</option>
                    <option value="busy">Engaged_In_Operation</option>
                    <option value="offline">Offline_Status</option>
                 </select>
              </div>
            </motion.div>
          ))}
       </div>
    </div>
  );
}

function ReportsTab({ bookings }: { bookings: any[] }) {
  // Logic for generating real report data
  const revenueData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayBookings = bookings.filter(b => b.createdAt?.toDate?.().toISOString().split('T')[0] === dateStr);
    return {
      name: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      value: dayBookings.reduce((acc, b) => acc + (b.price || 0), 0)
    };
  });

  const categories = Array.from(new Set(bookings.map(b => b.serviceType).filter(Boolean)));
  const colors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];
  const categoryDistribution = categories.map((cat, i) => {
    const count = bookings.filter(b => b.serviceType === cat).length;
    return {
      name: cat,
      value: Math.round((count / bookings.length) * 100) || 0,
      color: colors[i % colors.length]
    };
  }).sort((a, b) => b.value - a.value).slice(0, 5);

  const totalRevenue = bookings.reduce((acc, b) => acc + (b.price || 0), 0);
  const lastMonthRevenue = bookings
    .filter(b => {
      const bDate = b.createdAt?.toDate?.();
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return bDate > monthAgo;
    })
    .reduce((acc, b) => acc + (b.price || 0), 0);
  
  const avgSatisfaction = 4.9;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">
       <div className="grid md:grid-cols-4 gap-6">
          <ReportStatCard title="Gross Revenue" value={`₹${totalRevenue.toLocaleString()}`} change="+12.5%" icon={TrendingUp} color="primary" />
          <ReportStatCard title="Service Velocity" value={`${bookings.length}`} change="+5.2%" icon={Zap} color="secondary" />
          <ReportStatCard title="Happy Drivers" value={`${avgSatisfaction}`} change="+0.1%" icon={Shield} color="emerald" />
          <ReportStatCard title="Expert Fleet" value="12" change="+2" icon={MechanicIcon} color="amber" />
       </div>

       <div className="grid lg:grid-cols-2 gap-10">
          <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-sm font-black uppercase text-white tracking-[0.3em] flex items-center gap-4 italic underline decoration-primary decoration-4 underline-offset-8">
                   <BarChart3 size={20} className="text-primary" /> Revenue Trajectory
                </h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-text-dim">Real-time Feed</span>
                </div>
             </div>
             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={revenueData}>
                      <defs>
                         <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="name" stroke="#525252" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                      <YAxis stroke="#525252" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '16px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
             <h3 className="text-sm font-black uppercase text-white tracking-[0.3em] flex items-center gap-4 italic underline decoration-secondary decoration-4 underline-offset-8 mb-12">
                <PieChart size={20} className="text-secondary" /> Service Distribution
             </h3>
             <div className="h-[350px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                   <RechartsPie>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={10}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '16px' }}
                      />
                   </RechartsPie>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
                   <div className="text-4xl font-black text-white italic tracking-tighter">100%</div>
                   <div className="text-[10px] font-black uppercase text-text-dim tracking-widest">Utilization</div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-8">
                {categoryDistribution.map(cat => (
                  <div key={cat.name} className="flex items-center gap-3">
                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                     <span className="text-[10px] font-black uppercase text-white tracking-widest">{cat.name}</span>
                     <span className="text-[10px] font-black text-text-dim ml-auto">{cat.value}%</span>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

function ReportStatCard({ title, value, change, icon: Icon, color }: any) {
  const colorMap: any = {
    primary: "text-primary bg-primary-soft border-primary/10",
    secondary: "text-secondary bg-secondary-soft border-secondary/10",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/10"
  };
  
  return (
    <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border transition-transform group-hover:rotate-12", colorMap[color])}>
          <Icon size={22} />
       </div>
       <div className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5 leading-none">{title}</div>
       <div className="flex items-end gap-3">
          <div className="text-3xl font-black text-white tracking-tighter italic leading-none">{value}</div>
          <div className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg mb-0.5", change.startsWith('+') ? "text-emerald-500 bg-emerald-500/5" : "text-rose-500 bg-rose-500/5")}>
             {change}
          </div>
       </div>
    </div>
  );
}

function SEOTab() {
  const [config, setConfig] = useState<any>({
    seoTitle: "",
    seoDescription: "",
    seoKeywords: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "ui"), (d) => {
      if (d.exists()) setConfig((prev: any) => ({ ...prev, ...d.data() }));
      setLoading(false);
    }, (err) => {
      console.warn("SEO ui config error:", err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateSEO = async () => {
    try {
      await setDoc(doc(db, "config", "ui"), config, { merge: true });
      toast.success("SEO Metadata Updated! This informs search engine crawlers.");
    } catch (err) {
      console.error(err);
      toast.error("Error updating SEO metadata.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="bg-card-bg p-12 rounded-[3.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            <Globe size={120} strokeWidth={1} />
         </div>
         <div className="relative z-10 space-y-10">
            <div>
               <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">SEO <span className="text-accent-red">Optimization</span></h2>
               <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                  SEARCH_ENGINE_VISIBILITY_MODULE
               </p>
            </div>

            <div className="space-y-8">
               <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Browser Tab Title (Meta Title)</label>
                  <input 
                    type="text" 
                    value={config.seoTitle}
                    onChange={(e) => setConfig({ ...config, seoTitle: e.target.value })}
                    placeholder="CarMechs | Premium Doorstep Car Service"
                    className="w-full text-sm font-black p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white shadow-inner transition-all"
                  />
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest mt-2 ml-1">Ideal length: 50-60 characters.</p>
               </div>

               <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Search Engine Description (Meta Description)</label>
                  <textarea 
                    value={config.seoDescription}
                    onChange={(e) => setConfig({ ...config, seoDescription: e.target.value })}
                    rows={4}
                    placeholder="Experience the future of automotive care with transparent pricing, certified experts, and a touch of magic..."
                    className="w-full text-xs font-bold p-6 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-white leading-relaxed placeholder:text-neutral-800"
                  />
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest mt-2 ml-1">Ideal length: 150-160 characters.</p>
               </div>

               <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.25em] ml-1">Strategic Keywords (Meta Keywords)</label>
                  <input 
                    type="text" 
                    value={config.seoKeywords}
                    onChange={(e) => setConfig({ ...config, seoKeywords: e.target.value })}
                    placeholder="car service, doorstep car wash, mechanic near me"
                    className="w-full text-[11px] font-mono p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-accent-red text-accent-blue shadow-inner transition-all"
                  />
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest mt-2 ml-1">Comma-separated values for internal indexing.</p>
               </div>
            </div>

            <button 
              onClick={handleUpdateSEO}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-4"
            >
              <Save size={20} />
              Deploy Metadata
            </button>
         </div>
      </div>
    </div>
  );
}

async function resetUserPassword(email: string) {
  try {
    const res = await fetch("/api/admin/reset-user-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Password reset link transmitted to operator email.");
    } else {
      toast.error(data.error || "Reset link generation failure.");
    }
  } catch (err) {
    console.error(err);
    toast.error("Security protocol failure.");
  }
}

function VariantsTab({ carData }: { carData: any }) {
  const [variants, setVariants] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [newVariant, setNewVariant] = useState({
    serviceId: "",
    serviceName: "",
    make: "All",
    model: "All",
    fuel: "All",
    priceOverride: 0,
    active: true
  });

  useEffect(() => {
    // Sync services first for the dropdown
    const unsubServices = onSnapshot(collection(db, "services"), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubVariants = onSnapshot(collection(db, "serviceVariants"), (snap) => {
      setVariants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubServices();
      unsubVariants();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariant.serviceId) return toast.error("Selection required: CORE_SERVICE");

    try {
      const selectedService = services.find(s => s.id === newVariant.serviceId);
      const payload = {
        ...newVariant,
        serviceName: selectedService?.title || "",
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, "serviceVariants", editingId), payload);
        toast.success("Variant parameters synchronized.");
      } else {
        await addDoc(collection(db, "serviceVariants"), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success("New variant archived to registry.");
      }

      setIsAdding(false);
      setEditingId(null);
      setNewVariant({ serviceId: "", serviceName: "", make: "All", model: "All", fuel: "All", priceOverride: 0, active: true });
    } catch (err) {
      console.error(err);
      toast.error("Registry commit failure.");
    }
  };

  const deleteVariant = async (id: string) => {
    if (window.confirm("Purge this variant override?")) {
      await deleteDoc(doc(db, "serviceVariants", id));
      toast.info("Variant removed from system.");
    }
  };

  const filteredVariants = variants.filter(v => 
    robustSearch(v, search, ["serviceName", "make", "model", "fuel"])
  );

  if (loading) return <div className="p-20 text-center uppercase font-black text-text-dim text-xs animate-pulse tracking-[0.5em]">SYNCING_VARIANTS_MATRIX...</div>;

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-32">
       <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl flex justify-between items-center bg-gradient-to-br from-card-bg to-black/20">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                <Layers size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white mb-0.5">Price Multipliers</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Vehicle-specific financial overrides</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-primary transition-colors" size={16} />
               <input 
                 type="text"
                 placeholder="Search variants..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="bg-black/40 border border-white/5 rounded-xl pl-12 pr-6 py-4 text-[10px] font-black uppercase text-white outline-none focus:border-primary transition-all w-64 shadow-inner"
               />
             </div>
             <button 
               onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
               className="bg-primary text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3 active:scale-95 transition-all"
             >
               {isAdding ? <X size={20} /> : <Plus size={20} />}
               {isAdding ? "Abort" : "Define Variant"}
             </button>
          </div>
       </div>

       {isAdding && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-22">
             <form onSubmit={handleSave} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Core Service Node</label>
                      <select 
                        required
                        value={newVariant.serviceId}
                        onChange={e => setNewVariant({...newVariant, serviceId: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-black text-white"
                      >
                         <option value="">SELECT_BASE_SERVICE...</option>
                         {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Price Override (₹)</label>
                      <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</div>
                         <input 
                           type="number"
                           required
                           value={newVariant.priceOverride}
                           onChange={e => setNewVariant({...newVariant, priceOverride: parseInt(e.target.value)})}
                           className="w-full bg-black/40 border border-white/10 pl-10 pr-4 py-4 rounded-xl text-sm font-black text-white"
                         />
                      </div>
                   </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 pb-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Vehicle Make</label>
                      <select 
                        value={newVariant.make}
                        onChange={e => setNewVariant({...newVariant, make: e.target.value, model: "All"})}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-black text-white"
                      >
                         <option value="All">ALL_MANUFACTURERS</option>
                         {Object.keys(carData).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Specific Model</label>
                      <select 
                        value={newVariant.model}
                        onChange={e => setNewVariant({...newVariant, model: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-black text-white"
                      >
                         <option value="All">ALL_MODELS</option>
                         {newVariant.make !== "All" && carData[newVariant.make]?.models.map((m: any) => (
                           <option key={m.name} value={m.name}>{m.name}</option>
                         ))}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Fuel Type</label>
                      <select 
                        value={newVariant.fuel}
                        onChange={e => setNewVariant({...newVariant, fuel: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-black text-white"
                      >
                         <option value="All">ALL_ENERGY_TYPES</option>
                         {["Petrol", "Diesel", "CNG", "EV", "Hybrid"].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                   </div>
                </div>

                <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-primary hover:text-white transition-all shadow-xl">
                   {editingId ? "Update Tactical Parameters" : "Engrave Variant Matrix"}
                </button>
             </form>
          </motion.div>
       )}

       <div className="bg-card-bg rounded-[3rem] border border-border-subtle overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-black/20 border-b border-white/5">
                      <th className="px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Base Service</th>
                      <th className="px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Vehicle Filters</th>
                      <th className="px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Price Override</th>
                      <th className="px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {filteredVariants.map(v => (
                      <tr key={v.id} className="hover:bg-white/5 transition-all group">
                         <td className="px-8 py-6">
                            <div className="font-black text-white text-xs uppercase italic">{v.serviceName}</div>
                            <div className="text-[9px] text-text-dim uppercase mt-1 tracking-widest">Core_ID: {v.serviceId.slice(0, 8)}</div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex gap-2">
                               <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase text-primary tracking-tighter">{v.make}</span>
                               <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase text-white/50 tracking-tighter">{v.model}</span>
                               <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase text-indigo-400 tracking-tighter">{v.fuel}</span>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="text-xl font-black text-emerald-400 italic tracking-tighter">₹{v.priceOverride}</div>
                            <div className="text-[8px] font-black uppercase text-text-dim tracking-widest mt-0.5">Tactical_Price</div>
                         </td>
                         <td className="px-8 py-6">
                            <button 
                              onClick={() => updateDoc(doc(db, "serviceVariants", v.id), { active: !v.active })}
                              className={cn(
                                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                v.active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-neutral-800 text-neutral-600 border-neutral-700"
                              )}
                            >
                               {v.active ? "ENGAGED" : "OFFLINE"}
                            </button>
                         </td>
                         <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-3">
                               <button 
                                 onClick={() => {
                                   setEditingId(v.id);
                                   setNewVariant({ ...v });
                                   setIsAdding(true);
                                 }}
                                 className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-white transition-all shadow-inner border border-white/5"
                               >
                                  <Edit size={14} />
                               </button>
                               <button 
                                 onClick={() => deleteVariant(v.id)}
                                 className="p-3 bg-white/5 rounded-xl hover:bg-rose-500/20 text-rose-500 transition-all shadow-inner border border-white/5 hover:border-rose-500/30"
                               >
                                  <Trash2 size={14} />
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}

function LocationsTab() {
  const [locations, setLocations] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", slug: "", address: "", city: "", region: "", phone: "", isActive: true });

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubLocs = onSnapshot(collection(db, "locations"), (snap) => {
      setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Locations sync error handled:", err.message);
    });

    const unsubCities = onSnapshot(doc(db, "config", "cities"), (snap) => {
      if (snap.exists()) {
        setCities(snap.data().list || []);
      } else {
        // Seed default if missing
        setDoc(doc(db, "config", "cities"), { list: ["Mumbai", "Delhi", "Bangalore"] });
      }
    });

    return () => {
      unsubLocs();
      unsubCities();
    };
  }, []);

  const handleSaveCity = async () => {
    if (!newCity) return;
    const updated = [...cities, newCity];
    await setDoc(doc(db, "config", "cities"), { list: updated });
    setNewCity("");
    toast.success(`${newCity} added to deployment matrix.`);
  };

  const removeCity = async (cityToRemove: string) => {
    const updated = cities.filter(c => c !== cityToRemove);
    await setDoc(doc(db, "config", "cities"), { list: updated });
    toast.info(`${cityToRemove} decommissioned.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "locations", editingId), { ...newLoc, updatedAt: serverTimestamp() });
        setEditingId(null);
      } else {
        const finalSlug = newLoc.slug || newLoc.name.toLowerCase().replace(/\s+/g, '-');
        await addDoc(collection(db, "locations"), { ...newLoc, slug: finalSlug, createdAt: serverTimestamp() });
      }
      setShowAdd(false);
      setNewLoc({ name: "", slug: "", address: "", city: "", region: "", phone: "", isActive: true });
    } catch (err) { console.error(err); }
  };

  const handleEdit = (loc: any) => {
    setNewLoc({ 
      name: loc.name, 
      slug: loc.slug || "",
      address: loc.address || "", 
      city: loc.city || "", 
      region: loc.region || "", 
      phone: loc.phone || "", 
      isActive: loc.isActive 
    });
    setEditingId(loc.id);
    setShowAdd(true);
  };

  const toggleLoc = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "locations", id), { isActive: !current });
  };

  const deleteLoc = async (id: string) => {
    if (window.confirm("Remove this service point?")) {
      await deleteDoc(doc(db, "locations", id));
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
       <div className="flex items-center justify-between">
          <div>
             <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Location <span className="text-primary">Control</span></h2>
             <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-1">Manage active service hubs and deployment nodes</p>
          </div>
          <button 
             onClick={() => {
               if (showAdd) {
                 setEditingId(null);
                 setNewLoc({ name: "", slug: "", address: "", city: "", region: "", phone: "", isActive: true });
               }
               setShowAdd(!showAdd);
             }}
             className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
          >
             {showAdd ? "Cancel" : "+ New Hub"}
          </button>
       </div>

       {showAdd && (
          <motion.form 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             onSubmit={handleSave} 
             className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle grid md:grid-cols-2 gap-6"
          >
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Hub Name</label>
                <input 
                   placeholder="Main Service Center" 
                   value={newLoc.name}
                   onChange={e => setNewLoc({...newLoc, name: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-primary"
                   required
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Portal Slug (Unique ID)</label>
                <input 
                   placeholder="mumbai-central" 
                   value={newLoc.slug}
                   onChange={e => setNewLoc({...newLoc, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-primary font-mono"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Hub City</label>
                <input 
                   placeholder="Mumbai" 
                   value={newLoc.city}
                   onChange={e => setNewLoc({...newLoc, city: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-primary"
                   required
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Hub Region</label>
                <input 
                   placeholder="South Mumbai" 
                   value={newLoc.region}
                   onChange={e => setNewLoc({...newLoc, region: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-primary"
                   required
                />
             </div>
             <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Tactical Address</label>
                <input 
                   placeholder="123 Mechanics Lane, Industrial Block" 
                   value={newLoc.address}
                   onChange={e => setNewLoc({...newLoc, address: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-primary"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Contact Vector</label>
                <input 
                   placeholder="+91 00000 00000" 
                   value={newLoc.phone}
                   onChange={e => setNewLoc({...newLoc, phone: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-primary"
                />
             </div>
             <button className="md:col-span-2 py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-6">
                {editingId ? "Update Tactical Node" : "Initialize Hub"}
             </button>
          </motion.form>
       )}

       <div className="grid md:grid-cols-2 gap-6">
          {locations.map(loc => (
             <div key={loc.id} className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle group hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-6">
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary-soft transition-all">
                      <Globe size={24} />
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => handleEdit(loc)} className="p-1.5 rounded-lg bg-white/5 text-primary hover:bg-primary-soft transition-all">
                         <Edit2 size={16} />
                      </button>
                      <button onClick={() => toggleLoc(loc.id, loc.isActive)} className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest", loc.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                         {loc.isActive ? "ACTIVE" : "OFFLINE"}
                      </button>
                      <button onClick={() => deleteLoc(loc.id)} className="p-1.5 rounded-lg bg-white/5 text-rose-500 hover:bg-rose-500/20 transition-all">
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">{loc.name}</h3>
                <div className="mb-4">
                    <div className="text-[8px] font-black text-text-dim uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <LogIn size={10} className="text-primary" /> Management Portal link
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center justify-between group/link">
                       <code className="text-[9px] font-bold text-primary truncate hover:text-white transition-colors">
                          {window.location.origin}/admin/login/{loc.slug || loc.id}
                       </code>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(`${window.location.origin}/admin/login/${loc.slug || loc.id}`);
                           toast.success("Portal link archived to clipboard.");
                         }}
                         className="text-text-dim hover:text-white transition-all p-1"
                       >
                          <Download size={14} />
                       </button>
                    </div>
                 </div>
                 <div className="space-y-3">
                   <p className="text-xs text-text-dim leading-relaxed">{loc.address}</p>
                   <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-primary font-mono">
                      <span className="bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10">{loc.city}</span>
                      <span className="opacity-30">•</span>
                      <span className="text-white/40">{loc.region}</span>
                      <span className="opacity-30">•</span>
                      <span className="text-white/80">{loc.phone}</span>
                   </div>
                </div>
             </div>
          ))}
       </div>

       <div className="bg-card-bg p-10 rounded-[3.5rem] border border-border-subtle space-y-8 mt-12">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
             <div>
                <h3 className="text-xl font-black text-white uppercase italic">Deployment City matrix</h3>
                <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mt-1">Authorized territory units</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-4">
             {cities.map(city => (
                <div key={city} className="flex items-center gap-3 bg-black/40 border border-white/10 px-5 py-3 rounded-2xl group/city hover:border-primary/50 transition-all">
                   <span className="text-sm font-black text-white uppercase italic tracking-tight">{city}</span>
                   <button 
                     onClick={() => removeCity(city)}
                     className="text-rose-500 opacity-0 group-hover/city:opacity-100 hover:scale-125 transition-all"
                   >
                     <X size={14} />
                   </button>
                </div>
             ))}
             <div className="flex items-center gap-2 bg-white/5 px-2 rounded-2xl border border-dashed border-white/10 focus-within:border-primary transition-all">
                <input 
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  placeholder="NEW CITY..."
                  className="bg-transparent border-none text-xs font-black uppercase tracking-widest text-white px-3 py-2 outline-none w-32"
                  onKeyDown={e => e.key === 'Enter' && handleSaveCity()}
                />
                <button onClick={handleSaveCity} className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                   <Plus size={16} />
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}

function LayoutTab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "config", "ui"), (d) => {
      if (d.exists()) setConfig(d.data());
      setLoading(false);
    }, (err) => {
      console.warn("Layout UI config error:", err.message);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "config", "ui"), config);
      toast.success("Layout ecosystem synchronized.");
    } catch (err) {
      console.error(err);
      toast.error("Layout synchronization failed.");
    } finally {
      setSaving(false);
    }
  };

  const addLink = (type: 'navLinks' | 'footerQuickLinks' | 'footerLegalLinks') => {
    const updated = { ...config };
    if (!updated[type]) updated[type] = [];
    updated[type].push({ name: "New Link", href: "#" });
    setConfig(updated);
  };

  const removeLink = (type: 'navLinks' | 'footerQuickLinks' | 'footerLegalLinks', index: number) => {
    const updated = { ...config };
    updated[type].splice(index, 1);
    setConfig(updated);
  };

  const updateLink = (type: 'navLinks' | 'footerQuickLinks' | 'footerLegalLinks', index: number, field: string, value: any) => {
    const updated = { ...config };
    updated[type][index][field] = value;
    setConfig(updated);
  };

  if (loading || !config) return null;

  return (
    <div className="space-y-12 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Architecture <span className="text-primary italic opacity-50">Control</span></h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mt-2">Manage Global Navigation & Information Architecture</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Synchronize UI
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Navbar Links */}
        <div className="bg-card-bg p-10 rounded-[3.5rem] border border-border-subtle space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layout size={80} />
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-xl font-black text-white uppercase italic">Primary Navigation</h3>
            <button onClick={() => addLink('navLinks')} className="w-10 h-10 rounded-xl bg-white/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-4">
            {(config.navLinks || []).map((link: any, i: number) => (
              <div key={i} className="bg-black/40 p-6 rounded-2xl border border-white/5 flex gap-4 items-center group/item hover:border-primary/30 transition-all">
                <input 
                  value={link.name}
                  onChange={e => updateLink('navLinks', i, 'name', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-white font-black text-sm outline-none focus:border-primary px-2 py-1 w-1/3"
                  placeholder="Label"
                />
                <input 
                  value={link.href}
                  onChange={e => updateLink('navLinks', i, 'href', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-text-dim font-mono text-[11px] outline-none focus:border-primary px-2 py-1 flex-1"
                  placeholder="/destination"
                />
                <button 
                  onClick={() => removeLink('navLinks', i)}
                  className="w-8 h-8 rounded-lg bg-white/5 text-rose-500 opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Quick Links */}
        <div className="bg-card-bg p-10 rounded-[3.5rem] border border-border-subtle space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <List size={80} />
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-xl font-black text-white uppercase italic">Quick Links (Footer)</h3>
            <button onClick={() => addLink('footerQuickLinks')} className="w-10 h-10 rounded-xl bg-white/5 text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-all">
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-4">
            {(config.footerQuickLinks || []).map((link: any, i: number) => (
              <div key={i} className="bg-black/40 p-6 rounded-2xl border border-white/5 flex gap-4 items-center group/item hover:border-secondary/30 transition-all">
                <input 
                  value={link.name}
                  onChange={e => updateLink('footerQuickLinks', i, 'name', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-white font-black text-sm outline-none focus:border-secondary px-2 py-1 w-1/3"
                />
                <input 
                  value={link.href}
                  onChange={e => updateLink('footerQuickLinks', i, 'href', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-text-dim font-mono text-[11px] outline-none focus:border-secondary px-2 py-1 flex-1"
                />
                <button 
                  onClick={() => removeLink('footerQuickLinks', i)}
                  className="w-8 h-8 rounded-lg bg-white/5 text-rose-500 opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Legal Links */}
        <div className="bg-card-bg p-10 rounded-[3.5rem] border border-border-subtle space-y-8 relative overflow-hidden group col-span-full max-w-2xl">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield size={80} />
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-xl font-black text-white uppercase italic">Legal Ecosystem (Footer)</h3>
            <button onClick={() => addLink('footerLegalLinks')} className="w-10 h-10 rounded-xl bg-white/5 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-all">
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-4">
            {(config.footerLegalLinks || []).map((link: any, i: number) => (
              <div key={i} className="bg-black/40 p-6 rounded-2xl border border-white/5 flex gap-4 items-center group/item hover:border-accent/30 transition-all">
                <input 
                  value={link.name}
                  onChange={e => updateLink('footerLegalLinks', i, 'name', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-white font-black text-sm outline-none focus:border-accent px-2 py-1 w-1/3"
                />
                <input 
                  value={link.href}
                  onChange={e => updateLink('footerLegalLinks', i, 'href', e.target.value)}
                  className="bg-transparent border-b border-white/10 text-text-dim font-mono text-[11px] outline-none focus:border-accent px-2 py-1 flex-1"
                />
                <button 
                  onClick={() => removeLink('footerLegalLinks', i)}
                  className="w-8 h-8 rounded-lg bg-white/5 text-rose-500 opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [config, setConfig] = useState({
    twilioSid: "",
    twilioToken: "",
    twilioPhone: "",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    paytmMid: "",
    paytmKey: "",
    firebaseProjectId: "",
    firebaseApiKey: "",
    firebaseAuthDomain: "",
    firebaseStorageBucket: "",
    firebaseMessagingSenderId: "",
    firebaseAppId: "",
    firebaseMeasurementId: "",
    enableAutoScaling: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const snap = await getDoc(doc(db, "config", "system"));
      if (snap.exists()) {
        setConfig({
           ...config,
           ...snap.data()
        });
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "system"), {
        ...config,
        updatedAt: serverTimestamp()
      });
      toast.success("Ecosystem parameters synchronized.");
    } catch (err) {
      console.error(err);
      toast.error("Synchronization failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl space-y-10">
      <Skeleton className="h-32 w-full rounded-[2.5rem]" />
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="h-64 rounded-[2.5rem]" />
        <Skeleton className="h-64 rounded-[2.5rem]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-5xl pb-20">
       <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Integrated <span className="text-primary">Ecosystem</span></h2>
          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-1">Manage API uplinks, payment gateways, and core service credentials</p>
       </div>

       <div className="grid md:grid-cols-2 gap-10">
          {/* Twilio */}
          <div className="space-y-8 bg-card-bg p-10 rounded-[3rem] border border-border-subtle relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all">
                <MessageSquare size={100} strokeWidth={1} />
             </div>
             <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                   <MessageSquare size={24} />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic">Twilio SMS</h3>
             </div>
             
             <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Account SID</label>
                   <input 
                      type="text" 
                      value={config.twilioSid}
                      onChange={e => setConfig({...config, twilioSid: e.target.value})}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-primary outline-none"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Auth Token</label>
                   <input 
                      type="password" 
                      value={config.twilioToken}
                      onChange={e => setConfig({...config, twilioToken: e.target.value})}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-primary outline-none"
                   />
                </div>
             </div>
          </div>

          {/* Razorpay */}
          <div className="space-y-8 bg-card-bg p-10 rounded-[3rem] border border-border-subtle relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all text-primary">
                <Zap size={100} strokeWidth={1} />
             </div>
             <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                   <Zap size={24} />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic">Razorpay Payment</h3>
             </div>
             
             <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Key ID</label>
                   <input 
                      type="text" 
                      value={config.razorpayKeyId}
                      onChange={e => setConfig({...config, razorpayKeyId: e.target.value})}
                      placeholder="rzp_live_xxxxxxxxxxxx"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-primary outline-none"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Key Secret</label>
                   <input 
                      type="password" 
                      value={config.razorpayKeySecret}
                      onChange={e => setConfig({...config, razorpayKeySecret: e.target.value})}
                      placeholder="••••••••••••••••••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-primary outline-none"
                   />
                </div>
             </div>
          </div>

          {/* Paytm */}
          <div className="space-y-8 bg-card-bg p-10 rounded-[3rem] border border-border-subtle relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all text-blue-500">
                <Shield size={100} strokeWidth={1} />
             </div>
             <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <Shield size={24} />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic">Paytm Gateway</h3>
             </div>
             
             <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Merchant ID (MID)</label>
                   <input 
                      type="text" 
                      value={config.paytmMid}
                      onChange={e => setConfig({...config, paytmMid: e.target.value})}
                      placeholder="CARMEC83726..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-blue-500 outline-none"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Merchant Key</label>
                   <input 
                      type="password" 
                      value={config.paytmKey}
                      onChange={e => setConfig({...config, paytmKey: e.target.value})}
                      placeholder="••••••••••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-blue-500 outline-none"
                   />
                </div>
             </div>
          </div>

          {/* Firebase */}
          <div className="space-y-8 bg-card-bg p-10 rounded-[3rem] border border-border-subtle relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all">
                <Database size={100} strokeWidth={1} />
             </div>
             <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                   <Database size={24} />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic">Firebase Hub</h3>
             </div>
             
              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Project ID</label>
                    <input 
                        type="text" 
                        value={config.firebaseProjectId}
                        onChange={e => setConfig({...config, firebaseProjectId: e.target.value})}
                        placeholder="carmechs-prod"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-secondary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">API Key</label>
                    <input 
                        type="password" 
                        value={config.firebaseApiKey}
                        onChange={e => setConfig({...config, firebaseApiKey: e.target.value})}
                        placeholder="AIzaSy..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Auth Domain</label>
                    <input 
                        type="text" 
                        value={config.firebaseAuthDomain}
                        onChange={e => setConfig({...config, firebaseAuthDomain: e.target.value})}
                        placeholder="carmechs.firebaseapp.com"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-secondary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">App ID</label>
                    <input 
                        type="text" 
                        value={config.firebaseAppId}
                        onChange={e => setConfig({...config, firebaseAppId: e.target.value})}
                        placeholder="1:1234:web:abcd"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-secondary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Storage Bucket</label>
                  <input 
                      type="text" 
                      value={config.firebaseStorageBucket}
                      onChange={e => setConfig({...config, firebaseStorageBucket: e.target.value})}
                      placeholder="carmechs.appspot.com"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-secondary outline-none"
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                   <div className="space-y-1">
                      <div className="text-[11px] font-black text-white uppercase">Self-Healing</div>
                      <div className="text-[9px] font-bold text-text-dim uppercase">Auto-correction for registry drift</div>
                   </div>
                   <button 
                      onClick={() => setConfig({...config, enableAutoScaling: !config.enableAutoScaling})}
                      className={cn(
                        "w-14 h-8 rounded-full relative transition-all duration-300",
                        config.enableAutoScaling ? "bg-emerald-500" : "bg-neutral-800"
                      )}
                   >
                      <motion.div 
                         animate={{ x: config.enableAutoScaling ? 24 : 4 }}
                         className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                      />
                   </button>
                </div>
             </div>
          </div>
       </div>

       <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-6 bg-primary text-white rounded-3xl font-black text-base uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-4 group"
       >
          <RefreshCw size={24} className={cn("group-hover:rotate-180 transition-transform duration-700", saving && "animate-spin")} />
          {saving ? "Deploying Ecosystem..." : "Synchronize System Intelligence"}
       </button>
    </div>
  );
}

function UsersTab({ locations }: { locations: any[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    address: "",
    city: "Mumbai",
    role: "customer",
    locationId: "all"
  });

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Users sync error handled:", err.message);
      setLoading(false);
    });
  }, []);

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "Mumbai",
      role: user.role || "customer",
      locationId: user.locationId || "all"
    });
    setShowAdd(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        
        // Update admins collection if role is admin
        if (formData.role === 'admin' || formData.role === 'super_admin') {
          await setDoc(doc(db, "admins", editingUser.id), {
            email: formData.email,
            role: formData.role,
            locationId: formData.locationId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } else {
          // If role was admin but changed to customer, remove from admins collection
          await deleteDoc(doc(db, "admins", editingUser.id)).catch(() => {});
        }
        
        toast.success("User identity updated.");
      } else {
        const newUserRef = doc(collection(db, "users"));
        await setDoc(newUserRef, {
          ...formData,
          createdAt: serverTimestamp()
        });
        
        if (formData.role === 'admin' || formData.role === 'super_admin') {
          await setDoc(doc(db, "admins", newUserRef.id), {
            email: formData.email,
            role: formData.role,
            locationId: formData.locationId,
            createdAt: serverTimestamp()
          });
        }
        
        toast.success("New user node deployed.");
      }
      setShowAdd(false);
      setEditingUser(null);
      setFormData({ displayName: "", email: "", phone: "", address: "", city: "Mumbai", role: "customer", locationId: "all" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to synchronize user data.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      
      if (newRole === 'admin' || newRole === 'super_admin') {
        const userDoc = users.find(u => u.id === userId);
        await setDoc(doc(db, "admins", userId), {
          email: userDoc?.email,
          role: newRole,
          locationId: userDoc?.locationId || "all",
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await deleteDoc(doc(db, "admins", userId)).catch(() => {});
      }
      
      toast.success(`User role updated to ${newRole.toUpperCase()}.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user role protocol.");
    }
  };

  const [resettingId, setResettingId] = useState<string | null>(null);

  const handleResetPassword = async (email: string, id: string) => {
    if (!window.confirm(`Initiate secure password reset protocol for ${email}?`)) return;
    setResettingId(id);
    try {
      const response = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      toast.success(data.message || "Reset link dispatched.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Reset protocol failure.");
    } finally {
      setResettingId(null);
    }
  };

  const handleUpdateLocation = async (userId: string, locationId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        locationId: locationId,
        updatedAt: serverTimestamp()
      });
      
      // If user is admin, sync to admins collection
      const userDoc = users.find(u => u.id === userId);
      if (userDoc?.role === 'admin' || userDoc?.role === 'super_admin') {
        await updateDoc(doc(db, "admins", userId), {
          locationId: locationId,
          updatedAt: serverTimestamp()
        }).catch(async () => {
          // If admin doc doesn't exist for some reason, create it
          await setDoc(doc(db, "admins", userId), {
            email: userDoc.email,
            role: userDoc.role,
            locationId: locationId,
            updatedAt: serverTimestamp()
          });
        });
      }
      
      toast.success("Assigned location updated.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update assigned location.");
    }
  };

  const filteredUsers = users.filter(u => {
    return robustSearch(u, search, ["displayName", "fullName", "email", "phone", "id", "role"]);
  });

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Purge user from registry?")) return;
    await deleteDoc(doc(db, "users", id));
    await deleteDoc(doc(db, "admins", id)).catch(() => {});
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">
       <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                <Users size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white mb-0.5">Customer Registry</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Verified user base: {users.length} biological units</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text"
                placeholder="Filter by name, email or comms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-black uppercase text-white outline-none focus:border-primary transition-all shadow-inner"
              />
            </div>
            <button 
              onClick={() => {
                setEditingUser(null);
                setFormData({ displayName: "", email: "", phone: "", address: "", city: "Mumbai", role: "customer", locationId: "all" });
                setShowAdd(true);
              }}
              className="bg-primary text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 shrink-0"
            >
              <Plus size={24} />
            </button>
          </div>
       </div>

       <AnimatePresence>
          {showAdd && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-card-bg p-10 rounded-[3rem] border-2 border-primary/20 shadow-2xl relative overflow-hidden"
            >
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                    {editingUser ? "Edit User Identity" : "Deploy New User Node"}
                  </h3>
                  <button onClick={() => setShowAdd(false)} className="text-text-dim hover:text-white transition-colors">
                    <X size={24} />
                  </button>
               </div>
               
               <form onSubmit={handleSaveUser} className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          required
                          value={formData.displayName}
                          onChange={e => setFormData({...formData, displayName: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none" 
                          placeholder="John Driver"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          required
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none" 
                          placeholder="john@example.com"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Permission Level</label>
                            <select 
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none appearance-none"
                            >
                                <option value="customer">Customer</option>
                                <option value="mechanic">Mechanic</option>
                                <option value="admin">Admin / Manager</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Assigned Tactical Hub</label>
                            <select 
                                value={formData.locationId}
                                onChange={e => setFormData({...formData, locationId: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none appearance-none"
                            >
                                <option value="all">Global Access</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Phone Comms</label>
                            <input 
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none" 
                            placeholder="98XXXXXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">City Node</label>
                            <input 
                            value={formData.city}
                            onChange={e => setFormData({...formData, city: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none" 
                            placeholder="Mumbai"
                            />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Physical Address</label>
                        <textarea 
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-black text-white focus:border-primary outline-none h-[72px] resize-none" 
                          placeholder="Full residency details..."
                        />
                     </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                     <button 
                       type="button" 
                       onClick={() => setShowAdd(false)}
                       className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-dim hover:bg-white/5 transition-all"
                     >
                       Abort Operation
                     </button>
                     <button 
                       type="submit" 
                       disabled={saving}
                       className="px-10 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                     >
                       {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                       {editingUser ? "Sync Changes" : "Deploy User"}
                     </button>
                  </div>
               </form>
            </motion.div>
          )}
       </AnimatePresence>

       <div className="bg-card-bg rounded-[3rem] border border-border-subtle overflow-hidden shadow-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
             <thead>
                <tr className="bg-black/20 border-b border-white/5">
                   <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">User Identity</th>
                   <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Permission Level</th>
                   <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Assigned Hub</th>
                   <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Comms Layer</th>
                   <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">Join Epoch</th>
                   <th className="px-10 py-6 text-[10px) font-black uppercase tracking-[0.3em] text-text-dim text-right">Ops</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-all group">
                     <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl border-2 border-white/5 p-0.5 overflow-hidden group-hover:scale-110 transition-transform bg-white/5">
                              <img src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`} alt="" className="w-full h-full object-cover rounded-lg" />
                           </div>
                           <div>
                              <div className="font-black text-sm text-white uppercase italic tracking-tight">{u.displayName || "Unknown Unit"}</div>
                              <div className="text-[10px] font-mono text-accent-blue tracking-tighter truncate max-w-[200px]">{u.email}</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-10 py-6">
                        <select 
                            value={u.role || "customer"}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-black/40"
                        >
                            <option value="customer">CUSTOMER</option>
                            <option value="mechanic">MECHANIC</option>
                            <option value="admin">ADMIN</option>
                            <option value="super_admin">SUPER_ADMIN</option>
                        </select>
                     </td>
                     <td className="px-10 py-6">
                        <select 
                            value={u.locationId || "all"}
                            onChange={(e) => handleUpdateLocation(u.id, e.target.value)}
                            className="bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer hover:bg-black/40 max-w-[150px]"
                        >
                            <option value="all">GLOBAL_BASE</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name.toUpperCase()}</option>
                            ))}
                        </select>
                     </td>
                     <td className="px-10 py-6">
                        <div className="text-[11px] font-black text-text-dim flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                           {u.phone || "NODE_DISCONNECTED"}
                        </div>
                     </td>
                     <td className="px-10 py-6">
                        <div className="text-[10px] font-mono text-text-dim uppercase">
                           {(u.createdAt as Timestamp)?.toDate().toLocaleDateString() || "T_DATA_MISSING"}
                        </div>
                     </td>
                     <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                             onClick={() => handleResetPassword(u.email, u.id)}
                             disabled={resettingId === u.id}
                             className="w-10 h-10 rounded-xl bg-white/5 text-text-dim hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                             title="Reset Password"
                           >
                              {resettingId === u.id ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                           </button>
                           <button 
                             onClick={() => handleEdit(u)}
                             className="w-10 h-10 rounded-xl bg-white/5 text-text-dim hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                           >
                              <Edit size={16} />
                           </button>
                           <button 
                             onClick={() => handleDeleteUser(u.id)}
                             className="w-10 h-10 rounded-xl bg-white/5 text-text-dim hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function FleetControlTab({ bookings, technicians }: { bookings: any[], technicians: any[] }) {
    const activeVehicles = bookings.filter(b => b.status === "in-progress" || b.status === "confirmed" || b.status === "pending");
    const [filterStatus, setFilterStatus] = useState("all");

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "bookings", id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            toast.success("Fleet unit status synchronized.");
        } catch (err) {
            toast.error("Telemetry update failed.");
        }
    };

    const handleAssignTech = async (bookingId: string, techId: string) => {
        try {
            const tech = technicians.find(t => t.id === techId);
            await updateDoc(doc(db, "bookings", bookingId), {
                mechanicId: techId,
                mechanicName: tech?.name || "Unassigned",
                updatedAt: serverTimestamp()
            });
            toast.success("Technician module assigned to fleet unit.");
        } catch (err) {
            toast.error("Assignment protocol failed.");
        }
    };

    const stats = [
        { label: "Active Deployments", value: activeVehicles.filter(v => v.status !== 'pending').length, icon: Activity, color: "text-primary" },
        { label: "Operational Hubs", value: new Set(bookings.map(b => b.location)).size, icon: Globe, color: "text-emerald-500" },
        { label: "Priority Requests", value: bookings.filter(b => b.status === "pending").length, icon: ShieldAlert, color: "text-rose-500" }
    ];

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((s, i) => (
                    <div key={i} className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <s.icon size={100} strokeWidth={1} />
                        </div>
                        <div className="flex items-center gap-5 mb-4">
                            <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner", s.color)}>
                                <s.icon size={22} />
                            </div>
                            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">{s.label}</div>
                        </div>
                        <div className="text-5xl font-black italic tracking-tighter text-white">{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="bg-card-bg rounded-[3rem] border border-border-subtle shadow-2xl overflow-hidden p-10">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-1">Fleet <span className="text-primary">Operations</span> Control</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Real-time status of service vehicles and active mission management</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeVehicles.map((v, i) => (
                        <div key={i} className="bg-black/40 border border-white/5 p-6 rounded-[2rem] hover:border-primary/30 transition-all group relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center p-2 border border-white/5">
                                    <Car size={32} className="text-primary group-hover:scale-110 transition-transform" />
                                </div>
                                <select 
                                    value={v.status}
                                    onChange={(e) => handleUpdateStatus(v.id, e.target.value)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none border transition-all appearance-none cursor-pointer",
                                        v.status === 'in-progress' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                        v.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    )}
                                >
                                    <option value="pending">PENDING</option>
                                    <option value="confirmed">CONFIRMED</option>
                                    <option value="in-progress">IN_PROGRESS</option>
                                    <option value="completed">COMPLETED</option>
                                    <option value="cancelled">CANCELLED</option>
                                </select>
                            </div>
                            
                            <h4 className="text-lg font-black text-white italic tracking-tight uppercase mb-1">{v.carModel}</h4>
                            <div className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-6 flex items-center gap-2">
                                <MapPin size={10} /> {v.city} • {v.location}
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black uppercase text-white/30 tracking-widest block ml-1">Assigned Support Node</label>
                                    <select 
                                        value={v.mechanicId || ""}
                                        onChange={(e) => handleAssignTech(v.id, e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-white outline-none focus:border-primary transition-all appearance-none"
                                    >
                                        <option value="">DELEGATE_UNASSIGNED</option>
                                        {technicians.map(t => (
                                            <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                        <span>Mission Progress</span>
                                        <span className="text-white">{v.status === 'completed' ? '100%' : v.status === 'in-progress' ? '65%' : '15%'}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: v.status === 'completed' ? '100%' : v.status === 'in-progress' ? '65%' : '15%' }}
                                            className="h-full bg-primary"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 italic">
                                            {v.status === 'in-progress' && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                            {v.status.replace("_", " ")}
                                        </div>
                                        <div className="text-[10px] font-black uppercase text-white/20">#{v.id.slice(-6).toUpperCase()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {activeVehicles.length === 0 && (
                        <div className="col-span-full py-24 text-center border-4 border-dashed border-white/5 rounded-[3rem]">
                            <Car size={48} className="mx-auto text-white/5 mb-4" />
                            <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em]">No active vehicle signals detected in the fleet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MarketingTab() {
  const [activeSubTab, setActiveSubTab] = useState<'testimonials' | 'blog' | 'campaigns'>('testimonials');
  
  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-24">
       <div className="flex gap-4 p-2 bg-card-bg rounded-3xl border border-border-subtle w-fit shadow-2xl">
          <button 
            onClick={() => setActiveSubTab('testimonials')}
            className={cn(
              "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeSubTab === 'testimonials' ? "bg-primary text-white shadow-xl" : "text-text-dim hover:text-white"
            )}
          >
            Social Evidence
          </button>
          <button 
            onClick={() => setActiveSubTab('blog')}
            className={cn(
              "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeSubTab === 'blog' ? "bg-primary text-white shadow-xl" : "text-text-dim hover:text-white"
            )}
          >
            Transmission Feed
          </button>
          <button 
            onClick={() => setActiveSubTab('campaigns')}
            className={cn(
              "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeSubTab === 'campaigns' ? "bg-emerald-600 text-white shadow-xl" : "text-text-dim hover:text-white"
            )}
          >
            Tactical Campaigns
          </button>
       </div>

       {activeSubTab === 'testimonials' && <TestimonialsManager />}
       {activeSubTab === 'blog' && <BlogManager />}
       {activeSubTab === 'campaigns' && <CampaignsManager />}
    </div>
  );
}

function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTest, setNewTest] = useState({ name: "", role: "", text: "", rating: 5, photoUrl: "" });

  useEffect(() => {
    return onSnapshot(collection(db, "testimonials"), (snap) => {
      setTestimonials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
       console.warn("TestimonialsManager error:", err.message);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "testimonials"), { ...newTest, createdAt: serverTimestamp() });
    setShowAdd(false);
    setNewTest({ name: "", role: "", text: "", rating: 5, photoUrl: "" });
  };

  const deleteTest = async (id: string) => {
    if (window.confirm("Purge evidence?")) await deleteDoc(doc(db, "testimonials", id));
  };

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl">
          <div>
             <h3 className="text-xl font-black text-white uppercase italic">Social Evidence Control</h3>
             <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-1 text-primary">Trust factor management layer</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            <Plus size={24} />
          </button>
       </div>

       {showAdd && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl">
             <form onSubmit={handleSave} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Identity</label>
                      <input 
                        required 
                        value={newTest.name} 
                        onChange={e => setNewTest({...newTest, name: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" 
                        placeholder="John Driver"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Context Reference</label>
                      <input 
                        value={newTest.role} 
                        onChange={e => setNewTest({...newTest, role: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" 
                        placeholder="Verified Car Enthusiast"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Transmission Data</label>
                   <textarea 
                     required 
                     rows={3} 
                     value={newTest.text} 
                     onChange={e => setNewTest({...newTest, text: e.target.value})} 
                     className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white" 
                     placeholder="The most transparent service I've ever experienced..."
                   />
                </div>
                <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-primary hover:text-white transition-all shadow-xl">Commit to Registry</button>
             </form>
          </motion.div>
       )}

       <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map(t => (
             <div key={t.id} className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl relative group h-full flex flex-col justify-between">
                <button onClick={() => deleteTest(t.id)} className="absolute top-6 right-6 text-text-dim hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                   <Trash2 size={16} />
                </button>
                <div className="space-y-6">
                   <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < t.rating ? "currentColor" : "none"} className={i < t.rating ? "text-amber-500" : "text-white/10"} />)}
                   </div>
                   <p className="text-sm font-medium text-white italic leading-relaxed">"{t.text}"</p>
                </div>
                <div className="mt-8 flex items-center gap-4 border-t border-white/5 pt-6">
                   <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary font-black uppercase text-[10px]">{t.name.charAt(0)}</div>
                   <div>
                      <div className="text-xs font-black text-white uppercase italic">{t.name}</div>
                      <div className="text-[9px] text-text-dim uppercase tracking-widest font-bold">{t.role}</div>
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

import { sendPromotionalOffer } from "../lib/mail";

function CampaignsManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [campaign, setCampaign] = useState({
     title: "",
     description: "",
     coupon: "",
     expiry: ""
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) setSelectedUsers([]);
    else setSelectedUsers(users.map(u => u.id));
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return toast.warn("No targets selected.");
    
    setSending(true);
    let successCount = 0;
    
    try {
      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId);
        if (user && user.email) {
          await sendPromotionalOffer({
            email: user.email,
            fullName: user.displayName || user.fullName || "Valued Member",
            offerTitle: campaign.title,
            offerDescription: campaign.description,
            couponCode: campaign.coupon,
            expiryDate: campaign.expiry
          });
          successCount++;
        }
      }
      toast.success(`Broadcast complete: ${successCount} transmissions successfully deployed.`);
      setCampaign({ title: "", description: "", coupon: "", expiry: "" });
      setSelectedUsers([]);
    } catch (err) {
      console.error(err);
      toast.error("Campaign deployment encountered critical errors.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10">
       <div className="grid lg:grid-cols-2 gap-10">
          <div className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Megaphone size={80} />
             </div>
             <h3 className="text-xl font-black text-white uppercase italic mb-8 border-b border-white/5 pb-6">Campaign Specs</h3>
             
             <form onSubmit={handleBroadcast} className="space-y-6 relative z-10">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Directive Title</label>
                   <input 
                      required 
                      value={campaign.title}
                      onChange={e => setCampaign({...campaign, title: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:border-emerald-500 outline-none" 
                      placeholder="SUMMER_SERVICE_FIESTA"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Transmission Payload (Description)</label>
                   <textarea 
                      required 
                      rows={4}
                      value={campaign.description}
                      onChange={e => setCampaign({...campaign, description: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-medium text-white focus:border-emerald-500 outline-none resize-none" 
                      placeholder="Deploying 20% discount on all premium detailing maneuvers..."
                   />
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Access Coupon</label>
                      <input 
                         value={campaign.coupon}
                         onChange={e => setCampaign({...campaign, coupon: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:border-emerald-500 outline-none uppercase" 
                         placeholder="MECHS20"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Expiry Epoch</label>
                      <input 
                         type="date"
                         value={campaign.expiry}
                         onChange={e => setCampaign({...campaign, expiry: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:border-emerald-500 outline-none" 
                      />
                   </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={sending}
                  className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-base uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                >
                   {sending ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} className="group-hover:rotate-12 transition-transform" />}
                   {sending ? "TRANSMITTING..." : "BROADCAST CAMPAIGN"}
                </button>
             </form>
          </div>

          <div className="bg-card-bg rounded-[3rem] border border-border-subtle shadow-2xl flex flex-col overflow-hidden">
             <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div>
                   <h3 className="text-xl font-black text-white uppercase italic">Target Units</h3>
                   <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mt-1">{selectedUsers.length} units selected for mission</p>
                </div>
                <button 
                   onClick={handleSelectAll}
                   className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white transition-all bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20"
                >
                   {selectedUsers.length === users.length ? "DESELECT_ALL" : "SELECT_ALL"}
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto max-h-[600px] custom-scrollbar p-6 space-y-3">
                {users.map(u => (
                   <button 
                      key={u.id}
                      onClick={() => handleToggleUser(u.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                        selectedUsers.includes(u.id) ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                      )}
                   >
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        selectedUsers.includes(u.id) ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10"
                      )}>
                         {selectedUsers.includes(u.id) && <CheckCircle2 size={14} strokeWidth={4} />}
                      </div>
                      <div className="flex items-center gap-4 flex-1">
                         <div className="w-10 h-10 rounded-xl bg-white/5 p-0.5 overflow-hidden border border-white/5">
                            <img src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`} alt="" className="w-full h-full object-cover rounded-lg" />
                         </div>
                         <div>
                            <div className="font-black text-xs text-white uppercase italic truncate max-w-[150px]">{u.displayName || u.fullName || "Unknown Node"}</div>
                            <div className="text-[9px] font-mono text-text-dim truncate max-w-[150px]">{u.email}</div>
                         </div>
                      </div>
                      <div className="text-[9px] font-black uppercase bg-black/40 px-3 py-1 rounded-full text-text-dim border border-white/5">{u.role || 'user'}</div>
                   </button>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}

function TestimonialsTab() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTest, setNewTest] = useState({ name: "", role: "Car Owner", text: "", rating: 5 });

  useEffect(() => {
    return onSnapshot(query(collection(db, "testimonials"), orderBy("createdAt", "desc")), (snap) => {
      setTestimonials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
       console.warn("TestimonialsTab error:", err.message);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "testimonials"), { 
      ...newTest, 
      createdAt: serverTimestamp() 
    });
    setShowAdd(false);
    setNewTest({ name: "", role: "Car Owner", text: "", rating: 5 });
  };

  const deleteTestimonial = async (id: string) => {
    if (window.confirm("Delete this testimonial?")) await deleteDoc(doc(db, "testimonials", id));
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-24">
        <div className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl flex justify-between items-center">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                 <MessageSquare size={28} />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase italic tracking-tighter text-white mb-0.5">Customer Echoes</h2>
                 <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Voice of the client network</p>
              </div>
           </div>
           <button 
             onClick={() => setShowAdd(!showAdd)}
             className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
           >
             Capture New Echo
           </button>
        </div>

        {showAdd && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl">
              <form onSubmit={handleSave} className="space-y-8">
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Client Identity</label>
                       <input required value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" placeholder="e.g. Rahul Sharma" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Assigned Role</label>
                       <input value={newTest.role} onChange={e => setNewTest({...newTest, role: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" placeholder="e.g. Thar Owner" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Star Rating (1-5)</label>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(star => (
                         <button 
                           key={star} 
                           type="button" 
                           onClick={() => setNewTest({...newTest, rating: star})}
                           className={cn("p-2 rounded-lg transition-all", newTest.rating >= star ? "text-amber-500 scale-110" : "text-neutral-800")}
                         >
                           <Star size={24} fill={newTest.rating >= star ? "currentColor" : "none"} />
                         </button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">The Experience Transcript</label>
                    <textarea required rows={4} value={newTest.text} onChange={e => setNewTest({...newTest, text: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-medium text-white" placeholder="What did they say about the service?" />
                 </div>
                 <button type="submit" className="w-full bg-white text-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-primary hover:text-white transition-all shadow-xl">Engrave Testimonial</button>
              </form>
           </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
           {testimonials.map(t => (
              <div key={t.id} className="bg-card-bg p-8 rounded-[3rem] border border-border-subtle shadow-2xl relative group hover:border-primary/30 transition-all">
                 <button onClick={() => deleteTestimonial(t.id)} className="absolute top-8 right-8 text-neutral-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={18} />
                 </button>
                 <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} fill={i < t.rating ? "#F59E0B" : "none"} className={i < t.rating ? "text-amber-500" : "text-neutral-800"} />
                    ))}
                 </div>
                 <p className="text-sm font-medium text-white/80 leading-relaxed mb-6 italic">"{t.text}"</p>
                 <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary font-black uppercase">
                       {t.name.charAt(0)}
                    </div>
                    <div>
                       <div className="font-black text-white text-sm uppercase italic tracking-tighter">{t.name}</div>
                       <div className="text-[9px] font-black uppercase text-primary tracking-widest">{t.role}</div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
    </div>
  );
}

function BlogManager() {
  const [posts, setPosts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "Automotive", image: "" });

  useEffect(() => {
    return onSnapshot(collection(db, "posts"), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
       console.warn("BlogManager error:", err.message);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "posts"), { ...newPost, createdAt: serverTimestamp(), author: "Admin Console" });
    setShowAdd(false);
    setNewPost({ title: "", content: "", category: "Automotive", image: "" });
  };

  const deletePost = async (id: string) => {
    if (window.confirm("Purge transmission?")) await deleteDoc(doc(db, "posts", id));
  };

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl">
          <div>
             <h3 className="text-xl font-black text-white uppercase italic">Transmission Feed Admin</h3>
             <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-1 text-secondary">Global broadcast module</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-secondary text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/20"
          >
            <Plus size={24} />
          </button>
       </div>

       {showAdd && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg p-10 rounded-[3rem] border border-border-subtle shadow-2xl">
             <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Global Headline</label>
                   <input required value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" placeholder="The Evolution of Hybrid Mechanics" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Category Vector</label>
                      <input value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" placeholder="Tech Insights" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Asset URL (Cover)</label>
                      <input value={newPost.image} onChange={e => setNewPost({...newPost, image: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-black text-white" placeholder="https://..." />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Source Content</label>
                   <textarea required rows={6} value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-medium text-white" placeholder="Start transmission content here..." />
                </div>
                <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-secondary hover:text-white transition-all shadow-xl">Broadcast Transmission</button>
             </form>
          </motion.div>
       )}

       <div className="grid gap-6">
          {posts.map(p => (
             <div key={p.id} className="bg-card-bg p-8 rounded-[2.5rem] border border-border-subtle shadow-2xl flex flex-col md:flex-row gap-8 items-start relative group">
                <div className="w-full md:w-48 h-48 rounded-3xl bg-white/5 overflow-hidden shrink-0 border-2 border-white/5">
                   <img src={p.image || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=600"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-4">
                   <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-secondary tracking-widest px-3 py-1 bg-secondary/10 rounded-full border border-secondary/20">{p.category}</span>
                      <button onClick={() => deletePost(p.id)} className="text-text-dim hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2">
                         <Trash2 size={18} />
                      </button>
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{p.title}</h3>
                   <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">{p.content}</p>
                   <div className="pt-4 flex items-center gap-4 text-[10px] font-black uppercase text-text-dim tracking-widest italic">
                      <Clock size={12} className="text-secondary" />
                      {(p.createdAt as Timestamp)?.toDate().toLocaleDateString()}
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function SecretsTab() {
  const [secrets, setSecrets] = useState<Record<string, string>>({
    GEMINI_API_KEY: "",
    RAZORPAY_SECRET: "",
    PAYTM_MERCHANT_KEY: "",
    RESEND_API_KEY: "",
    CLOUDINARY_URL: "",
    TWILIO_AUTH_TOKEN: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadSecrets() {
      try {
        const snap = await getDoc(doc(db, "config", "secrets"));
        if (snap.exists()) {
          setSecrets(prev => ({
            ...prev,
            ...(snap.data() as Record<string, string>)
          }));
        }
      } catch (err) {
        console.error("Vault access failure:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSecrets();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "secrets"), {
        ...secrets,
        updatedAt: serverTimestamp()
      });
      toast.success("Security vault synchronized and sealed.");
    } catch (err) {
      console.error(err);
      toast.error("Vault synchronization protocol failure.");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (key: string) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return (
    <div className="space-y-8 max-w-4xl">
      <Skeleton className="h-20 w-full rounded-3xl" />
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-4xl pb-20">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
          <Key className="text-secondary" /> Security <span className="text-secondary">Vault</span>
        </h2>
        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mt-1">Manage environment-level secrets and sensitive API credentials</p>
      </motion.div>

      <div className="bg-card-bg p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
        <div className="grid gap-10">
          {Object.keys(secrets).filter(k => k !== 'updatedAt').map(key => (
             <div key={key} className="space-y-3 group">
               <div className="flex justify-between items-center px-1">
                 <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                   {key.replace(/_/g, ' ')}
                 </label>
                 <button 
                  onClick={() => toggleVisibility(key)}
                  className="text-[9px] font-black text-white/40 uppercase hover:text-white transition-colors"
                 >
                   {showValues[key] ? "Hide Data" : "Reveal Data"}
                 </button>
               </div>
               <div className="relative">
                 <input 
                   type={showValues[key] ? "text" : "password"}
                   value={secrets[key] || ""}
                   onChange={e => setSecrets({...secrets, [key]: e.target.value})}
                   placeholder={`Enter ${key}...`}
                   className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-sm font-mono text-white focus:border-secondary transition-all pr-14 placeholder:text-white/10"
                 />
                 <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <ShieldCheck size={20} className={secrets[key] ? "text-emerald-500 opacity-40" : "text-white/5"} />
                 </div>
               </div>
             </div>
          ))}
        </div>

        <div className="pt-6">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-secondary hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            {saving ? "SEALING VAULT..." : "COMMIT TO CORE SYSTEM"}
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-rose-500/5 border border-rose-500/10 p-10 rounded-[2.5rem] flex items-start gap-8"
      >
         <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 border border-rose-500/20">
            <ShieldAlert size={28} />
         </div>
         <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Security Advisory: Vault Protocol</h4>
            <p className="text-[11px] text-text-dim mt-3 leading-loose font-medium opacity-80">
              These credentials provide root-level access to external services. Ensure all entries are current and validated. 
              Incorrect secrets may result in system-wide service degradation or transactional failures. 
              Values are synchronized with the cloud state and will be applied to the primary operational layer.
            </p>
         </div>
      </motion.div>
    </div>
  );
}
