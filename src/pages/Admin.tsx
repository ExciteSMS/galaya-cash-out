import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminTransactions from "@/components/admin/AdminTransactions";
import AdminMerchants from "@/components/admin/AdminMerchants";
import AdminDisbursements from "@/components/admin/AdminDisbursements";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import { LayoutDashboard, ArrowLeftRight, Users, Settings, LogOut, Shield, ArrowDownToLine, ScrollText } from "lucide-react";

type AdminTab = "dashboard" | "transactions" | "merchants" | "disbursements" | "audit" | "settings";

const navItems: { tab: AdminTab; label: string; icon: React.ElementType }[] = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { tab: "merchants", label: "Merchants", icon: Users },
  { tab: "disbursements", label: "Disbursements", icon: ArrowDownToLine },
  { tab: "audit", label: "Audit Log", icon: ScrollText },
  { tab: "settings", label: "Settings", icon: Settings },
];

export default function Admin() {
  const { user, loading: authLoading, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-primary text-sm tracking-wider uppercase">
              Galaya Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeTab === item.tab
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "transactions" && <AdminTransactions />}
        {activeTab === "merchants" && <AdminMerchants />}
        {activeTab === "disbursements" && <AdminDisbursements />}
        {activeTab === "audit" && <AdminAuditLog />}
        {activeTab === "settings" && <AdminSettings />}
      </main>
    </div>
  );
}
