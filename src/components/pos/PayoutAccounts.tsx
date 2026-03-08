import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Wallet, Check, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lookupAccount } from "@/lib/api";
import { toast } from "sonner";

interface PayoutAccount {
  id: string;
  provider: string;
  phone_number: string;
  is_default: boolean;
  account_name?: string;
}

interface PayoutAccountsProps {
  onBack: () => void;
}

const PROVIDERS = [
  { value: "MTN", label: "MTN Money", color: "bg-mtn" },
  { value: "Airtel", label: "Airtel Money", color: "bg-airtel" },
  { value: "Zamtel", label: "Zamtel Kwacha", color: "bg-zamtel" },
];

const PayoutAccounts = ({ onBack }: PayoutAccountsProps) => {
  const { merchant } = useAuth();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [adding, setAdding] = useState(false);
  const [newProvider, setNewProvider] = useState("MTN");
  const [newPhone, setNewPhone] = useState("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from("merchant_payout_accounts")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at");
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [merchant]);

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

  const handleAdd = async () => {
    if (!merchant || !newPhone || newPhone.length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    if (!verifiedName) {
      toast.error("Please verify the account first");
      return;
    }
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
      return;
    }
    toast.success("Payout account added");
    setAdding(false);
    setNewPhone("");
    setVerifiedName(null);
    fetchAccounts();
  };

  const handleSetDefault = async (id: string) => {
    if (!merchant) return;
    await supabase
      .from("merchant_payout_accounts")
      .update({ is_default: false })
      .eq("merchant_id", merchant.id);
    await supabase
      .from("merchant_payout_accounts")
      .update({ is_default: true })
      .eq("id", id);
    fetchAccounts();
    toast.success("Default account updated");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("merchant_payout_accounts").delete().eq("id", id);
    fetchAccounts();
    toast.success("Account removed");
  };

  const getProviderColor = (provider: string) =>
    PROVIDERS.find((p) => p.value === provider)?.color || "bg-muted";

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Payout Accounts</h2>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Add your mobile money account to receive payouts. MoneyUnify charges 3.5% on settlements.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                <div className={`w-10 h-10 ${getProviderColor(acc.provider)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                  {acc.provider[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{acc.provider} Money</p>
                  <p className="text-xs text-muted-foreground">{acc.phone_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  {acc.is_default ? (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(acc.id)}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-full border border-border"
                    >
                      Set default
                    </button>
                  )}
                  <button onClick={() => handleDelete(acc.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && !adding && (
              <p className="text-center text-sm text-muted-foreground py-6">No payout accounts yet</p>
            )}
          </div>

          {adding ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setNewProvider(p.value); setVerifiedName(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
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
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={10}
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || newPhone.length < 10}
                  className="px-3 py-2.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium disabled:opacity-50"
                >
                  {verifying ? "..." : "Verify"}
                </button>
              </div>

              {verifiedName && (
                <div className="flex items-center gap-2 bg-success/10 border border-success/30 rounded-lg p-3">
                  <User className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{verifiedName}</p>
                    <p className="text-[10px] text-muted-foreground">Account verified ✓</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setAdding(false); setVerifiedName(null); }} className="flex-1 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!verifiedName}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Add Account
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Payout Account
            </button>
          )}
        </>
      )}

      <div className="mt-6 bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-1">Settlement Fees</p>
        <p className="text-xs text-muted-foreground">3.5% charged by MoneyUnify on settlements. Min balance K100.</p>
      </div>
    </div>
  );
};

export default PayoutAccounts;
