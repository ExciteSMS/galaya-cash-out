import { useState } from "react";
import { Provider, PRESET_AMOUNTS, calculateFee, detectProvider, validatePhone } from "@/lib/mockApi";
import { ArrowLeft, Delete } from "lucide-react";

type SaleStep = "amount" | "phone" | "provider" | "confirm";

interface NewSaleProps {
  onStartPayment: (provider: Provider, phone: string, amount: number) => void;
  onCancel: () => void;
}

const PROVIDERS: { id: Provider; name: string; color: string }[] = [
  { id: "MTN", name: "MTN MoMo", color: "bg-mtn" },
  { id: "Zamtel", name: "Zamtel Money", color: "bg-zamtel" },
  { id: "Airtel", name: "Airtel Money", color: "bg-airtel" },
];

const NewSale = ({ onStartPayment, onCancel }: NewSaleProps) => {
  const [step, setStep] = useState<SaleStep>("amount");
  const [amountStr, setAmountStr] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);

  const amount = parseFloat(amountStr) || 0;
  const fee = amount > 0 ? calculateFee(amount) : 0;

  const handleNumPress = (key: string) => {
    if (step === "amount") {
      if (amountStr.length < 7) setAmountStr((v) => v + key);
    } else if (step === "phone") {
      if (phone.length < 10) {
        const newPhone = phone + key;
        setPhone(newPhone);
        if (newPhone.length === 10) {
          const detected = detectProvider(newPhone);
          if (detected) {
            setProvider(detected);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === "amount") setAmountStr((v) => v.slice(0, -1));
    else if (step === "phone") {
      setPhone((v) => v.slice(0, -1));
      setProvider(null);
    }
  };

  const handleAmountConfirm = () => {
    if (amount >= 10 && amount <= 10000) setStep("phone");
  };

  const handlePhoneConfirm = () => {
    if (validatePhone(phone) && provider) {
      setStep("confirm");
    } else if (phone.length === 10 && !provider) {
      setStep("provider");
    }
  };

  const handleProviderSelect = (p: Provider) => {
    setProvider(p);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (provider) onStartPayment(provider, phone, amount);
  };

  const handleBack = () => {
    if (step === "phone") setStep("amount");
    else if (step === "provider") setStep("phone");
    else if (step === "confirm") setStep("phone");
    else onCancel();
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-display font-bold text-lg text-foreground">
          {step === "amount" && "Enter Amount"}
          {step === "phone" && "Customer Phone"}
          {step === "provider" && "Select Provider"}
          {step === "confirm" && "Confirm Payment"}
        </h2>
      </div>

      {step === "amount" && (
        <div className="flex flex-col flex-1">
          {/* Amount Display */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground mb-1">Amount (ZMW)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl text-muted-foreground font-display">K</span>
              <span className="text-5xl font-bold font-display text-foreground">
                {amountStr || "0"}
              </span>
            </div>
            {amount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Fee: K{fee} · Total: K{(amount + fee).toLocaleString()}
              </p>
            )}
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmountStr(String(a))}
                className="bg-accent text-accent-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                K{a}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((key) => (
              <button
                key={key}
                onClick={() => (key === "⌫" ? handleDelete() : key === "." ? null : handleNumPress(key))}
                className="h-14 rounded-xl bg-card border border-border text-lg font-medium text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center"
              >
                {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
              </button>
            ))}
          </div>

          <button
            onClick={handleAmountConfirm}
            disabled={amount < 10 || amount > 10000}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {step === "phone" && (
        <div className="flex flex-col flex-1">
          <div className="bg-accent/50 rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-bold text-foreground">K{amount.toLocaleString()}</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground mb-2">Customer phone number</p>
            <p className="text-3xl font-bold font-display text-foreground tracking-wider mb-1">
              {phone || "0XX XXX XXXX"}
            </p>
            {provider && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${
                provider === "MTN" ? "bg-mtn" : provider === "Zamtel" ? "bg-zamtel" : "bg-airtel"
              }`}>
                {provider} detected
              </span>
            )}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? (
                <div key="empty" />
              ) : (
                <button
                  key={key}
                  onClick={() => (key === "⌫" ? handleDelete() : handleNumPress(key))}
                  className="h-14 rounded-xl bg-card border border-border text-lg font-medium text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center"
                >
                  {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
                </button>
              )
            )}
          </div>

          <button
            onClick={handlePhoneConfirm}
            disabled={phone.length < 10}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {step === "provider" && (
        <div className="flex flex-col flex-1">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Could not detect provider for {phone}. Please select:
          </p>
          <div className="flex flex-col gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderSelect(p.id)}
                className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors active:scale-[0.98]"
              >
                <div className={`w-10 h-10 ${p.color} rounded-full flex items-center justify-center text-white font-bold`}>
                  {p.id[0]}
                </div>
                <span className="font-display font-semibold text-foreground">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "confirm" && provider && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  provider === "MTN" ? "bg-mtn" : provider === "Zamtel" ? "bg-zamtel" : "bg-airtel"
                }`}>
                  {provider[0]}
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">{provider} Money</p>
                  <p className="text-xs text-muted-foreground">USSD Push Payment</p>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium text-foreground">{phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">K{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium text-foreground">K{fee}</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-border">
                <span className="font-display font-bold text-foreground">Total</span>
                <span className="font-display font-bold text-primary text-lg">
                  K{(amount + fee).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Send USSD Push
          </button>
        </div>
      )}
    </div>
  );
};

export default NewSale;
