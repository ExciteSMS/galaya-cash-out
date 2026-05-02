import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Copy, Share2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Referral {
  id: string;
  code: string;
  status: string;
  reward_amount: number;
  reward_paid: boolean;
  created_at: string;
  referred_merchant_id: string | null;
}

const ReferralProgram = ({ onBack }: { onBack: () => void }) => {
  const { merchant } = useAuth();
  const [refs, setRefs] = useState<Referral[]>([]);
  const [myCode, setMyCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!merchant) return;
      const code = `GAL-${merchant.id.slice(0, 6).toUpperCase()}`;
      setMyCode(code);
      const { data } = await supabase
        .from("merchant_referrals")
        .select("*")
        .order("created_at", { ascending: false });
      setRefs((data || []) as Referral[]);
      setLoading(false);
    };
    init();
  }, [merchant]);

  const generateInvite = async () => {
    if (!merchant) return;
    const code = `${myCode}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { error } = await supabase.from("merchant_referrals").insert({
      referrer_merchant_id: merchant.id,
      code,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("New invite code generated");
    const { data } = await supabase.from("merchant_referrals").select("*").order("created_at", { ascending: false });
    setRefs((data || []) as Referral[]);
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied to clipboard");
  };

  const share = (code: string) => {
    const text = `Join Galaya POS using my referral code ${code} and we both earn K50!`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else copy(text);
  };

  const totalEarned = refs.filter((r) => r.reward_paid).reduce((s, r) => s + Number(r.reward_amount), 0);
  const pendingRewards = refs.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Gift className="w-5 h-5" /> Referral Program
        </h2>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-2xl p-5 mb-4">
        <p className="text-xs opacity-80">Earn K50 for every merchant who signs up and goes live</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold font-display">K{totalEarned}</span>
          <span className="text-xs opacity-80">earned</span>
        </div>
        <p className="text-[10px] opacity-70 mt-1">{pendingRewards} pending · {refs.length} total invites</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-1">Your referral code</p>
        <div className="flex items-center justify-between gap-2">
          <code className="text-xl font-bold font-display tracking-wider">{myCode}</code>
          <div className="flex gap-1">
            <button onClick={() => copy(myCode)} className="p-2 bg-accent rounded-lg">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={() => share(myCode)} className="p-2 bg-accent rounded-lg">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <button onClick={generateInvite} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium mb-4 text-sm">
        + Generate one-time invite link
      </button>

      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
        <Users className="w-3 h-3" /> My Invites
      </h3>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
      ) : refs.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">No invites yet</p>
      ) : (
        <div className="space-y-2">
          {refs.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <code className="text-sm font-medium">{r.code}</code>
                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  r.status === "completed" ? "bg-success/10 text-success" :
                  r.status === "pending" ? "bg-muted text-muted-foreground" :
                  "bg-accent text-accent-foreground"
                }`}>
                  {r.status}
                </span>
                {r.reward_paid && <p className="text-[10px] text-success mt-0.5">+K{r.reward_amount}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralProgram;
