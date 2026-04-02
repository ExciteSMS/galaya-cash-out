import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureFlags {
  qrCode: boolean;
  salesGoal: boolean;
  expenseTracker: boolean;
  notifications: boolean;
  withdrawals: boolean;
  refunds: boolean;
  receiptPrint: boolean;
  loyaltyPoints: boolean;
  staffAccounts: boolean;
  darkMode: boolean;
  loaded: boolean;
}

const defaults: FeatureFlags = {
  qrCode: true,
  salesGoal: true,
  expenseTracker: true,
  notifications: true,
  withdrawals: true,
  refunds: true,
  receiptPrint: true,
  loyaltyPoints: true,
  staffAccounts: true,
  darkMode: true,
  loaded: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaults);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaults);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("key, value")
          .like("key", "feature_%");
        const map: Record<string, string> = {};
        (data || []).forEach((s: any) => (map[s.key] = s.value));
        setFlags({
          qrCode: map.feature_qr_code !== "false",
          salesGoal: map.feature_sales_goal !== "false",
          expenseTracker: map.feature_expense_tracker !== "false",
          notifications: map.feature_notifications !== "false",
          withdrawals: map.feature_withdrawals !== "false",
          refunds: map.feature_refunds !== "false",
          receiptPrint: map.feature_receipt_print !== "false",
          loyaltyPoints: map.feature_loyalty_points !== "false",
          staffAccounts: map.feature_staff_accounts !== "false",
          darkMode: map.feature_dark_mode !== "false",
          loaded: true,
        });
      } catch {
        setFlags((prev) => ({ ...prev, loaded: true }));
      }
    };
    load();
  }, []);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
