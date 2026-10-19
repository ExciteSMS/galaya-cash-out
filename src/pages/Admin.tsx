import { lazy, Suspense, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"));
const AdminTransactions = lazy(() => import("@/components/admin/AdminTransactions"));
const AdminMerchants = lazy(() => import("@/components/admin/AdminMerchants"));
const AdminDisbursements = lazy(() => import("@/components/admin/AdminDisbursements"));
const AdminSettings = lazy(() => import("@/components/admin/AdminSettings"));
const AdminAuditLog = lazy(() => import("@/components/admin/AdminAuditLog"));
const AdminFraudFreeze = lazy(() => import("@/components/admin/AdminFraudFreeze"));
const AdminPlatformAnalytics = lazy(() => import("@/components/admin/AdminPlatformAnalytics"));
const AdminRefunds = lazy(() => import("@/components/admin/AdminRefunds"));
const AdminFraudAlerts = lazy(() => import("@/components/admin/AdminFraudAlerts"));
const AdminAnalytics = lazy(() => import("@/components/admin/AdminAnalytics"));
const AdminUsers = lazy(() => import("@/components/admin/AdminUsers"));
const AdminDevices = lazy(() => import("@/components/admin/AdminDevices"));
const AdminApprovals = lazy(() => import("@/components/admin/AdminApprovals"));
const AdminCharges = lazy(() => import("@/components/admin/AdminCharges"));
const AdminPOSFeatures = lazy(() => import("@/components/admin/AdminPOSFeatures"));
const AdminBroadcast = lazy(() => import("@/components/admin/AdminBroadcast"));
const AdminRevenueReports = lazy(() => import("@/components/admin/AdminRevenueReports"));
const AdminSystemHealth = lazy(() => import("@/components/admin/AdminSystemHealth"));
const AdminActivityFeed = lazy(() => import("@/components/admin/AdminActivityFeed"));
const AdminRolePermissions = lazy(() => import("@/components/admin/AdminRolePermissions"));
const AdminOnboardingPipeline = lazy(() => import("@/components/admin/AdminOnboardingPipeline"));
const AdminScheduledReports = lazy(() => import("@/components/admin/AdminScheduledReports"));
const AdminActionNotifications = lazy(() => import("@/components/admin/AdminActionNotifications"));
const AdminFeeSimulator = lazy(() => import("@/components/admin/AdminFeeSimulator"));
const AdminGeoHeatmap = lazy(() => import("@/components/admin/AdminGeoHeatmap"));
const AdminRiskScoring = lazy(() => import("@/components/admin/AdminRiskScoring"));
const AdminFeatureRollouts = lazy(() => import("@/components/admin/AdminFeatureRollouts"));
const AdminSupportInbox = lazy(() => import("@/components/admin/AdminSupportInbox"));
const AdminCustomSMS = lazy(() => import("@/components/admin/AdminCustomSMS"));
const AdminZraInvoices = lazy(() => import("@/components/admin/AdminZraInvoices"));
import {
  LayoutDashboard, ArrowLeftRight, Users, Settings, LogOut, Shield,
  ArrowDownToLine, ScrollText, RotateCcw, ShieldAlert, BarChart3,
  DollarSign, UserCog, Menu, X, CheckSquare, ToggleLeft,
  Megaphone, FileText, Activity, Radio, KeyRound,
  GitPullRequest, Smartphone, Clock, Bell, Calculator, Globe, Beaker, Inbox, MessageSquare, Landmark,
} from "lucide-react";

type AdminTab = "dashboard" | "analytics" | "transactions" | "merchants" | "users" | "devices" | "approvals" | "charges" | "pos_features" | "broadcast" | "sms" | "reports" | "health" | "activity_feed" | "permissions" | "refunds" | "fraud" | "disbursements" | "audit" | "settings" | "onboarding" | "scheduled_reports" | "action_notifications" | "fee_simulator" | "geo" | "risk" | "rollouts" | "support" | "zra" | "fraud_freeze" | "platform_analytics";

const navItems: { tab: AdminTab; label: string; icon: React.ElementType }[] = [
  { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { tab: "analytics", label: "Analytics", icon: BarChart3 },
  { tab: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { tab: "merchants", label: "Merchants", icon: Users },
  { tab: "onboarding", label: "Onboarding", icon: GitPullRequest },
  { tab: "users", label: "Users & Roles", icon: UserCog },
  { tab: "devices", label: "Devices", icon: Smartphone },
  { tab: "approvals", label: "Approvals", icon: CheckSquare },
  { tab: "action_notifications", label: "Alerts", icon: Bell },
  { tab: "charges", label: "Charges & Fees", icon: DollarSign },
  { tab: "fee_simulator", label: "Fee Simulator", icon: Calculator },
  { tab: "pos_features", label: "POS Features", icon: ToggleLeft },
  { tab: "broadcast", label: "Broadcast", icon: Megaphone },
  { tab: "sms", label: "Custom SMS", icon: MessageSquare },
  { tab: "reports", label: "Revenue Reports", icon: FileText },
  { tab: "scheduled_reports", label: "Auto Reports", icon: Clock },
  { tab: "health", label: "System Health", icon: Activity },
  { tab: "activity_feed", label: "Live Feed", icon: Radio },
  { tab: "permissions", label: "Permissions", icon: KeyRound },
  { tab: "refunds", label: "Refunds", icon: RotateCcw },
  { tab: "zra", label: "ZRA Invoices", icon: Landmark },
  { tab: "fraud_freeze", label: "Fraud & Freeze", icon: Landmark },
  { tab: "platform_analytics", label: "Platform Analytics", icon: Landmark },
  { tab: "fraud", label: "Fraud Alerts", icon: ShieldAlert },
  { tab: "risk", label: "Risk Scoring", icon: Shield },
  { tab: "geo", label: "Geo Heatmap", icon: Globe },
  { tab: "support", label: "Support Inbox", icon: Inbox },
  { tab: "rollouts", label: "A/B Rollouts", icon: Beaker },
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
        <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "analytics" && <AdminAnalytics />}
        {activeTab === "transactions" && <AdminTransactions />}
        {activeTab === "merchants" && <AdminMerchants />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "devices" && <AdminDevices />}
        {activeTab === "approvals" && <AdminApprovals />}
        {activeTab === "charges" && <AdminCharges />}
        {activeTab === "pos_features" && <AdminPOSFeatures />}
        {activeTab === "broadcast" && <AdminBroadcast />}
        {activeTab === "sms" && <AdminCustomSMS />}
        {activeTab === "reports" && <AdminRevenueReports />}
        {activeTab === "health" && <AdminSystemHealth />}
        {activeTab === "activity_feed" && <AdminActivityFeed />}
        {activeTab === "permissions" && <AdminRolePermissions />}
        {activeTab === "refunds" && <AdminRefunds />}
        {activeTab === "zra" && <AdminZraInvoices />}
        {activeTab === "fraud_freeze" && <AdminFraudFreeze />}
        {activeTab === "platform_analytics" && <AdminPlatformAnalytics />}
        {activeTab === "fraud" && <AdminFraudAlerts />}
        {activeTab === "disbursements" && <AdminDisbursements />}
        {activeTab === "audit" && <AdminAuditLog />}
        {activeTab === "settings" && <AdminSettings />}
        {activeTab === "onboarding" && <AdminOnboardingPipeline />}
        {activeTab === "scheduled_reports" && <AdminScheduledReports />}
        {activeTab === "action_notifications" && <AdminActionNotifications />}
        {activeTab === "fee_simulator" && <AdminFeeSimulator />}
        {activeTab === "geo" && <AdminGeoHeatmap />}
        {activeTab === "risk" && <AdminRiskScoring />}
        {activeTab === "rollouts" && <AdminFeatureRollouts />}
        {activeTab === "support" && <AdminSupportInbox />}
        </Suspense>
      </main>
    </div>
  );
}
