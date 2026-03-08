import { useState, useEffect } from "react";
import { ArrowLeft, ArrowDownToLine, Wallet, Plus, User, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { processSettlement, lookupAccount, Transaction } from "@/lib/api";
import { toast } from "sonner";

interface PayoutAccount {
  id: string;
  provider: string;
  phone_number: string;
  is_default: boolean;
  account_name?: string;
}

interface Disbursement {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  reference: string | null;
  created_at: string;
}

interface WithdrawalScreenProps {
  transactions: Transaction[];
  onBack: () => void;
}

const PROVIDERS = [
  { value: "MTN", label: "MTN", color: "bg-mtn" },
  { value: "Airtel", label: "Airtel", color: "bg-airtel" },
  { value: "Zamtel", label: "Zamtel", color: "bg-zamtel" },
];

const WithdrawalScreen = ({ transactions, onBack }: WithdrawalScreenProps) => {
  const { merchant } = useAuth();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [platformFeePct, setPlatformFeePct] = useState(1);
  const [gatewayFeePct, setGatewayFeePct] = useState(3.5);

  // Inline add account state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newProvider, setNewProvider] = useState("MTN");
  const [newPhone, setNewPhone] = useState("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);

  const totalEarnings = transactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount - t.fee, 0);

  const totalDisbursed = disbursements
    .filter((d) => d.status === "success" || d.status === "pending" || d.status === "processing")
    .reduce((sum, d) => sum + d.amount, 0);

  const availableBalance = totalEarnings - totalDisbursed;

  const fetchAccounts = async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from("merchant_payout_accounts")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at");
    const accs = (data || []) as PayoutAccount[];
    setAccounts(accs);
    const defaultAcc = accs.find((a) => a.is_default);
    if (defaultAcc) setSelectedAccount(defaultAcc.id);
    else if (accs.length > 0) setSelectedAccount(accs[0].id);
  };

  useEffect(() => {
    if (!merchant) return;
    const fetchData = async () => {
      const [, disbursementsRes] = await Promise.all([
        fetchAccounts(),
        supabase
          .from("disbursements")
          .select("*")
          .eq("merchant_id", merchant.id)
          .order("created_at", { ascending: false }),
      ]);
      setDisbursements(disbursementsRes.data || []);

      try {
        const { data: settings } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["withdrawal_platform_fee_pct", "withdrawal_gateway_fee_pct"]);
        if (settings) {
          settings.forEach((s) => {
            if (s.key === "withdrawal_platform_fee_pct") setPlatformFeePct(parseFloat(s.value) || 1);
            if (s.key === "withdrawal_gateway_fee_pct") setGatewayFeePct(parseFloat(s.value) || 3.5);
          });
        }
      } catch {
        // Use defaults
      }
    };
    fetchData();
  }, [merchant]);

  const withdrawalAmount = parseFloat(amount) || 0;
  const platformFee = Math.round(withdrawalAmount * (platformFeePct / 100) * 100) / 100;
  const gatewayFee = Math.round(withdrawalAmount * (gatewayFeePct / 100) * 100) / 100;
  const totalFee = Math.round((platformFee + gatewayFee) * 100) / 100;
  const netAmount = Math.round((withdrawalAmount - totalFee) * 100) / 100;

  const handleVerify = async () => {
    if (!newPhone || newPhone.length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setVerifying(true);
    setVerifiedName(null);
    try {
      const result = await lookupAccount(newPhone);
      if (result.success && result.account_name) {
        setVerifiedName(result.account_name);
        toast.success(`Account found: ${result.account_name}`);
      } else {
        toast.error(result.error || "Could not verify account");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
    setVerifying(false);
  };

  const handleAddAccount = async () => {
    if (!merchant || !newPhone || newPhone.length < 10 || !verifiedName) {
      toast.error("Please verify the account first");
      return;
    }
    setAddingAccount(true);
    const isDefault = accounts.length === 0;
    const { error } = await supabase.from("merchant_payout_accounts").insert({
      merchant_id: merchant.id,
      provider: newProvider,
      phone_number: newPhone,
      is_default: isDefault,
      account_name: verifiedName,
    } as any);
    if (error) {
      toast.error("Failed to add account");
      setAddingAccount(false);
      return;
    }
    toast.success("Payout account added");
    setShowAddAccount(false);
    setNewPhone("");
    setVerifiedName(null);
    await fetchAccounts();
    setAddingAccount(false);
  };

  const handleDeleteAccount = async (id: string) => {
    await supabase.from("merchant_payout_accounts").delete().eq("id", id);
    await fetchAccounts();
    toast.success("Account removed");
  };

  const handleWithdraw = async () => {
    if (!merchant || !selectedAccount || withdrawalAmount < 100) {
      toast.error("Minimum withdrawal is K100");
      return;
    }
    if (withdrawalAmount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      const { data: newDisb, error: insertErr } = await supabase.from("disbursements").insert({
        merchant_id: merchant.id,
        payout_account_id: selectedAccount,
        amount: withdrawalAmount,
        fee: totalFee,
        net_amount: netAmount,
        status: "pending",
      }).select().single();

      if (insertErr || !newDisb) {
        toast.error("Failed to create withdrawal request");
        setSubmitting(false);
        return;
      }

      const result = await processSettlement(newDisb.id);

      if (result.success) {
        toast.success("Withdrawal successful!");
      } else {
        toast.error(result.error || "Settlement failed");
      }

      const { data } = await supabase
        .from("disbursements")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false });
      setDisbursements(data || []);
      setAmount("");
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    }
    setSubmitting(false);
  };

  const selectedAcc = accounts.find((a) => a.id === selectedAccount);
  const getProviderColor = (provider: string) =>
    PROVIDERS.find((p) => p.value === provider)?.color || "bg-muted";

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Withdraw</h2>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Available Balance</p>
        <p className="text-3xl font-bold text-primary font-display">K{availableBalance.toLocaleString()}</p>
        <div className="flex gap-4 mt-2">
          <p className="text-[10px] text-muted-foreground">
            <span className="text-success">↑</span> Earned: K{totalEarnings.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">
            <span className="text-destructive">↓</span> Withdrawn: K{totalDisbursed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payout Account Selection */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-foreground">Payout Account</label>
          <button
            onClick={() => setShowAddAccount(!showAddAccount)}
            className="text-[10px] text-primary font-medium flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3 h-3" /> Add New
          </button>
        </div>

        {/* Inline Add Account */}
        {showAddAccount && (
          <div className="bg-card border border-primary/20 rounded-xl p-3 mb-3 space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex gap-1.5">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setNewProvider(p.value); setVerifiedName(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    newProvider === p.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.value}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="09XXXXXXXX"
                value={newPhone}
                onChange={(e) => { setNewPhone(e.target.value); setVerifiedName(null); }}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={10}
              />
              <button
                onClick={handleVerify}
                disabled={verifying || newPhone.length < 10}
                className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-medium disabled:opacity-50"
              >
                {verifying ? "..." : "Verify"}
              </button>
            </div>
            {verifiedName && (
              <div className="flex items-center gap-2 bg-success/10 border border-success/30 rounded-lg p-2">
                <User className="w-3.5 h-3.5 text-success" />
                <p className="text-xs font-medium text-foreground">{verifiedName} <span className="text-success">✓</span></p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddAccount(false); setVerifiedName(null); setNewPhone(""); }}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                disabled={!verifiedName || addingAccount}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
              >
                {addingAccount ? "Adding..." : "Add Account"}
              </button>
            </div>
          </div>
        )}

        {accounts.length === 0 && !showAddAccount ? (
          <div className="text-center py-6 bg-card border border-dashed border-border rounded-xl">
            <Wallet className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">No payout accounts yet</p>
            <button
              onClick={() => setShowAddAccount(true)}
              className="text-xs text-primary font-medium hover:underline"
            >
              + Add your first account
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-3 border transition-all text-left ${
                  selectedAccount === acc.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-8 h-8 ${getProviderColor(acc.provider)} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {acc.provider[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {acc.provider} · {acc.phone_number}
                  </p>
                  {acc.account_name && (
                    <p className="text-[10px] text-primary flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> {acc.account_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedAccount === acc.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                  {acc.is_default && (
                    <span className="text-[8px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); }}
                    className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-destructive/60" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Amount Input */}
      {accounts.length > 0 && (
        <>
          <div className="mb-3">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Amount (min K100)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">K</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min={100}
                className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Quick amounts */}
            <div className="flex gap-1.5 mt-2">
              {[100, 500, 1000, 2000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(Math.min(preset, availableBalance)))}
                  disabled={preset > availableBalance}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30 transition-colors"
                >
                  K{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Fee breakdown */}
          {withdrawalAmount >= 100 && (
            <div className="bg-card border border-border rounded-xl p-3 mb-3 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Withdrawal amount</span>
                <span>K{withdrawalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform fee ({platformFeePct}%)</span>
                <span className="text-destructive">-K{platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Gateway fee ({gatewayFeePct}%)</span>
                <span className="text-destructive">-K{gatewayFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                <span>You receive</span>
                <span className="text-primary">K{netAmount.toLocaleString()}</span>
              </div>
              {selectedAcc && (
                <p className="text-[10px] text-muted-foreground pt-1">
                  → {selectedAcc.provider} · {selectedAcc.phone_number}
                  {selectedAcc.account_name && ` (${selectedAcc.account_name})`}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={submitting || withdrawalAmount < 100 || withdrawalAmount > availableBalance || !selectedAccount}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Withdraw K${withdrawalAmount >= 100 ? netAmount.toLocaleString() : "0"}`
            )}
          </button>
        </>
      )}

      {/* Recent Withdrawals */}
      {disbursements.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Withdrawals</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {disbursements.slice(0, 10).map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">K{Number(d.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()} · Net: K{Number(d.net_amount).toLocaleString()}
                  </p>
                  {d.reference && <p className="text-[10px] text-muted-foreground font-mono">{d.reference}</p>}
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
