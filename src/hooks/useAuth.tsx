import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Merchant {
  id: string;
  phone_number: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  merchant: Merchant | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<{ error?: string }>;
  register: (phone: string, pin: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function phoneToEmail(phone: string) {
  return `${phone}@galaya.app`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMerchant = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("merchants")
      .select("id, phone_number, name")
      .eq("user_id", userId)
      .single();
    setMerchant(data);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchMerchant(u.id);
      } else {
        setMerchant(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchMerchant(u.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchMerchant]);

  const login = async (phone: string, pin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: pin,
    });
    if (error) return { error: "Invalid phone or PIN" };
    return {};
  };

  const register = async (phone: string, pin: string, name: string) => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { error: "PIN must be 4 digits" };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password: pin,
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return { error: "Phone number already registered" };
      }
      return { error: authError.message };
    }

    if (authData.user) {
      const { error: merchantError } = await supabase.from("merchants").insert({
        user_id: authData.user.id,
        phone_number: phone,
        name: name || "Merchant",
      });
      if (merchantError) {
        return { error: "Failed to create merchant profile" };
      }
      await fetchMerchant(authData.user.id);
    }

    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMerchant(null);
  };

  return (
    <AuthContext.Provider value={{ user, merchant, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
