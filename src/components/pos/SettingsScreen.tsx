import { Store, CreditCard, Bell, HelpCircle, LogOut } from "lucide-react";

const SettingsScreen = () => {
  const items = [
    { icon: Store, label: "Business Profile", desc: "Store name, address" },
    { icon: CreditCard, label: "Payment Settings", desc: "Mobile money accounts" },
    { icon: Bell, label: "Notifications", desc: "Transaction alerts" },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQ, contact us" },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="font-display font-bold text-lg text-foreground mb-1">Settings</h2>
      <p className="text-xs text-muted-foreground mb-6">Manage your POS</p>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.label}
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
        <button className="flex items-center gap-2 text-destructive text-sm font-medium hover:underline">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
        <p className="text-[10px] text-muted-foreground mt-3">Galaya Payment Solution v2.0</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
