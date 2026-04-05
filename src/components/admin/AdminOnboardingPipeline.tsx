import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GitPullRequest, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Merchant {
  id: string;
  name: string;
  phone_number: string;
  approval_status: string;
  approval_note: string | null;
  created_at: string;
  address: string | null;
}

const STAGES = [
  { key: "pending", label: "Pending Review", icon: Clock, color: "text-yellow-500" },
  { key: "approved", label: "Approved", icon: CheckCircle, color: "text-green-500" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-destructive" },
];

export default function AdminOnboardingPipeline() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState<{ id: string; note: string } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("merchants").select("id, name, phone_number, approval_status, approval_note, created_at, address").order("created_at", { ascending: false });
    setMerchants((data as Merchant[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string, note?: string) => {
    await supabase.from("merchants").update({ approval_status: status, approval_note: note || null }).eq("id", id);
    toast.success(`Merchant ${status}`);
    load();
  };

  const grouped = STAGES.map(s => ({
    ...s,
    merchants: merchants.filter(m => m.approval_status === s.key),
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <GitPullRequest className="h-6 w-6 text-primary" /> Onboarding Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track merchant applications from submission to approval</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {grouped.map(stage => (
          <Card key={stage.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <stage.icon className={`h-4 w-4 ${stage.color}`} />
                {stage.label}
                <span className="ml-auto bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{stage.merchants.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {stage.merchants.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No merchants</p>}
              {stage.merchants.map(m => (
                <div key={m.id} className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.phone_number}</p>
                  {m.address && <p className="text-[10px] text-muted-foreground">{m.address}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(m.created_at), "MMM d, yyyy")}</p>
                  {m.approval_note && (
                    <div className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground bg-background rounded p-1.5">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" /> {m.approval_note}
                    </div>
                  )}
                  {stage.key === "pending" && (
                    <div className="flex gap-1.5 mt-2">
                      <Button size="sm" variant="default" className="h-7 text-xs flex-1" onClick={() => updateStatus(m.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNoteModal({ id: m.id, note: "" })}>Reject</Button>
                    </div>
                  )}
                  {stage.key === "rejected" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs mt-2 w-full" onClick={() => updateStatus(m.id, "pending")}>Re-review</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {noteModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm space-y-3">
            <p className="text-sm font-bold text-foreground">Rejection Reason</p>
            <textarea value={noteModal.note} onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder="Why is this merchant being rejected?" rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setNoteModal(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => { updateStatus(noteModal.id, "rejected", noteModal.note); setNoteModal(null); }}>Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
