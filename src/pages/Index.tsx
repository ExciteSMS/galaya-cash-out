import { useState } from "react";
import ATMScreen from "@/components/ATMScreen";
import ProviderSelect from "@/components/ProviderSelect";
import PhoneInput from "@/components/PhoneInput";
import AmountSelect from "@/components/AmountSelect";
import UssdPush from "@/components/UssdPush";
import Receipt from "@/components/Receipt";
import { Provider, Transaction, processPayment } from "@/lib/mockApi";

type Step = "provider" | "phone" | "amount" | "ussd" | "receipt";

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
    setStep("ussd");
  };

  const handleUssdComplete = async (success: boolean) => {
    if (success) {
      setLoading(true);
      try {
        const tx = await processPayment(provider, phone, amount, "1234");
        setTransaction(tx);
        setStep("receipt");
      } catch {
        setStep("amount");
      } finally {
        setLoading(false);
      }
    } else {
      setStep("amount");
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
      {step === "ussd" && <UssdPush provider={provider} phone={phone} amount={amount} onComplete={handleUssdComplete} onBack={() => setStep("amount")} />}
      {step === "receipt" && transaction && <Receipt transaction={transaction} onNewTransaction={reset} />}
    </ATMScreen>
  );
};

export default Index;
