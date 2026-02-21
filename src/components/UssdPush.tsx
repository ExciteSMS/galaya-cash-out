import { useState, useEffect } from "react";
import { Provider, calculateFee } from "@/lib/mockApi";
import ATMButton from "./ATMButton";
import { ArrowLeft, Smartphone, CheckCircle, XCircle } from "lucide-react";

interface UssdPushProps {
  provider: Provider;
  phone: string;
  amount: number;
  onComplete: (success: boolean) => void;
  onBack: () => void;
}

type PushStatus = "sending" | "waiting" | "approved" | "rejected" | "timeout";

const PROVIDER_COLORS: Record<Provider, string> = {
  MTN: "text-[hsl(var(--mtn))]",
  Zamtel: "text-[hsl(var(--zamtel))]",
  Airtel: "text-[hsl(var(--airtel))]",
};

const UssdPush = ({ provider, phone, amount, onComplete, onBack }: UssdPushProps) => {
  const [status, setStatus] = useState<PushStatus>("sending");
  const [countdown, setCountdown] = useState(60);
  const fee = calculateFee(amount);

  // Simulate the USSD push flow
  useEffect(() => {
    if (status === "sending") {
      const timer = setTimeout(() => setStatus("waiting"), 2000);
      return () => clearTimeout(timer);
    }

    if (status === "waiting") {
      // Auto-approve after 6 seconds for demo purposes
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

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting") return;
    if (countdown <= 0) {
      setStatus("timeout");
      return;
    }
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [status, countdown]);

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <ATMButton variant="default" size="sm" onClick={onBack} disabled={status !== "waiting"}>
          <ArrowLeft className="w-4 h-4" />
        </ATMButton>
        <span className={`font-display text-xs tracking-wider ${PROVIDER_COLORS[provider]}`}>
          {provider} Money
        </span>
      </div>

      {/* Transaction summary */}
      <div className="bg-background border border-border rounded p-3 mb-4 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">To:</span>
          <span>{phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount:</span>
          <span>K{amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fee:</span>
          <span>K{fee}</span>
        </div>
        <div className="border-t border-border pt-1 flex justify-between font-display text-primary">
          <span>Total:</span>
          <span>K{(amount + fee).toLocaleString()}</span>
        </div>
      </div>

      {/* USSD Push Status */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        {status === "sending" && (
          <>
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-primary font-display tracking-wider animate-pulse">
              SENDING USSD PUSH...
            </p>
            <p className="text-[10px] text-muted-foreground">
              Initiating {provider} Money request
            </p>
          </>
        )}

        {status === "waiting" && (
          <>
            <Smartphone className="w-12 h-12 text-primary animate-pulse" />
            <p className="text-sm text-primary font-display tracking-wider">
              APPROVE ON YOUR PHONE
            </p>
            <p className="text-[10px] text-muted-foreground max-w-[200px]">
              A USSD prompt has been sent to <span className="text-foreground">{phone}</span>.
              Enter your {provider} Money PIN on your phone to approve.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
              <span className="text-xs text-muted-foreground">
                Waiting for approval... {countdown}s
              </span>
            </div>

            {/* Simulate buttons for demo */}
            <div className="mt-4 border-t border-border pt-4 w-full">
              <p className="text-[9px] text-muted-foreground mb-2 uppercase tracking-wider">
                Demo: Simulate response
              </p>
              <div className="flex gap-2 justify-center">
                <ATMButton variant="default" size="sm" onClick={() => setStatus("approved")}>
                  ✓ Approve
                </ATMButton>
                <ATMButton variant="danger" size="sm" onClick={() => setStatus("rejected")}>
                  ✗ Reject
                </ATMButton>
              </div>
            </div>
          </>
        )}

        {status === "approved" && (
          <>
            <CheckCircle className="w-12 h-12 text-primary" />
            <p className="text-sm text-primary font-display tracking-wider">
              APPROVED
            </p>
            <p className="text-[10px] text-muted-foreground">
              Transaction confirmed by user
            </p>
          </>
        )}

        {status === "rejected" && (
          <>
            <XCircle className="w-12 h-12 text-destructive" />
            <p className="text-sm text-destructive font-display tracking-wider">
              REJECTED
            </p>
            <p className="text-[10px] text-muted-foreground">
              Transaction was declined by user
            </p>
          </>
        )}

        {status === "timeout" && (
          <>
            <XCircle className="w-12 h-12 text-destructive" />
            <p className="text-sm text-destructive font-display tracking-wider">
              TIMED OUT
            </p>
            <p className="text-[10px] text-muted-foreground">
              No response received. Please try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UssdPush;
