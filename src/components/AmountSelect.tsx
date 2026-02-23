import { useState } from "react";
import { Provider, PRESET_AMOUNTS, calculateFee } from "@/lib/mockApi";
import ATMButton from "./ATMButton";
import { ArrowLeft, Banknote } from "lucide-react";

interface AmountSelectProps {
  provider: Provider;
  phone: string;
  onSubmit: (amount: number) => void;
  onBack: () => void;
}

const AmountSelect = ({ provider, phone, onSubmit, onBack }: AmountSelectProps) => {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const selectedAmount = custom ? parseFloat(custom) : 0;
  const fee = selectedAmount > 0 ? calculateFee(selectedAmount) : 0;

  const handlePreset = (amount: number) => {
    onSubmit(amount);
  };

  const handleNumPress = (num: string) => {
    if (custom.length < 6) {
      setCustom((c) => c + num);
    }
  };

  const handleConfirmCustom = () => {
    const amt = parseFloat(custom);
    if (amt >= 10 && amt <= 5000) {
      onSubmit(amt);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <ATMButton variant="default" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </ATMButton>
        <span className="font-display text-xs text-primary tracking-wider">{provider}</span>
      </div>

      <div className="text-center mb-3">
        <Banknote className="w-6 h-6 text-primary mx-auto mb-1" />
        <h2 className="font-display text-sm text-primary tracking-wider">SELECT AMOUNT</h2>
        <p className="text-[10px] text-muted-foreground mt-1">
          Sending to: {phone}
        </p>
      </div>

      {!showCustom ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {PRESET_AMOUNTS.map((amt) => (
              <ATMButton
                key={amt}
                variant="default"
                size="lg"
                className="flex flex-col items-center"
                onClick={() => handlePreset(amt)}
              >
                <span className="font-display text-lg">K{amt}</span>
                <span className="text-[9px] text-muted-foreground">Fee: K{calculateFee(amt)}</span>
              </ATMButton>
            ))}
          </div>
          <ATMButton variant="secondary" size="default" className="w-full" onClick={() => setShowCustom(true)}>
            ENTER CUSTOM AMOUNT
          </ATMButton>
        </>
      ) : (
        <>
          <div className="bg-background border-2 border-border rounded p-3 mb-2 text-center">
            <span className="text-muted-foreground text-lg">K </span>
            <span className="font-mono text-2xl text-foreground">{custom || "0"}</span>
            <span className="text-foreground animate-pulse">█</span>
          </div>
          {selectedAmount > 0 && (
            <p className="text-xs text-center text-muted-foreground mb-2">
              Fee: K{fee} • Total: K{selectedAmount + fee}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 mb-3 justify-items-center">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? <div key="empty" /> : key === "⌫" ? (
                <ATMButton key="del" variant="numpad" size="numpad" onClick={() => setCustom((c) => c.slice(0, -1))}>⌫</ATMButton>
              ) : (
                <ATMButton key={key} variant="numpad" size="numpad" onClick={() => handleNumPress(key)}>{key}</ATMButton>
              )
            )}
          </div>
          <div className="flex gap-2 mt-auto">
            <ATMButton variant="default" size="default" className="flex-1" onClick={() => { setShowCustom(false); setCustom(""); }}>
              BACK
            </ATMButton>
            <ATMButton variant="primary" size="default" className="flex-1" onClick={handleConfirmCustom} disabled={selectedAmount < 10 || selectedAmount > 5000}>
              CONFIRM
            </ATMButton>
          </div>
        </>
      )}
    </div>
  );
};

export default AmountSelect;
