import { useState, useEffect } from "react";
import { Provider, calculateFee } from "@/lib/api";
import { Smartphone, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface UssdPushScreenProps {
  provider: Provider;
  phone: string;
  amount: number;
  onComplete: (success: boolean) => void;
  onBack: () => void;
}

type PushStatus = "sending" | "waiting" | "approved" | "rejected" | "timeout";

const UssdPushScreen = ({ provider, phone, amount, onComplete, onBack }: UssdPushScreenProps) => {
  const [status, setStatus] = useState<PushStatus>("sending");
  const [countdown, setCountdown] = useState(60);
  const fee = calculateFee(amount);

  useEffect(() => {
    if (status === "sending") {
      const timer = setTimeout(() => setStatus("waiting"), 2000);
      return () => clearTimeout(timer);
    }
    if (status === "waiting") {
      const approveTimer = setTimeout(() => setStatus("approved"), 6000);
      return () => clearTimeout(approveTimer);
    }
    if (status === "approved") {
      const timer = setTimeout(() => onComplete(true), 1500);
      return () => clearTimeout(timer);
    }
    if (status === "rejected" || status === "timeout") {
      const timer = setTimeout(() => onComplete(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete]);

  useEffect(() => {
    if (status !== "waiting") return;
    if (countdown <= 0) { setStatus("timeout"); return; }
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [status, countdown]);

  const providerColor = provider === "MTN" ? "bg-mtn" : provider === "Zamtel" ? "bg-zamtel" : "bg-airtel";

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} disabled={status !== "waiting"} className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-40">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${providerColor} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            {provider[0]}
          </div>
          <span className="font-display font-semibold text-foreground">{provider} Money</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Payment to {phone}</p>
          <p className="font-bold text-foreground">K{amount.toLocaleString()}</p>
        </div>
        <p className="text-xs text-muted-foreground">Fee: K{fee}</p>
      </div>

      {/* Status */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        {status === "sending" && (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-display font-semibold text-foreground">Sending USSD Push...</p>
            <p className="text-sm text-muted-foreground">Initiating {provider} Money request</p>
          </>
        )}

        {status === "waiting" && (
          <>
            <div className="relative">
              <Smartphone className="w-16 h-16 text-primary" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg">Approve on Phone</p>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              A USSD prompt has been sent to <span className="font-medium text-foreground">{phone}</span>. 
              Customer should enter their {provider} Money PIN.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
              Waiting... {countdown}s
            </div>

            {/* Demo controls */}
            <div className="mt-4 pt-4 border-t border-border w-full">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Demo Controls</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setStatus("approved")}
                  className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:brightness-105 transition-all"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => setStatus("rejected")}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:brightness-105 transition-all"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          </>
        )}

        {status === "approved" && (
          <>
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg">Approved!</p>
            <p className="text-sm text-muted-foreground">Processing payment...</p>
          </>
        )}

        {status === "rejected" && (
          <>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg">Rejected</p>
            <p className="text-sm text-muted-foreground">Customer declined the payment</p>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg">Timed Out</p>
            <p className="text-sm text-muted-foreground">No response from customer</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UssdPushScreen;
