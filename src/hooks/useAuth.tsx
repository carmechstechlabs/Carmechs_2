import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile, AuthState } from "../types";

const AuthContext = createContext<AuthState & { logout: () => Promise<void> }>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Listen to Firestore user document
        const unsubscribeUser = onSnapshot(doc(db, "users", firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL
            });
          } else {
            // New user detection - should be handled by a sign-up function 
            // but we'll put a fallback here for social logins
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              fullName: firebaseUser.displayName || "",
              role: 'customer',
              referralCode,
              bonusBalance: 0,
              createdAt: new Date(),
              photoURL: firebaseUser.photoURL,
              profileCompleted: false
            };
            setUser(newUser);
          }
          setLoading(false);
        }, (err) => {
          console.error("User profile sync error:", err);
          setLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin' || user?.email === 'carmechstechlabs@gmail.com';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
