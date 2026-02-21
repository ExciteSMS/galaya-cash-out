import { useState } from "react";
import ATMScreen from "@/components/ATMScreen";
import ProviderSelect from "@/components/ProviderSelect";
import PhoneInput from "@/components/PhoneInput";
import AmountSelect from "@/components/AmountSelect";
import PinEntry from "@/components/PinEntry";
import Receipt from "@/components/Receipt";
import { Provider, Transaction, processPayment } from "@/lib/mockApi";

type Step = "provider" | "phone" | "amount" | "pin" | "receipt";

const Index = () => {
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<Provider>("MTN");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const handleProvider = (p: Provider) => {
    setProvider(p);
    setStep("phone");
  };

  const handlePhone = (p: string) => {
    setPhone(p);
    setStep("amount");
  };

  const handleAmount = (a: number) => {
    setAmount(a);
    setStep("pin");
  };

  const handlePin = async (pin: string) => {
    setLoading(true);
    setPinError("");
    try {
      const tx = await processPayment(provider, phone, amount, pin);
      setTransaction(tx);
      setStep("receipt");
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("provider");
    setProvider("MTN");
    setPhone("");
    setAmount(0);
    setTransaction(null);
    setPinError("");
  };

  return (
    <ATMScreen>
      {step === "provider" && <ProviderSelect onSelect={handleProvider} />}
      {step === "phone" && <PhoneInput provider={provider} onSubmit={handlePhone} onBack={() => setStep("provider")} />}
      {step === "amount" && <AmountSelect provider={provider} phone={phone} onSubmit={handleAmount} onBack={() => setStep("phone")} />}
      {step === "pin" && <PinEntry provider={provider} phone={phone} amount={amount} onSubmit={handlePin} onBack={() => setStep("amount")} loading={loading} error={pinError} />}
      {step === "receipt" && transaction && <Receipt transaction={transaction} onNewTransaction={reset} />}
    </ATMScreen>
  );
};

export default Index;
