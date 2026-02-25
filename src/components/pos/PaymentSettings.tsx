import { ArrowLeft, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PaymentSettingsProps {
  onBack: () => void;
}

const PaymentSettings = ({ onBack }: PaymentSettingsProps) => {
  const { merchant } = useAuth();

  const providers = [
    { name: "MTN Money", prefix: "096/076", color: "bg-mtn", connected: true },
    { name: "Airtel Money", prefix: "097/077", color: "bg-airtel", connected: true },
    { name: "Zamtel Kwacha", prefix: "095/075", color: "bg-zamtel", connected: true },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Payment Settings</h2>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Accepting payments from all Zambian mobile money providers via {merchant?.phone_number}</p>

      <div className="flex flex-col gap-3">
        {providers.map((p) => (
          <div key={p.name} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 ${p.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
              {p.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">Prefixes: {p.prefix}</p>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              Active
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-1">Fee Structure</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>K1 – K50: K1 fee</p>
          <p>K51 – K200: K3 fee</p>
          <p>K201 – K500: K5 fee</p>
          <p>K501 – K1,000: K8 fee</p>
          <p>K1,001+: K10 fee</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
