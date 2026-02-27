import { useState, useEffect, useCallback, useRef } from "react";
import { Provider, calculateFee, verifyPayment } from "@/lib/api";
import { Smartphone, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface UssdPushScreenProps {
  provider: Provider;
  phone: string;
  amount: number;
  transactionId?: string;
  dbTransactionId?: string;
  onComplete: (success: boolean) => void;
  onBack: () => void;
}

type PushStatus = "sending" | "waiting" | "approved" | "rejected" | "timeout";

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLLS = 24; // 2 minutes total

const UssdPushScreen = ({ provider, phone, amount, transactionId, dbTransactionId, onComplete, onBack }: UssdPushScreenProps) => {
  const [status, setStatus] = useState<PushStatus>("sending");
  const [countdown, setCountdown] = useState(120);
  const [pollMessage, setPollMessage] = useState("");
  const fee = calculateFee(amount);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Start polling when status is "waiting" and we have a transactionId
  const startPolling = useCallback(() => {
    if (!transactionId || !dbTransactionId) return;
    
    pollRef.current = setInterval(async () => {
      pollCountRef.current++;
      
      if (pollCountRef.current > MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus("timeout");
        return;
      }

      try {
        const result = await verifyPayment(transactionId, dbTransactionId);
        setPollMessage(result.moneyunify_status || "");
        
        if (result.status === "success") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("approved");
        } else if (result.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("rejected");
        }
        // If pending, keep polling
      } catch (err) {
        console.error("Verification poll error:", err);
      }
    }, POLL_INTERVAL);
  }, [transactionId, dbTransactionId]);

  useEffect(() => {
    if (status === "sending") {
      const timer = setTimeout(() => {
        setStatus("waiting");
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (status === "approved") {
      const timer = setTimeout(() => onComplete(true), 1000);
      return () => clearTimeout(timer);
    }
    if (status === "rejected" || status === "timeout") {
      const timer = setTimeout(() => onComplete(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete]);

  useEffect(() => {
    if (status === "waiting") {
      startPolling();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, startPolling]);

  useEffect(() => {
    if (status !== "waiting") return;
    if (countdown <= 0) { setStatus("timeout"); return; }
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [status, countdown]);

  const providerColor = provider === "MTN" ? "border-mtn text-mtn" : provider === "Zamtel" ? "border-zamtel text-zamtel" : "border-airtel text-airtel";

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} disabled={status !== "waiting"} className="p-2 rounded hover:bg-secondary transition-colors disabled:opacity-40">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 border-2 ${providerColor} rounded flex items-center justify-center text-xs font-bold`}>
            {provider[0]}
          </div>
          <span className="font-display font-semibold text-foreground">{provider} Money</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-secondary border border-border rounded-lg p-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase">Payment to {phone}</p>
          <p className="font-bold text-foreground">K{amount.toLocaleString()}</p>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">Fee: K{fee}</p>
      </div>

      {/* Status */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        {status === "sending" && (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-display font-semibold text-foreground">SENDING REQUEST...</p>
            <p className="text-xs text-muted-foreground font-mono">Initiating {provider} Money request</p>
          </>
        )}

        {status === "waiting" && (
          <>
            <div className="relative">
              <Smartphone className="w-16 h-16 text-primary" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg text-glow">APPROVE ON PHONE</p>
            <p className="text-xs text-muted-foreground font-mono max-w-[260px]">
              A USSD prompt has been sent to <span className="font-medium text-foreground">{phone}</span>. 
              Customer should enter their {provider} Money PIN.
            </p>
            {pollMessage && (
              <p className="text-[10px] text-muted-foreground font-mono uppercase">
                Status: {pollMessage}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
              VERIFYING... {countdown}s
            </div>
          </>
        )}

        {status === "approved" && (
          <>
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center border border-success">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg text-glow">APPROVED</p>
            <p className="text-xs text-muted-foreground font-mono">Processing payment...</p>
          </>
        )}

        {status === "rejected" && (
          <>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg">REJECTED</p>
            <p className="text-xs text-muted-foreground font-mono">Customer declined the payment</p>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="font-display font-semibold text-foreground text-lg">TIMED OUT</p>
            <p className="text-xs text-muted-foreground font-mono">No response from customer</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UssdPushScreen;
