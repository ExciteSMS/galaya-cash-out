import { Transaction } from "@/lib/mockApi";
import { CheckCircle, Printer, RotateCcw } from "lucide-react";

interface SaleReceiptProps {
  transaction: Transaction;
  onNewSale: () => void;
  onGoHome: () => void;
}

const SaleReceipt = ({ transaction, onNewSale, onGoHome }: SaleReceiptProps) => {
  const { provider, phone, amount, fee, reference, timestamp } = transaction;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground mb-1">Payment Received</h2>
        <p className="text-3xl font-bold font-display text-primary mb-6">
          K{amount.toLocaleString()}
        </p>

        {/* Receipt Card */}
        <div className="w-full bg-card border border-border rounded-2xl p-5 space-y-3 text-sm">
          <div className="text-center pb-3 border-b border-dashed border-border">
            <p className="font-display font-bold text-foreground">GALAYA</p>
            <p className="text-[10px] text-muted-foreground">Payment Solution</p>
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
            <span className="font-display font-bold text-primary">K{(amount + fee).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium text-foreground text-xs">{timestamp.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onGoHome}
          className="flex-1 bg-card border border-border text-foreground rounded-xl py-3.5 font-display font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          <Printer className="w-4 h-4" /> Print
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
