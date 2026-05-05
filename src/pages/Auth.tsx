import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Car,
  Gift,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Facebook
} from "lucide-react";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function Auth() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleReferralConversion = async (newUserId: string, referralCode: string) => {
    if (!referralCode) return null;
    
    try {
      const q = query(collection(db, "users"), where("referralCode", "==", referralCode.toUpperCase()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const referrerId = snap.docs[0].id;
        const referrerData = snap.docs[0].data();
        const configDoc = await getDoc(doc(db, "config", "ui"));
        const rewardAmount = configDoc.exists() ? (configDoc.data().referralRewardAmount || 100) : 100;
        
        await addDoc(collection(db, "referrals"), {
          referrerId,
          referredUserId: newUserId,
          status: "successful",
          rewardAmount,
          createdAt: serverTimestamp()
        });

        // Award bonus to referrer
        const currentReferrerBonus = referrerData.bonusBalance || 0;
        await updateDoc(doc(db, "users", referrerId), {
          bonusBalance: currentReferrerBonus + rewardAmount
        });
        
        return { referrerId, rewardAmount };
      }
    } catch (err) {
      console.error("Referral award sequence failed:", err);
    }
    return null;
  };

  const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleSocialLogin = async (providerType: "google" | "facebook") => {
    try {
      setLoading(true);
      setError("");
      const provider = providerType === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          fullName: result.user.displayName,
          createdAt: serverTimestamp(),
          role: "customer",
          bonusBalance: 0,
          referralCode: generateReferralCode()
        });
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Reset link sent! Please check your inbox.");
      setTimeout(() => setMode("login"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Identity alert: Invalid email format detected.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Security breach: Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/");
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const referralResult = await handleReferralConversion(result.user.uid, referralInput);
        
        await setDoc(doc(db, "users", result.user.uid), {
          email,
          fullName,
          createdAt: serverTimestamp(),
          role: "customer",
          bonusBalance: referralResult ? referralResult.rewardAmount : 0,
          referralCode: generateReferralCode(),
          referredBy: referralResult ? referralResult.referrerId : null
        });
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-soft flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-[3rem] shadow-vibrant border-4 border-white overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Content */}
        <div className="md:w-1/2 bg-primary p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/20 rounded-full -ml-24 -mb-24 blur-2xl" />

          <div className="relative z-10 transition-transform hover:scale-105 duration-500">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-10 shadow-lg rotate-6">
              <Car size={30} />
            </div>
            <h1 className="text-4xl font-black mb-6 leading-tight tracking-tighter">
              CarMechs <br />
              <span className="text-secondary opacity-40 italic">Future of Service</span>
            </h1>
            <p className="text-white/70 font-medium leading-relaxed max-w-sm">
              Your vehicle deserves better. Doorstep care powered by tech and transparency.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 mt-20">
             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <Zap size={20} className="text-secondary mb-2" />
                <div className="text-[10px] uppercase font-black text-white/50 mb-1">Status</div>
                <div className="text-lg font-black italic">Active</div>
             </div>
             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <ShieldCheck size={20} className="text-emerald-400 mb-2" />
                <div className="text-[10px] uppercase font-black text-white/50 mb-1">Encrypted</div>
                <div className="text-lg font-black italic">256-bit</div>
             </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-12 lg:p-16 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {mode === "reset" ? (
              <motion.div 
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4">
                   <button onClick={() => setMode("login")} className="p-2 hover:bg-slate-50 rounded-xl">
                      <ChevronLeft size={20} className="text-slate-400" />
                   </button>
                   <h2 className="text-3xl font-black text-ink tracking-tight">Locksmith</h2>
                </div>
                <p className="text-sm font-medium text-slate-500">Forget your keys? Enter your email to trigger a recovery protocol.</p>
                
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Base</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                        required
                      />
                    </div>
                  </div>

                  {error && <div className="flex gap-3 bg-rose-50 p-4 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-wider"><AlertCircle size={14} className="shrink-0" /> {error}</div>}
                  {success && <div className="flex gap-3 bg-emerald-50 p-4 rounded-2xl text-emerald-600 text-[10px] font-black uppercase tracking-wider"><CheckCircle2 size={14} className="shrink-0" /> {success}</div>}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                  >
                    {loading ? "Decrypting..." : "Send Reset Uplink"}
                    <Zap size={18} />
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black text-ink tracking-tighter">
                    {mode === "login" ? "Initiate Login" : "New Operative"}
                  </h2>
                  <button 
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary-soft px-3 py-1.5 rounded-lg transition-colors border border-primary/10"
                  >
                    {mode === "login" ? "Create Account" : "Access Base"}
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-6">
                  {mode === "signup" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                        <input 
                          type="text" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                        <input 
                          type="text" 
                          value={referralInput}
                          onChange={(e) => setReferralInput(e.target.value)}
                          placeholder="ABCDEF"
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold uppercase"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Uplink (Email)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key (Password)</label>
                      {mode === "login" && (
                        <button 
                          type="button" 
                          onClick={() => setMode("reset")}
                          className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60 hover:opacity-100"
                        >
                          Recover?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-ink focus:border-primary outline-none transition-all placeholder:text-slate-300 font-bold"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {error && <div className="flex gap-3 bg-rose-50 p-4 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-wider"><AlertCircle size={14} className="shrink-0" /> {error}</div>}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
                  >
                    {loading ? "Authorizing..." : mode === "login" ? "Launch Mission" : "Join Crew"}
                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>

                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-50"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="bg-white px-4 tracking-[0.2em]">External Uplinks</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => handleSocialLogin("google")}
                    className="flex items-center justify-center gap-3 bg-white text-ink py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 border-slate-50 hover:bg-slate-50 hover:border-slate-100 shadow-sm"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
                    Google
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSocialLogin("facebook")}
                    className="flex items-center justify-center gap-3 bg-[#1877F2] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/10 hover:brightness-110 active:scale-95"
                  >
                    <Facebook size={16} fill="white" />
                    Facebook
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
