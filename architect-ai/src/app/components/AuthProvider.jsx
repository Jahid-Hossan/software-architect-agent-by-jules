"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";

const AuthContext = createContext({
  user: null,
  loading: true,
  isAllowedOwner: false,
  signIn: async () => {},
  logOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAllowedOwner, setIsAllowedOwner] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // We do a client-side check for UI purposes, but the true security
        // is the server-side check in the server actions using Next.js / API.
        try {
          const res = await fetch("/api/auth/check-owner", {
            headers: {
              Authorization: `Bearer ${await currentUser.getIdToken()}`
            }
          });
          const data = await res.json();
          setIsAllowedOwner(data.isOwner);
        } catch (error) {
          console.error("Failed to check owner status", error);
          setIsAllowedOwner(false);
        }
      } else {
        setUser(null);
        setIsAllowedOwner(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in", error);
      setLoading(false);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAllowedOwner, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}
