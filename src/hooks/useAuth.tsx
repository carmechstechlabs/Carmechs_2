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
        const unsubscribeUser = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL
            });
          } else {
            // Document might not exist yet if they just signed in with Google
            // but the setDoc in Auth.tsx should handle it.
            // Fallback to basic info from Firebase Auth
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              fullName: firebaseUser.displayName,
              role: 'customer',
              createdAt: new Date(),
              photoURL: firebaseUser.photoURL
            });
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

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
