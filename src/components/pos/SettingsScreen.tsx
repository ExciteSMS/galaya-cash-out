import { useState, useEffect } from "react";
import { Store, CreditCard, Bell, HelpCircle, LogOut, Wallet, Receipt, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import BusinessProfile from "./BusinessProfile";
import PaymentSettings from "./PaymentSettings";
import NotificationSettings from "./NotificationSettings";
import HelpSupport from "./HelpSupport";
import PayoutAccounts from "./PayoutAccounts";
import ExpenseTracker from "./ExpenseTracker";
import SalesGoalSettings from "./SalesGoalSettings";
import { getTransactions, Transaction } from "@/lib/api";

type SettingsView = "main" | "profile" | "payments" | "notifications" | "help" | "payout" | "expenses" | "goal";

const SettingsScreen = () => {
  const { merchant, logout } = useAuth();
  const features = useFeatureFlags();
  const [view, setView] = useState<SettingsView>("main");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactions().then(setTransactions).catch(console.error);
  }, []);

  if (view === "profile") return <BusinessProfile onBack={() => setView("main")} />;
  if (view === "payments") return <PaymentSettings onBack={() => setView("main")} />;
  if (view === "notifications") return <NotificationSettings onBack={() => setView("main")} />;
  if (view === "help") return <HelpSupport onBack={() => setView("main")} />;
  if (view === "payout") return <PayoutAccounts onBack={() => setView("main")} />;
  if (view === "expenses") return <ExpenseTracker onBack={() => setView("main")} transactions={transactions} />;
  if (view === "goal") return <SalesGoalSettings onBack={() => setView("main")} />;

  const items = [
    { icon: Store, label: "Business Profile", desc: "Store name, address, tier", key: "profile" as const },
    { icon: Target, label: "Daily Sales Goal", desc: "Set your daily target", key: "goal" as const },
    { icon: Receipt, label: "Expenses", desc: "Track costs & profit/loss", key: "expenses" as const },
    { icon: CreditCard, label: "Payment Settings", desc: "Mobile money providers", key: "payments" as const },
    { icon: Wallet, label: "Payout Accounts", desc: "Where you receive earnings", key: "payout" as const },
    { icon: Bell, label: "Notifications", desc: "Transaction alerts", key: "notifications" as const },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQ, contact us", key: "help" as const },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="font-display font-bold text-lg text-foreground mb-1">Settings</h2>
      <p className="text-xs text-muted-foreground mb-1">{merchant?.name} · {merchant?.phone_number}</p>
      <p className="text-xs text-muted-foreground mb-6">Manage your POS</p>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => setView(item.key)}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors text-left"
          >
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <item.icon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <button onClick={logout} className="flex items-center gap-2 text-destructive text-sm font-medium hover:underline">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
        <p className="text-[10px] text-muted-foreground mt-3">Galaya Payment Solution v2.0</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
