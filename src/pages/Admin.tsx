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
import AdminRefunds from "@/components/admin/AdminRefunds";
import AdminFraudAlerts from "@/components/admin/AdminFraudAlerts";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminTiers from "@/components/admin/AdminTiers";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminApprovals from "@/components/admin/AdminApprovals";
import {
  LayoutDashboard, ArrowLeftRight, Users, Settings, LogOut, Shield,
  ArrowDownToLine, ScrollText, RotateCcw, ShieldAlert, BarChart3,
  Crown, UserCog, Menu, X, CheckSquare,
} from "lucide-react";

type AdminTab = "dashboard" | "analytics" | "transactions" | "merchants" | "users" | "approvals" | "tiers" | "refunds" | "fraud" | "disbursements" | "audit" | "settings";

const navItems: { tab: AdminTab; label: string; icon: React.ElementType }[] = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "analytics", label: "Analytics", icon: BarChart3 },
  { tab: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { tab: "merchants", label: "Merchants", icon: Users },
  { tab: "users", label: "Users & Roles", icon: UserCog },
  { tab: "approvals", label: "Approvals", icon: CheckSquare },
  { tab: "tiers", label: "Tiers", icon: Crown },
  { tab: "refunds", label: "Refunds", icon: RotateCcw },
  { tab: "fraud", label: "Fraud Alerts", icon: ShieldAlert },
  { tab: "disbursements", label: "Disbursements", icon: ArrowDownToLine },
  { tab: "audit", label: "Audit Log", icon: ScrollText },
  { tab: "settings", label: "Settings", icon: Settings },
];

export default function Admin() {
  const { user, loading: authLoading, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleNav = (tab: AdminTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-display font-bold text-primary text-xs tracking-wider uppercase">
            Galaya Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground capitalize">{activeTab}</span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-muted">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 md:z-auto
        h-full md:h-screen
        w-64 border-r border-border bg-card flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Desktop header */}
        <div className="hidden md:flex p-4 border-b border-border items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-primary text-sm tracking-wider uppercase">
            Galaya Admin
          </span>
        </div>

        {/* Mobile header inside sidebar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-primary text-xs tracking-wider uppercase">Menu</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => handleNav(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeTab === item.tab
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
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

      <main className="flex-1 p-3 md:p-6 overflow-auto min-h-0">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "analytics" && <AdminAnalytics />}
        {activeTab === "transactions" && <AdminTransactions />}
        {activeTab === "merchants" && <AdminMerchants />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "approvals" && <AdminApprovals />}
        {activeTab === "tiers" && <AdminTiers />}
        {activeTab === "refunds" && <AdminRefunds />}
        {activeTab === "fraud" && <AdminFraudAlerts />}
        {activeTab === "disbursements" && <AdminDisbursements />}
        {activeTab === "audit" && <AdminAuditLog />}
        {activeTab === "settings" && <AdminSettings />}
      </main>
    </div>
  );
}
