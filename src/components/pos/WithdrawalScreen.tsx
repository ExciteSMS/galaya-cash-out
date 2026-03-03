import { useState, useEffect } from "react";
import { ArrowLeft, ArrowDownToLine, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction } from "@/lib/api";

interface PayoutAccount {
  id: string;
  provider: string;
  phone_number: string;
  is_default: boolean;
}

interface Disbursement {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface WithdrawalScreenProps {
  transactions: Transaction[];
  onBack: () => void;
}

const WithdrawalScreen = ({ transactions, onBack }: WithdrawalScreenProps) => {
  const { merchant } = useAuth();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate available balance: total successful sales minus fees minus previous disbursements
  const totalEarnings = transactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount - t.fee, 0);

  const totalDisbursed = disbursements
    .filter((d) => d.status === "success" || d.status === "pending" || d.status === "processing")
    .reduce((sum, d) => sum + d.amount, 0);

  const availableBalance = totalEarnings - totalDisbursed;

  useEffect(() => {
    if (!merchant) return;

    const fetchData = async () => {
      const [accountsRes, disbursementsRes] = await Promise.all([
        supabase
          .from("merchant_payout_accounts")
          .select("*")
          .eq("merchant_id", merchant.id)
          .order("created_at"),
        supabase
          .from("disbursements")
          .select("*")
          .eq("merchant_id", merchant.id)
          .order("created_at", { ascending: false }),
      ]);
      setAccounts(accountsRes.data || []);
      setDisbursements(disbursementsRes.data || []);

      const defaultAcc = (accountsRes.data || []).find((a) => a.is_default);
      if (defaultAcc) setSelectedAccount(defaultAcc.id);
    };
    fetchData();
  }, [merchant]);

  const withdrawalAmount = parseFloat(amount) || 0;
  const withdrawalFee = Math.max(1, Math.round(withdrawalAmount * 0.01 * 100) / 100);
  const netAmount = withdrawalAmount - withdrawalFee;

  const handleWithdraw = async () => {
    if (!merchant || !selectedAccount || withdrawalAmount < 10) {
      toast.error("Minimum withdrawal is K10");
      return;
    }
    if (withdrawalAmount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("disbursements").insert({
      merchant_id: merchant.id,
      payout_account_id: selectedAccount,
      amount: withdrawalAmount,
      fee: withdrawalFee,
      net_amount: netAmount,
      status: "pending",
    });

    if (error) {
      toast.error("Withdrawal request failed");
    } else {
      toast.success("Withdrawal request submitted");
      setAmount("");
      // Refresh disbursements
      const { data } = await supabase
        .from("disbursements")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false });
      setDisbursements(data || []);
    }
    setSubmitting(false);
  };

  const selectedAcc = accounts.find((a) => a.id === selectedAccount);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Withdraw</h2>
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
        <p className="text-2xl font-bold text-primary font-display">K{availableBalance.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Total earned: K{totalEarnings.toLocaleString()} · Withdrawn: K{totalDisbursed.toLocaleString()}
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Add a payout account in Settings first</p>
        </div>
      ) : (
        <>
          {/* Account selector */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">Payout Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.provider} · {acc.phone_number} {acc.is_default ? "(default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Amount input */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1 block">Amount (K)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={10}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {withdrawalAmount >= 10 && (
            <div className="bg-card border border-border rounded-xl p-3 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Amount</span>
                <span>K{withdrawalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Fee (1%)</span>
                <span>-K{withdrawalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium text-foreground border-t border-border pt-1">
                <span>You receive</span>
                <span>K{netAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={submitting || withdrawalAmount < 10 || withdrawalAmount > availableBalance || !selectedAccount}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {submitting ? "Processing..." : "Withdraw"}
          </button>
        </>
      )}

      {/* Recent disbursements */}
      {disbursements.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Withdrawals</h3>
          <div className="space-y-2">
            {disbursements.slice(0, 5).map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">K{d.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()} · Fee: K{d.fee}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  d.status === "success" ? "bg-success/10 text-success" :
                  d.status === "failed" ? "bg-destructive/10 text-destructive" :
                  "bg-primary/10 text-primary"
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalScreen;
