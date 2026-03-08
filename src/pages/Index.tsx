import { useState, useCallback, useEffect } from "react";
import BottomNav, { Tab } from "@/components/pos/BottomNav";
import Dashboard from "@/components/pos/Dashboard";
import NewSale from "@/components/pos/NewSale";
import UssdPushScreen from "@/components/pos/UssdPushScreen";
import SaleReceipt from "@/components/pos/SaleReceipt";
import TransactionHistory from "@/components/pos/TransactionHistory";
import WithdrawalScreen from "@/components/pos/WithdrawalScreen";
import SettingsScreen from "@/components/pos/SettingsScreen";
import AuthScreen from "@/components/pos/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import { Provider, Transaction, processPayment, getTransactions, detectProvider } from "@/lib/api";
import { toast } from "sonner";

type SaleFlow = "idle" | "new" | "ussd" | "receipt";

const Index = () => {
  const { user, merchant, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [saleFlow, setSaleFlow] = useState<SaleFlow>("idle");
  const [provider, setProvider] = useState<Provider>("MTN");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [moneyunifyTxId, setMoneyunifyTxId] = useState<string>("");
  const [dbTxId, setDbTxId] = useState<string>("");

  useEffect(() => {
    if (!merchant) return;
    getTransactions().then(setTransactions).catch(console.error);
  }, [merchant]);

  const handleStartPayment = async (p: Provider, ph: string, amt: number) => {
    setProvider(p);
    setPhone(ph);
    setAmount(amt);

    if (!merchant) return;

    try {
      // Call MoneyUnify Request to Pay
      const result = await processPayment(merchant.id, p, ph, amt);

      if (result.success && result.transaction_id) {
        setTransaction(result.transaction);
        setMoneyunifyTxId(result.transaction_id);
        setDbTxId(result.transaction.id);
        setSaleFlow("ussd");
      } else {
        toast.error(result.error || "Payment request failed");
        setSaleFlow("new");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      setSaleFlow("new");
    }
  };

  const handleUssdComplete = useCallback((success: boolean) => {
    if (success && transaction) {
      // Update local transaction status
      const updatedTx = { ...transaction, status: "success" };
      setTransaction(updatedTx);
      setTransactions(prev => {
        const existing = prev.findIndex(t => t.id === updatedTx.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = updatedTx;
          return copy;
        }
        return [updatedTx, ...prev];
      });
      setSaleFlow("receipt");
    } else {
      if (transaction) {
        setTransactions(prev => {
          const existing = prev.findIndex(t => t.id === transaction.id);
          if (existing >= 0) {
            const copy = [...prev];
            copy[existing] = { ...transaction, status: "failed" };
            return copy;
          }
          return [{ ...transaction, status: "failed" }, ...prev];
        });
      }
      setSaleFlow("new");
    }
  }, [transaction]);

  const handleNewSale = () => {
    setSaleFlow("new");
    setTransaction(null);
    setProvider("MTN");
    setPhone("");
    setAmount(0);
  };

  const handleRepeatSale = (repeatPhone: string, repeatAmount: number) => {
    const detected = detectProvider(repeatPhone);
    setPhone(repeatPhone);
    setAmount(repeatAmount);
    if (detected) setProvider(detected);
    setSaleFlow("new");
  };

  const handleGoHome = () => {
    setSaleFlow("idle");
    setTab("home");
    setTransaction(null);
  };

  const pendingCount = transactions.filter(t => t.status === "pending").length;

  const navigateTab = (t: Tab) => {
    if (t === "sale") {
      handleNewSale();
    } else {
      setSaleFlow("idle");
    }
    setTab(t);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-muted rounded-t-lg border border-border p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-display text-xs text-primary tracking-[0.3em] uppercase text-glow">
              Galaya Payment Terminal
            </span>
          </div>
          <div className="relative bg-card border-x border-border min-h-[480px] flex items-center justify-center atm-scanline atm-vignette atm-screen">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <ATMBezelBottom />
        </div>
      </div>
    );
  }

  if (!user || !merchant) {
    return (
      <ATMFrame>
        <AuthScreen />
      </ATMFrame>
    );
  }

  const showBottomNav = saleFlow === "idle";

  return (
    <ATMFrame>
      <div className={`flex flex-col min-h-[480px] ${showBottomNav ? "pb-12" : ""}`}>
        {saleFlow === "new" && (
          <NewSale onStartPayment={handleStartPayment} onCancel={handleGoHome} />
        )}
        {saleFlow === "ussd" && (
          <UssdPushScreen
            provider={provider}
            phone={phone}
            amount={amount}
            transactionId={moneyunifyTxId}
            dbTransactionId={dbTxId}
            onComplete={handleUssdComplete}
            onBack={() => setSaleFlow("new")}
          />
        )}
        {saleFlow === "receipt" && transaction && (
          <SaleReceipt transaction={transaction} onNewSale={handleNewSale} onGoHome={handleGoHome} />
        )}

        {saleFlow === "idle" && tab === "home" && (
          <Dashboard transactions={transactions} onNewSale={handleNewSale} />
        )}
        {saleFlow === "idle" && tab === "history" && (
          <TransactionHistory transactions={transactions} />
        )}
        {saleFlow === "idle" && tab === "wallet" && (
          <WithdrawalScreen transactions={transactions} onBack={() => { setTab("home"); }} />
        )}
        {saleFlow === "idle" && tab === "settings" && (
          <SettingsScreen />
        )}

        {showBottomNav && (
          <div className="absolute bottom-0 left-0 right-0">
            <BottomNav active={tab} onNavigate={navigateTab} />
          </div>
        )}
      </div>
    </ATMFrame>
  );
};

const ATMBezelBottom = () => (
  <div className="bg-muted rounded-b-lg border border-border p-3">
    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-6 h-1 rounded-full bg-border" />
        ))}
      </div>
      <div className="w-16 h-3 rounded-sm bg-background border border-border" />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-6 h-1 rounded-full bg-border" />
        ))}
      </div>
    </div>
  </div>
);

const ATMFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      {/* Top bezel */}
      <div className="bg-muted rounded-t-lg border border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-display text-xs text-primary tracking-[0.3em] uppercase text-glow">
            Galaya Payment Terminal
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">v2.1</div>
      </div>

      {/* Screen area */}
      <div className="relative bg-card border-x border-border overflow-hidden atm-scanline atm-vignette atm-screen">
        <div className="relative z-[3]">
          {children}
        </div>
      </div>

      {/* Bottom bezel */}
      <ATMBezelBottom />
    </div>
  </div>
);

export default Index;
