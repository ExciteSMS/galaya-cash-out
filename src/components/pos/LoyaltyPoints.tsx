import { useState, useEffect } from "react";
import { ArrowLeft, Star, Gift, Plus, Minus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoyaltyRecord {
  id: string;
  customer_phone: string;
  points: number;
  total_earned: number;
  total_redeemed: number;
}

interface LoyaltyPointsProps {
  onBack: () => void;
}

const LoyaltyPoints = ({ onBack }: LoyaltyPointsProps) => {
  const { merchant } = useAuth();
  const [records, setRecords] = useState<LoyaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPoints, setAddPoints] = useState("");
  const [redeemPhone, setRedeemPhone] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [mode, setMode] = useState<"list" | "add" | "redeem">("list");

  const fetchRecords = async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from("loyalty_points")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("points", { ascending: false });
    setRecords((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [merchant]);

  const handleAddPoints = async () => {
    if (!merchant || !addPhone || !addPoints) return;
    const pts = parseInt(addPoints);
    if (isNaN(pts) || pts <= 0) { toast.error("Enter valid points"); return; }

    const existing = records.find(r => r.customer_phone === addPhone);
    if (existing) {
      await supabase
        .from("loyalty_points")
        .update({
          points: existing.points + pts,
          total_earned: existing.total_earned + pts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("loyalty_points").insert({
        merchant_id: merchant.id,
        customer_phone: addPhone,
        points: pts,
        total_earned: pts,
      });
    }
    toast.success(`Added ${pts} points to ${addPhone}`);
    setAddPhone(""); setAddPoints(""); setMode("list");
    fetchRecords();
  };

  const handleRedeem = async () => {
    if (!redeemPhone || !redeemPoints) return;
    const pts = parseInt(redeemPoints);
    const record = records.find(r => r.customer_phone === redeemPhone);
    if (!record) { toast.error("Customer not found"); return; }
    if (pts > record.points) { toast.error("Insufficient points"); return; }

    await supabase
      .from("loyalty_points")
      .update({
        points: record.points - pts,
        total_redeemed: record.total_redeemed + pts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    toast.success(`Redeemed ${pts} points for ${redeemPhone}`);
    setRedeemPhone(""); setRedeemPoints(""); setMode("list");
    fetchRecords();
  };

  const filtered = records.filter(r => r.customer_phone.includes(search));
  const totalCustomers = records.length;
  const totalPoints = records.reduce((s, r) => s + r.points, 0);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1 hover:bg-muted rounded">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Loyalty Points</h2>
          <p className="text-xs text-muted-foreground">Reward your repeat customers</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
          <Star className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalCustomers}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Customers</p>
        </div>
        <div className="bg-accent border border-border rounded-xl p-3 text-center">
          <Gift className="w-4 h-4 text-accent-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalPoints.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Total Points</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={() => setMode("add")} variant={mode === "add" ? "default" : "outline"} className="flex-1">
          <Plus className="w-3 h-3 mr-1" /> Award
        </Button>
        <Button size="sm" onClick={() => setMode("redeem")} variant={mode === "redeem" ? "default" : "outline"} className="flex-1">
          <Minus className="w-3 h-3 mr-1" /> Redeem
        </Button>
      </div>

      {mode === "add" && (
        <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Award Points</p>
          <Input placeholder="Customer phone" value={addPhone} onChange={e => setAddPhone(e.target.value)} />
          <Input placeholder="Points to award" type="number" value={addPoints} onChange={e => setAddPoints(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddPoints} className="flex-1">Award</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("list")}>Cancel</Button>
          </div>
        </div>
      )}

      {mode === "redeem" && (
        <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Redeem Points</p>
          <Input placeholder="Customer phone" value={redeemPhone} onChange={e => setRedeemPhone(e.target.value)} />
          <Input placeholder="Points to redeem" type="number" value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRedeem} className="flex-1">Redeem</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("list")}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Search & List */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search by phone" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">No loyalty records yet</p>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-medium text-foreground">{r.customer_phone}</p>
                <p className="text-[9px] text-muted-foreground">
                  Earned: {r.total_earned} · Redeemed: {r.total_redeemed}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 text-primary" />
                <span className="text-sm font-bold text-primary">{r.points}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LoyaltyPoints;
