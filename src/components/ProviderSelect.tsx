import { Provider } from "@/lib/mockApi";
import ATMButton from "./ATMButton";
import { Smartphone } from "lucide-react";

interface ProviderSelectProps {
  onSelect: (provider: Provider) => void;
}

const providers: { id: Provider; name: string; variant: "mtn" | "zamtel" | "airtel"; tagline: string }[] = [
  { id: "MTN", name: "MTN MoMo", variant: "mtn", tagline: "Mobile Money" },
  { id: "Zamtel", name: "Zamtel Money", variant: "zamtel", tagline: "Zamtel Kwacha" },
  { id: "Airtel", name: "Airtel Money", variant: "airtel", tagline: "Airtel Money" },
];

const ProviderSelect = ({ onSelect }: ProviderSelectProps) => {
  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mb-6">
        <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
        <h2 className="font-display text-lg text-primary tracking-wider">SELECT PROVIDER</h2>
        <p className="text-xs text-muted-foreground mt-1">Choose your mobile money provider</p>
      </div>

      <div className="flex flex-col gap-3 flex-1 justify-center">
        {providers.map((p) => (
          <ATMButton
            key={p.id}
            variant={p.variant}
            size="lg"
            className="w-full flex items-center justify-between"
            onClick={() => onSelect(p.id)}
          >
            <span className="font-display font-bold tracking-wider">{p.name}</span>
            <span className="text-xs opacity-75">{p.tagline}</span>
          </ATMButton>
        ))}
      </div>

      <div className="mt-4 text-center text-[10px] text-muted-foreground">
        ── GALAYA PAYMENT SOLUTION ──
      </div>
    </div>
  );
};

export default ProviderSelect;
