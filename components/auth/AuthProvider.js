"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const AuthContext = createContext({ user: null, loading: false, enabled: false, signOut: async () => {} });

// Exposes the signed-in Supabase user (or null). Signing in is optional; the app works without it.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    enabled: Boolean(supabase),
    // Local scope: clears this device's session immediately, even offline.
    signOut: () => supabase?.auth.signOut({ scope: "local" }),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const displayName = (user) => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
