import { Home, PlusCircle, Clock, Wallet, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "sale" | "history" | "wallet" | "settings";

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "sale", label: "Sale", icon: PlusCircle },
  { id: "history", label: "History", icon: Clock },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "settings", label: "Settings", icon: Settings },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => {
  return (
    <nav className="bg-muted border-t border-border px-2">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] transition-colors font-mono",
                isActive
                  ? "text-primary text-glow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("w-4 h-4", tab.id === "sale" && "w-5 h-5")} />
              <span className="font-medium uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
