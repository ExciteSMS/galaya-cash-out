import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface RefundRequestProps {
  transaction: Transaction;
  onBack: () => void;
  onSuccess: () => void;
}

export default function RefundRequest({ transaction, onBack, onSuccess }: RefundRequestProps) {
  const { merchant } = useAuth();
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const refundAmount = Number(amount);
    if (!refundAmount || refundAmount <= 0 || refundAmount > transaction.amount) {
      toast.error("Invalid refund amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    if (!merchant) return;

    setSubmitting(true);
    const { error } = await supabase.from("refunds").insert({
      transaction_id: transaction.id,
      merchant_id: merchant.id,
      amount: refundAmount,
      reason: reason.trim(),
    });

    if (error) {
      toast.error("Failed to submit refund request");
    } else {
      toast.success("Refund request submitted for approval");
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-2 mb-4">
        <RotateCcw className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Request Refund</h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Original Amount</span>
          <span className="font-mono font-medium">K{transaction.amount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Customer</span>
          <span className="font-mono">{transaction.phone}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Provider</span>
          <span>{transaction.provider}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{transaction.reference || "—"}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Refund Amount (K)</Label>
          <Input
            type="number"
            min="1"
            max={transaction.amount}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Max: K{transaction.amount}</p>
        </div>
        <div>
          <Label>Reason for Refund</Label>
          <Input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Wrong amount charged, customer request..."
            className="mt-1"
          />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Refund Request"}
        </Button>
      </div>
    </div>
  );
}
