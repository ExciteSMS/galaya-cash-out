import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Send, Clock } from "lucide-react";
import { format } from "date-fns";

interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastNotification[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, created_at")
      .is("merchant_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSending(true);
    try {
      // Get all merchant IDs
      const { data: merchants } = await supabase
        .from("merchants")
        .select("id")
        .eq("status", "active");

      if (!merchants?.length) {
        toast.error("No active merchants found");
        setSending(false);
        return;
      }

      // Insert a notification for each merchant + a null-merchant record for history
      const notifications = [
        { title, message, type, merchant_id: null },
        ...merchants.map((m) => ({
          title,
          message,
          type,
          merchant_id: m.id,
        })),
      ];

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      await logAudit("broadcast_sent", "notifications", undefined, {
        title,
        type,
        merchant_count: merchants.length,
      });

      toast.success(`Broadcast sent to ${merchants.length} merchants`);
      setTitle("");
      setMessage("");
      setType("info");
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to send broadcast");
    }
    setSending(false);
  };

  const typeColors: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    success: "bg-green-500/10 text-green-600",
    urgent: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Broadcast Announcements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send announcements to all active merchants
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Announcement</CardTitle>
          <CardDescription>This will be sent to all active merchants instantly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
            <Input
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">ℹ️ Info</SelectItem>
                <SelectItem value="success">✅ Success</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="urgent">🚨 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Write your announcement message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send Broadcast"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Recent Broadcasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No broadcasts sent yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="secondary" className={`text-xs shrink-0 ${typeColors[n.type] || ""}`}>
                    {n.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(n.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
