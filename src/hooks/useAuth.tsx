import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { guardedLogin, type GuardCode } from "@/lib/authGuard";
import type { MerchantRole } from "@/lib/permissions";
import { bindDeviceToUser, verifyDeviceForUser, sendDeviceHeartbeat } from "@/lib/deviceId";

interface Merchant {
  id: string;
  phone_number: string;
  name: string;
  daily_sales_goal?: number;
  approval_status?: string;
}

interface AuthContextType {
  user: User | null;
  merchant: Merchant | null;
  role: MerchantRole | null;
  loading: boolean;
  login: (phone: string, pin: string, otp?: string) => Promise<{ error?: string; code?: GuardCode }>;
  register: (phone: string, pin: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function phoneToEmail(phone: string) {
  return `${phone}@galaya.app`;
}

// Supabase requires min 6 char passwords; pad the 4-digit PIN
function pinToPassword(pin: string) {
  return `galaya_${pin}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [role, setRole] = useState<MerchantRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMerchant = useCallback(async () => {
    // Works for owners and staff: the database resolves both to a merchant.
    const { data: merchantId } = await supabase.rpc("get_merchant_id");
    if (!merchantId) { setMerchant(null); setRole(null); return; }
    const [{ data }, { data: r }] = await Promise.all([
      supabase.from("merchants").select("id, phone_number, name, daily_sales_goal, approval_status").eq("id", merchantId).single(),
      supabase.rpc("merchant_role"),
    ]);
    setMerchant(data);
    setRole((r as MerchantRole) ?? null);
  }, []);

  useEffect(() => {
    let initialised = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only handle subsequent events after initial session is loaded
      if (!initialised) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchMerchant();
      } else {
        setMerchant(null); setRole(null);
      }
    });

    // Use getSession as the single source of truth for initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      if (u) {
        const check = await verifyDeviceForUser(u.id);
        if (!check.ok) {
          await supabase.auth.signOut();
          setUser(null);
          setMerchant(null); setRole(null);
          setLoading(false);
          initialised = true;
          return;
        }
        fetchMerchant();
      }
      setUser(u);
      setLoading(false);
      initialised = true;
    });

    return () => subscription.unsubscribe();
  }, [fetchMerchant]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(async () => {
      const { disabled } = await sendDeviceHeartbeat(user.id);
      if (disabled) await supabase.auth.signOut();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [user]);

  const login = async (phone: string, pin: string, otp?: string) => {
    const result = await guardedLogin(phone, pin, otp);
    if (!result.ok) return { error: result.error ?? "Invalid phone or PIN", code: result.code };
    const { data: { user: signedIn } } = await supabase.auth.getUser();
    if (signedIn) {
      const check = await verifyDeviceForUser(signedIn.id);
      if (!check.ok) {
        await supabase.auth.signOut();
        return { error: check.reason || "Device not authorised" };
      }
    }
    return {};
  };

  const register = async (phone: string, pin: string, name: string) => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { error: "PIN must be 4 digits" };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password: pinToPassword(pin),
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
      await bindDeviceToUser(authData.user.id);
      await fetchMerchant();
    }

    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMerchant(null); setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, merchant, role, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
