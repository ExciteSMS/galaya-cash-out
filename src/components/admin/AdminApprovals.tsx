import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllMerchants, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Search, Send } from "lucide-react";
import { toast } from "sonner";

export default function AdminApprovals() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [announcement, setAnnouncement] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMerchants = async () => {
    const data = await getAllMerchants();
    setMerchants(data);
    setLoading(false);
  };

  useEffect(() => { fetchMerchants(); }, []);

  const handleApproval = async (merchant: any, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("merchants")
      .update({ approval_status: status })
      .eq("id", merchant.id);
    if (error) { toast.error("Failed to update"); return; }

    await logAudit(`merchant_${status}`, "merchant", merchant.id, { name: merchant.name });

    // Send notification to merchant
    await supabase.from("notifications").insert({
      merchant_id: merchant.id,
      title: status === "approved" ? "Account Approved! 🎉" : "Account Not Approved",
      message: status === "approved"
        ? "Your merchant account has been approved. You can now accept payments."
        : "Your merchant account application was not approved. Please contact support.",
      type: status === "approved" ? "info" : "alert",
    });

    toast.success(`Merchant ${status}`);
    fetchMerchants();
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return;
    setSending(true);
    
    const approvedMerchants = merchants.filter(m => (m.approval_status || "approved") === "approved");
    const notifications = approvedMerchants.map(m => ({
      merchant_id: m.id,
      title: "📢 Announcement",
      message: announcement.trim(),
      type: "announcement",
    }));

    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) {
        toast.error("Failed to send announcement");
      } else {
        await logAudit("announcement_sent", "notification", undefined, { message: announcement, count: notifications.length });
        toast.success(`Sent to ${notifications.length} merchants`);
        setAnnouncement("");
      }
    }
    setSending(false);
  };

  const filtered = merchants.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name?.toLowerCase().includes(q) || m.phone_number?.includes(q);
    const status = m.approval_status || "approved";
    const matchFilter = filter === "all" || status === filter;
    return matchSearch && matchFilter;
  });

  const pendingCount = merchants.filter(m => m.approval_status === "pending").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold font-display">Approvals</h1>
          {pendingCount > 0 && <Badge variant="destructive">{pendingCount} pending</Badge>}
        </div>
      </div>

      {/* Announcement Broadcast */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Broadcast Announcement</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Type announcement for all merchants..."
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendAnnouncement} disabled={sending || !announcement.trim()} size="sm">
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "pending" && <Clock className="h-3 w-3 mr-1" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Merchant list */}
      <div className="space-y-2">
        {filtered.map(m => {
          const status = m.approval_status || "approved";
          return (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{m.phone_number}</p>
                    <p className="text-[10px] text-muted-foreground">Joined {format(new Date(m.created_at), "dd MMM yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status === "approved" ? "default" : status === "pending" ? "secondary" : "destructive"}>
                      {status}
                    </Badge>
                    {status === "pending" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleApproval(m, "approved")}>
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleApproval(m, "rejected")}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No merchants found</p>
        )}
      </div>
    </div>
  );
}
