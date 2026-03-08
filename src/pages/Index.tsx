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
      <ATMFrame>
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ATMFrame>
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
      <div className="flex flex-col h-full min-h-[480px] md:h-[600px]">
        {/* Scrollable content area */}
        <div className={`flex-1 overflow-y-auto ${showBottomNav ? "pb-14" : ""}`}>
        {saleFlow === "new" && (
          <NewSale
            onStartPayment={handleStartPayment}
            onCancel={handleGoHome}
            initialPhone={phone}
            initialAmount={amount}
          />
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
          <Dashboard transactions={transactions} onNewSale={handleNewSale} onRepeatSale={handleRepeatSale} />
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
        </div>

        {showBottomNav && (
          <div className="sticky bottom-0 left-0 right-0 z-10">
            <BottomNav active={tab} onNavigate={navigateTab} pendingCount={pendingCount} />
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
  <div className="min-h-screen bg-background flex flex-col md:flex-row md:items-center md:justify-center md:p-4">
    {/* Mobile: full screen, no bezel */}
    <div className="w-full md:max-w-md flex flex-col min-h-screen md:min-h-0">
      {/* Top bezel - hidden on mobile */}
      <div className="hidden md:flex bg-muted rounded-t-lg border border-border p-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-display text-xs text-primary tracking-[0.3em] uppercase text-glow">
            Galaya Payment Terminal
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">v2.1</div>
      </div>

      {/* Mobile top bar */}
      <div className="flex md:hidden bg-muted border-b border-border px-4 py-2 items-center justify-between safe-top">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-display text-[10px] text-primary tracking-[0.2em] uppercase text-glow">
            Galaya
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">v2.1</div>
      </div>

      {/* Screen area */}
      <div className="relative flex-1 bg-card md:border-x border-border overflow-hidden atm-scanline atm-vignette atm-screen">
        <div className="relative z-[3] h-full">
          {children}
        </div>
      </div>

      {/* Bottom bezel - hidden on mobile */}
      <div className="hidden md:block">
        <ATMBezelBottom />
      </div>
    </div>
  </div>
);

export default Index;
