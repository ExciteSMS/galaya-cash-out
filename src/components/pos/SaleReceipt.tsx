import { Transaction } from "@/lib/api";
import { printReceiptInline } from "@/lib/printReceipt";
import { CheckCircle, Printer, RotateCcw, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface SaleReceiptProps {
  transaction: Transaction;
  onNewSale: () => void;
  onGoHome: () => void;
}

const SaleReceipt = ({ transaction, onNewSale, onGoHome }: SaleReceiptProps) => {
  const { merchant } = useAuth();
  const { provider, phone, amount, fee, reference, created_at } = transaction;
  const [showCheck, setShowCheck] = useState(false);

  // Animated entrance + success sound
  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setShowCheck(true), 100);
    
    // Play success sound
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 523.25; // C5
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => { osc.frequency.value = 659.25; }, 150); // E5
      setTimeout(() => { osc.frequency.value = 783.99; }, 300); // G5
      setTimeout(() => { osc.stop(); ctx.close(); }, 500);
    } catch {
      // Audio not available
    }

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([50, 50, 100]);

    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    try {
      printReceiptInline(transaction, merchant?.name);
      toast.success("Printing receipt...");
    } catch {
      toast.error("Print failed. Try sharing instead.");
    }
  };

  const handleShare = async () => {
    const text = [
      `--- ${merchant?.name || "GALAYA"} ---`,
      `Payment Receipt`,
      ``,
      `Date: ${new Date(created_at).toLocaleString()}`,
      `Provider: ${provider} Money`,
      `Customer: ${phone}`,
      `Amount: K${amount.toLocaleString()}`,
      `Fee: K${fee}`,
      `Total: K${amount.toLocaleString()}`,
      `Ref: ${reference || "N/A"}`,
      `Status: PAID ✓`,
      ``,
      `Powered by Galaya`,
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Payment Receipt", text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Receipt copied to clipboard");
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Animated success icon */}
        <div className={`w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
          showCheck ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}>
          <div className={`transition-all duration-700 delay-200 ${showCheck ? "scale-100" : "scale-0"}`}>
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
        </div>

        <h2 className={`font-display font-bold text-xl text-foreground mb-1 transition-all duration-500 delay-300 ${
          showCheck ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}>
          Payment Received!
        </h2>
        <p className={`text-3xl font-bold font-display text-primary mb-2 transition-all duration-500 delay-500 ${
          showCheck ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}>
          K{amount.toLocaleString()}
        </p>

        {/* Confetti-style dots */}
        <div className={`flex gap-1 mb-6 transition-all duration-700 delay-700 ${showCheck ? "opacity-100" : "opacity-0"}`}>
          {["bg-success", "bg-primary", "bg-chart-2", "bg-chart-4", "bg-success"].map((c, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${c} animate-bounce`} style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>

        {/* Receipt Card */}
        <div className={`w-full bg-card border border-border rounded-2xl p-5 space-y-3 text-sm transition-all duration-500 delay-700 ${
          showCheck ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}>
          <div className="text-center pb-3 border-b border-dashed border-border">
            <p className="font-display font-bold text-foreground">{merchant?.name || "GALAYA"}</p>
            <p className="text-[10px] text-muted-foreground">Payment Receipt</p>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-medium text-foreground font-mono text-xs">{reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium text-foreground">{provider} Money</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium text-foreground">{phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium text-foreground">K{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee</span>
            <span className="font-medium text-foreground">K{fee}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-dashed border-border">
            <span className="font-display font-bold text-foreground">Total</span>
            <span className="font-display font-bold text-primary">K{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium text-foreground text-xs">{new Date(created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className={`flex gap-3 mt-4 transition-all duration-500 delay-1000 ${showCheck ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <button
          onClick={handlePrint}
          className="flex-1 bg-card border border-border text-foreground rounded-xl py-3.5 font-display font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button
          onClick={handleShare}
          className="bg-card border border-border text-foreground rounded-xl px-4 py-3.5 hover:bg-muted transition-colors"
          title="Share receipt"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={onNewSale}
          className="flex-1 bg-primary text-primary-foreground rounded-xl py-3.5 font-display font-semibold flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-4 h-4" /> New Sale
        </button>
      </div>
    </div>
  );
};

export default SaleReceipt;
