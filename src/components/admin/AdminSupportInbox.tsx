import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Ticket {
  id: string;
  merchant_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
}

export default function AdminSupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets((data || []) as Ticket[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  const respond = async () => {
    if (!selected || !reply.trim()) return;
    await supabase.from("support_tickets").update({
      admin_reply: reply,
      status: "resolved",
      updated_at: new Date().toISOString(),
    }).eq("id", selected.id);
    toast.success("Reply sent, ticket resolved");
    setReply("");
    setSelected(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Inbox className="h-6 w-6 text-primary" />
          Support Inbox
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage merchant support tickets.</p>
      </div>

      <div className="flex gap-2">
        {(["open", "resolved", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f} ({tickets.filter((t) => f === "all" || t.status === f).length})
          </Button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
              filtered.length === 0 ? <p className="text-sm text-muted-foreground">No tickets</p> :
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selected?.id === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{t.subject}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      t.status === "open" ? "bg-yellow-500/10 text-yellow-700" : "bg-success/10 text-success"
                    }`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(t.created_at).toLocaleString()}</p>
                </button>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selected ? selected.subject : "Select a ticket"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Pick a ticket to view details and reply.</p>
            ) : (
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">{selected.message}</div>
                {selected.admin_reply && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-[10px] font-medium text-primary mb-1">Your reply:</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.admin_reply}</p>
                  </div>
                )}
                {selected.status === "open" && (
                  <>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type a reply..."
                      rows={4}
                      className="w-full bg-muted rounded-lg p-3 text-sm outline-none resize-none"
                    />
                    <Button onClick={respond} disabled={!reply.trim()} className="w-full">
                      <Send className="w-4 h-4 mr-2" /> Send & resolve
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
