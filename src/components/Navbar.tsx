import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wrench, Phone, Menu, X, User, LogOut, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useConfig } from "../hooks/useConfig";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

export default function Navbar() {
  const { config } = useConfig();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const navLinks = config.navLinks || [
    { name: "Services", href: "#services" },
    { name: "Process", href: "#how-it-works" },
    { name: "Support Hub", href: "/support", isPage: true },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/80 backdrop-blur-lg border-b border-slate-100 py-3" 
          : "bg-transparent py-8"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          {config.logoUrl ? (
            <img 
              src={config.logoUrl} 
              alt={config.logoText || "Logo"} 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
              <Wrench size={24} />
            </div>
          )}
          <span className="text-2xl font-black tracking-tight text-ink font-display">
            {config.logoText || "CARMECHS"}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="px-6 py-2.5 rounded-xl text-sm font-black text-rose-500 hover:bg-rose-50 transition-all border border-rose-100/50"
            >
              Admin Portal
            </Link>
          )}
          {navLinks.map((link) => (
            link.isPage ? (
              <Link
                key={link.name}
                to={link.href}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-primary hover:bg-white transition-all"
              >
                {link.name}
              </Link>
            ) : (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                   if (link.href.startsWith('#')) {
                     e.preventDefault();
                     const target = document.querySelector(link.href);
                     if (target) {
                       const offset = 100; // Account for fixed header
                       const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                       window.scrollTo({ top, behavior: 'smooth' });
                     }
                   }
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-primary hover:bg-white transition-all"
              >
                {link.name}
              </a>
            )
          ))}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <a
            href={`tel:${config.supportPhone}`}
            className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-primary transition-colors"
          >
            <Phone size={16} />
            {config.supportPhone}
          </a>

          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
               <Link 
                to="/profile"
                className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
               >
                 {user.fullName?.[0] || user.email?.[0].toUpperCase()}
               </Link>
               <button 
                onClick={handleLogout}
                className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
               >
                 Logout
               </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
            >
              <User size={16} />
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-ink"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-white"
          >
            <div className="container mx-auto px-6 py-24 flex flex-col gap-4 h-full">
              {user?.role === 'admin' && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0 }}
                >
                  <Link
                    to="/admin"
                    className="text-4xl font-black text-rose-500 hover:text-rose-600 transition-colors font-display"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Portal
                  </Link>
                </motion.div>
              )}
              {navLinks.map((link, i) => (
                link.isPage ? (
                  <motion.div
                    key={link.name}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link
                      to={link.href}
                      className="text-4xl font-black text-ink hover:text-primary transition-colors font-display"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ) : (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-4xl font-black text-ink hover:text-primary transition-colors font-display"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </motion.a>
                )
              ))}
              
              <div className="mt-8 flex flex-col gap-4">
                  {user ? (
                    <>
                      <Link 
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center justify-between gap-3 bg-slate-50 text-ink p-6 rounded-3xl font-bold text-xl border-2 border-slate-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black">
                            {user.fullName?.[0] || user.email?.[0].toUpperCase()}
                          </div>
                          <div className="text-left">
                            <div className="text-xl font-black">{user.fullName || "Car Owner"}</div>
                            <div className="text-xs uppercase font-black text-slate-400 tracking-widest leading-none">View Profile</div>
                          </div>
                        </div>
                        <ChevronRight className="text-slate-300" />
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 bg-rose-50 text-rose-500 py-6 rounded-3xl font-bold text-xl border-2 border-rose-100/50"
                      >
                        <LogOut size={24} />
                        Log Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-3 bg-primary text-white py-6 rounded-3xl font-bold text-xl shadow-xl shadow-primary/20"
                    >
                      <User size={24} />
                      Sign In
                    </Link>
                  )}
                  <a
                    href={`tel:${config.supportPhone}`}
                    className="w-full flex items-center justify-center gap-3 bg-slate-100 text-slate-600 py-6 rounded-3xl font-bold text-xl"
                  >
                    <Phone size={24} />
                    Call Now
                  </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
