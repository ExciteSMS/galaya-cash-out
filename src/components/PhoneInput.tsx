import { useState } from "react";
import { Provider, validatePhone, detectProvider } from "@/lib/mockApi";
import ATMButton from "./ATMButton";
import { ArrowLeft, Phone } from "lucide-react";

interface PhoneInputProps {
  provider: Provider;
  onSubmit: (phone: string) => void;
  onBack: () => void;
}

const PhoneInput = ({ provider, onSubmit, onBack }: PhoneInputProps) => {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleNumPress = (num: string) => {
    if (phone.length < 10) {
      setPhone((p) => p + num);
      setError("");
    }
  };

  const handleDelete = () => {
    setPhone((p) => p.slice(0, -1));
    setError("");
  };

  const handleConfirm = () => {
    if (!validatePhone(phone)) {
      setError("Invalid phone number format");
      return;
    }
    const detected = detectProvider(phone);
    if (detected !== provider) {
      setError(`This number doesn't belong to ${provider}`);
      return;
    }
    onSubmit(phone);
  };

  const formatPhone = (p: string) => {
    if (p.length <= 3) return p;
    if (p.length <= 7) return p.slice(0, 3) + " " + p.slice(3);
    return p.slice(0, 3) + " " + p.slice(3, 7) + " " + p.slice(7);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <ATMButton variant="default" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </ATMButton>
        <span className="font-display text-xs text-primary tracking-wider">{provider}</span>
      </div>

      <div className="text-center mb-4">
        <Phone className="w-6 h-6 text-primary mx-auto mb-2" />
        <h2 className="font-display text-sm text-primary tracking-wider">ENTER PHONE NUMBER</h2>
      </div>

      {/* Phone display */}
      <div className="bg-background border-2 border-border rounded p-4 mb-2 text-center">
        <span className="font-mono text-2xl text-foreground tracking-[0.2em]">
          {formatPhone(phone) || "0XX XXX XXXX"}
        </span>
        {phone.length < 10 && <span className="text-foreground animate-pulse">█</span>}
      </div>

      {error && (
        <p className="text-destructive text-xs text-center mb-2">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 my-4 justify-items-center">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
          key === "" ? (
            <div key="empty" />
          ) : key === "⌫" ? (
            <ATMButton key="del" variant="numpad" size="numpad" onClick={handleDelete}>
              ⌫
            </ATMButton>
          ) : (
            <ATMButton key={key} variant="numpad" size="numpad" onClick={() => handleNumPress(key)}>
              {key}
            </ATMButton>
          )
        )}
      </div>

      <ATMButton
        variant="primary"
        size="lg"
        className="w-full mt-auto"
        onClick={handleConfirm}
        disabled={phone.length !== 10}
      >
        CONFIRM NUMBER
      </ATMButton>
    </div>
  );
};

export default PhoneInput;
