import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, UserCog, Search, Plus, Save, Trash2 } from "lucide-react";
import { logAudit } from "@/lib/adminApi";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
  merchant_name?: string;
}

// Define section permissions for different admin roles
const ADMIN_SECTIONS = [
  { key: "dashboard", label: "Dashboard", desc: "View overview metrics" },
  { key: "analytics", label: "Analytics", desc: "View detailed analytics" },
  { key: "transactions", label: "Transactions", desc: "View & manage transactions" },
  { key: "merchants", label: "Merchants", desc: "View & manage merchants" },
  { key: "users", label: "Users & Roles", desc: "Manage users and permissions" },
  { key: "approvals", label: "Approvals", desc: "Approve/reject merchant applications" },
  { key: "charges", label: "Charges & Fees", desc: "Configure platform fees" },
  { key: "pos_features", label: "POS Features", desc: "Toggle merchant features" },
  { key: "broadcast", label: "Broadcast", desc: "Send notifications to merchants" },
  { key: "reports", label: "Revenue Reports", desc: "View & export financial reports" },
  { key: "health", label: "System Health", desc: "Monitor system status" },
  { key: "refunds", label: "Refunds", desc: "Process refund requests" },
  { key: "fraud", label: "Fraud Alerts", desc: "Manage fraud alerts" },
  { key: "disbursements", label: "Disbursements", desc: "View merchant payouts" },
  { key: "audit", label: "Audit Log", desc: "View admin activity history" },
  { key: "settings", label: "Settings", desc: "Manage platform settings" },
];

export default function AdminRolePermissions() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetchRoles = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Enrich with merchant info
      const enriched: UserRole[] = [];
      for (const role of data) {
        const { data: merchantData } = await supabase
          .from("merchants")
          .select("name, phone_number")
          .eq("user_id", role.user_id)
          .single();
        enriched.push({
          ...role,
          merchant_name: merchantData?.name || "Unknown",
          user_email: merchantData?.phone_number || role.user_id.slice(0, 8),
        });
      }
      setRoles(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleRemoveRole = async (roleRecord: UserRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleRecord.id);
    if (error) {
      toast.error("Failed to remove role");
      return;
    }
    await logAudit("role_removed", "user_roles", roleRecord.id, { user_id: roleRecord.user_id, role: roleRecord.role });
    toast.success("Role removed");
    fetchRoles();
  };

  const filtered = roles.filter(r => 
    r.merchant_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.user_email?.includes(search) ||
    r.role.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Role Permissions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage admin roles and section access controls
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-foreground">{roles.filter(r => r.role === "admin").length}</p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-2xl font-bold text-foreground">{roles.filter(r => r.role === "user").length}</p>
          <p className="text-xs text-muted-foreground">Users</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-2xl font-bold text-foreground">{roles.length}</p>
          <p className="text-xs text-muted-foreground">Total Roles</p>
        </div>
      </div>

      {/* Section Access Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Section Access Matrix
          </CardTitle>
          <CardDescription>Overview of which sections each role can access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Section</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Admin</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_SECTIONS.map(section => (
                  <tr key={section.key} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-foreground">{section.label}</p>
                      <p className="text-[10px] text-muted-foreground">{section.desc}</p>
                    </td>
                    <td className="text-center py-2 px-3">
                      <div className="w-4 h-4 rounded-full bg-primary mx-auto" title="Full access" />
                    </td>
                    <td className="text-center py-2 px-3">
                      <div className="w-4 h-4 rounded-full bg-border mx-auto" title="No access" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Role Assignments</CardTitle>
              <CardDescription>Users with assigned roles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No roles found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      r.role === "admin" ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Shield className={`w-4 h-4 ${r.role === "admin" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.merchant_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.user_email} · {r.user_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.role === "admin" ? "default" : "secondary"}>{r.role}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveRole(r)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
