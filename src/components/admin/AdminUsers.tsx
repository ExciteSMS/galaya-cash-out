import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Search, ShieldCheck, ShieldX, UserCog } from "lucide-react";
import { toast } from "sonner";

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  merchant: { name: string; phone_number: string } | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "list_users" },
    });
    if (error) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleAdmin = async (user: AppUser) => {
    const isAdmin = user.roles.includes("admin");
    setActing(user.id);

    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: {
        action: isAdmin ? "remove_role" : "assign_role",
        target_user_id: user.id,
        role: "admin",
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || "Failed to update role");
    } else {
      toast.success(isAdmin ? "Admin role removed" : "Admin role assigned");
      await fetchUsers();
    }
    setActing(null);
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.merchant?.name?.toLowerCase().includes(q) || u.merchant?.phone_number?.includes(q);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold font-display">Users & Roles</h1>
          <Badge variant="outline">{users.length} users</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by email, name, or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Mobile: card layout, Desktop: table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium">User</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Merchant</th>
                    <th className="text-center p-3 text-muted-foreground font-medium">Roles</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Last Login</th>
                    <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                    <th className="text-center p-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">
                        <p className="text-xs font-mono">{u.email}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 8)}...</p>
                      </td>
                      <td className="p-3 text-xs">{u.merchant ? `${u.merchant.name} (${u.merchant.phone_number})` : "—"}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {u.roles.length === 0 && <Badge variant="outline">user</Badge>}
                          {u.roles.map(r => (
                            <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "dd MMM HH:mm") : "Never"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {format(new Date(u.created_at), "dd MMM yyyy")}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={acting === u.id}
                          onClick={() => toggleAdmin(u)}
                          className="text-xs"
                        >
                          {u.roles.includes("admin") ? (
                            <><ShieldX className="h-3.5 w-3.5 mr-1 text-destructive" /> Remove Admin</>
                          ) : (
                            <><ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" /> Make Admin</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono truncate">{u.email}</p>
                  {u.merchant && <p className="text-xs text-muted-foreground">{u.merchant.name} · {u.merchant.phone_number}</p>}
                </div>
                <div className="flex gap-1 ml-2">
                  {u.roles.length === 0 && <Badge variant="outline" className="text-[10px]">user</Badge>}
                  {u.roles.map(r => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Last login: {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "dd MMM HH:mm") : "Never"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={acting === u.id}
                  onClick={() => toggleAdmin(u)}
                  className="text-[10px] h-7 px-2"
                >
                  {u.roles.includes("admin") ? (
                    <><ShieldX className="h-3 w-3 mr-1 text-destructive" /> Remove Admin</>
                  ) : (
                    <><ShieldCheck className="h-3 w-3 mr-1 text-primary" /> Make Admin</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
        )}
      </div>
    </div>
  );
}
