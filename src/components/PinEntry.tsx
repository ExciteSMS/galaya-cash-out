import { useState } from "react";
import { Provider, calculateFee } from "@/lib/mockApi";
import ATMButton from "./ATMButton";
import { ArrowLeft, Lock } from "lucide-react";

interface PinEntryProps {
  provider: Provider;
  phone: string;
  amount: number;
  onSubmit: (pin: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}

const PinEntry = ({ provider, phone, amount, onSubmit, onBack, loading, error }: PinEntryProps) => {
  const [pin, setPin] = useState("");
  const fee = calculateFee(amount);

  const handleNumPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => onSubmit(newPin), 300);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <ATMButton variant="default" size="sm" onClick={onBack} disabled={loading}>
          <ArrowLeft className="w-4 h-4" />
        </ATMButton>
        <span className="font-display text-xs text-primary tracking-wider">{provider}</span>
      </div>

      {/* Transaction summary */}
      <div className="bg-background border border-border rounded p-3 mb-4 text-xs space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">To:</span><span>{phone}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span>K{amount.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span><span>K{fee}</span></div>
        <div className="border-t border-border pt-1 flex justify-between font-display text-primary">
          <span>Total:</span><span>K{(amount + fee).toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <Lock className="w-6 h-6 text-primary mx-auto mb-1" />
        <h2 className="font-display text-sm text-primary tracking-wider">ENTER PIN</h2>
        <p className="text-[10px] text-muted-foreground">Default PIN: 1234</p>
      </div>

      {/* PIN dots */}
      <div className="flex justify-center gap-4 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length ? "bg-primary border-primary shadow-[var(--glow-green)]" : "border-border"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-destructive text-xs text-center mb-2">{error}</p>}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-primary animate-pulse">Processing transaction...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 justify-items-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
            key === "" ? <div key="empty" /> : key === "⌫" ? (
              <ATMButton key="del" variant="numpad" size="numpad" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</ATMButton>
            ) : (
              <ATMButton key={key} variant="numpad" size="numpad" onClick={() => handleNumPress(key)}>{key}</ATMButton>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default PinEntry;
