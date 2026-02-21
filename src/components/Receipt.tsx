import { Transaction } from "@/lib/mockApi";
import ATMButton from "./ATMButton";
import { CheckCircle, Printer } from "lucide-react";

interface ReceiptProps {
  transaction: Transaction;
  onNewTransaction: () => void;
}

const Receipt = ({ transaction, onNewTransaction }: ReceiptProps) => {
  const { provider, phone, amount, fee, reference, timestamp } = transaction;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center">
        <CheckCircle className="w-12 h-12 text-primary mb-3" />
        <h2 className="font-display text-lg text-primary tracking-wider mb-1">TRANSACTION SUCCESSFUL</h2>
        <p className="text-[10px] text-muted-foreground mb-6">Your payment has been processed</p>

        {/* Receipt */}
        <div className="w-full bg-background border border-dashed border-border rounded p-4 text-xs space-y-2 font-mono">
          <div className="text-center border-b border-dashed border-border pb-2 mb-2">
            <p className="font-display text-primary text-sm tracking-widest">GALAYA</p>
            <p className="text-[9px] text-muted-foreground">Payment Solution</p>
          </div>

          <div className="flex justify-between"><span className="text-muted-foreground">Ref:</span><span className="text-foreground">{reference}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Provider:</span><span className="text-foreground">{provider}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">To:</span><span className="text-foreground">{phone}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span><span className="text-foreground">K{amount.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span><span className="text-foreground">K{fee}</span></div>
          <div className="border-t border-dashed border-border pt-2 flex justify-between font-display text-primary">
            <span>Total:</span><span>K{(amount + fee).toLocaleString()}</span>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span className="text-foreground">{timestamp.toLocaleString()}</span></div>
          <div className="text-center border-t border-dashed border-border pt-2 mt-2">
            <p className="text-[9px] text-muted-foreground">Thank you for using Galaya</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <ATMButton variant="default" size="default" className="flex-1 flex items-center justify-center gap-2">
          <Printer className="w-4 h-4" /> PRINT
        </ATMButton>
        <ATMButton variant="primary" size="default" className="flex-1" onClick={onNewTransaction}>
          NEW TRANSACTION
        </ATMButton>
      </div>
    </div>
  );
};

export default Receipt;
