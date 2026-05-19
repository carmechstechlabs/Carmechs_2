import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { UserProfile, AuthState } from "../types";

const AuthContext = createContext<AuthState & { logout: () => Promise<void> }>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isMechanic: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        let userDocData: Partial<UserProfile> | null = null;
        let adminDocRole: string | null = null;
        let userLoaded = false;
        let adminLoaded = false;

        const updateAuthState = () => {
          if (!userLoaded || !adminLoaded) return;

          const effectiveRole =
            adminDocRole ||
            userDocData?.role ||
            (firebaseUser.email === "carmechstechlabs@gmail.com" ? "super_admin" : "customer");

          const referralCode =
            userDocData?.referralCode || Math.random().toString(36).substring(2, 8).toUpperCase();

          const mergedUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            fullName: userDocData?.fullName || firebaseUser.displayName || "",
            role: effectiveRole as UserProfile["role"],
            referralCode,
            bonusBalance: userDocData?.bonusBalance || 0,
            createdAt: userDocData?.createdAt || new Date(),
            photoURL: firebaseUser.photoURL,
            profileCompleted: userDocData?.profileCompleted ?? false,
            ...(userDocData as any),
          };

          setUser(mergedUser);
          setLoading(false);
        };

        const unsubscribeUser = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              userDocData = docSnap.data() as UserProfile;
            } else {
              userDocData = null;
            }
            userLoaded = true;
            updateAuthState();
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
            userLoaded = true;
            updateAuthState();
          }
        );

        const unsubscribeAdmin = onSnapshot(
          doc(db, "admins", firebaseUser.uid),
          (docSnap) => {
            adminDocRole = docSnap.exists() ? (docSnap.data().role as string) : null;
            adminLoaded = true;
            updateAuthState();
          },
          () => {
            adminLoaded = true;
            updateAuthState();
          }
        );

        return () => {
          unsubscribeUser();
          unsubscribeAdmin();
        };
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
  const isMechanic = user?.role === 'mechanic';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, isMechanic, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
