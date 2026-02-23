import { useState, useCallback } from "react";
import BottomNav, { Tab } from "@/components/pos/BottomNav";
import Dashboard from "@/components/pos/Dashboard";
import NewSale from "@/components/pos/NewSale";
import UssdPushScreen from "@/components/pos/UssdPushScreen";
import SaleReceipt from "@/components/pos/SaleReceipt";
import TransactionHistory from "@/components/pos/TransactionHistory";
import SettingsScreen from "@/components/pos/SettingsScreen";
import { Provider, Transaction, processPayment, getMockTransactions } from "@/lib/mockApi";

type SaleFlow = "idle" | "new" | "ussd" | "receipt";

const Index = () => {
  const [tab, setTab] = useState<Tab>("home");
  const [saleFlow, setSaleFlow] = useState<SaleFlow>("idle");
  const [provider, setProvider] = useState<Provider>("MTN");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(() => getMockTransactions());

  const handleStartPayment = (p: Provider, ph: string, amt: number) => {
    setProvider(p);
    setPhone(ph);
    setAmount(amt);
    setSaleFlow("ussd");
  };

  const handleUssdComplete = useCallback(async (success: boolean) => {
    if (success) {
      try {
        const tx = await processPayment(provider, phone, amount);
        setTransaction(tx);
        setTransactions(prev => [tx, ...prev]);
        setSaleFlow("receipt");
      } catch {
        setSaleFlow("new");
      }
    } else {
      setSaleFlow("new");
    }
  }, [provider, phone, amount]);

  const handleNewSale = () => {
    setSaleFlow("new");
    setTransaction(null);
    setProvider("MTN");
    setPhone("");
    setAmount(0);
  };

  const handleGoHome = () => {
    setSaleFlow("idle");
    setTab("home");
    setTransaction(null);
  };

  const navigateTab = (t: Tab) => {
    if (t === "sale") {
      handleNewSale();
    } else {
      setSaleFlow("idle");
    }
    setTab(t);
  };

  const showBottomNav = saleFlow === "idle";

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      <div className={`flex flex-col min-h-screen ${showBottomNav ? "pb-16" : ""}`}>
        {/* Sale flow screens */}
        {saleFlow === "new" && (
          <NewSale onStartPayment={handleStartPayment} onCancel={handleGoHome} />
        )}
        {saleFlow === "ussd" && (
          <UssdPushScreen
            provider={provider}
            phone={phone}
            amount={amount}
            onComplete={handleUssdComplete}
            onBack={() => setSaleFlow("new")}
          />
        )}
        {saleFlow === "receipt" && transaction && (
          <SaleReceipt transaction={transaction} onNewSale={handleNewSale} onGoHome={handleGoHome} />
        )}

        {/* Tab screens (only when not in sale flow) */}
        {saleFlow === "idle" && tab === "home" && (
          <Dashboard transactions={transactions} onNewSale={handleNewSale} />
        )}
        {saleFlow === "idle" && tab === "history" && (
          <TransactionHistory transactions={transactions} />
        )}
        {saleFlow === "idle" && tab === "settings" && (
          <SettingsScreen />
        )}
      </div>

      {showBottomNav && <BottomNav active={tab} onNavigate={navigateTab} />}
    </div>
  );
};

export default Index;
