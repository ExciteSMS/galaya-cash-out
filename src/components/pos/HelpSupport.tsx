import { ArrowLeft, HelpCircle, MessageCircle, FileText, Phone } from "lucide-react";

interface HelpSupportProps {
  onBack: () => void;
}

const HelpSupport = ({ onBack }: HelpSupportProps) => {
  const faqs = [
    { q: "How do I process a payment?", a: "Tap 'New Sale', select the provider, enter the customer's phone and amount, then confirm." },
    { q: "What if a payment fails?", a: "The transaction will be marked as failed. No money is deducted from the customer. You can retry." },
    { q: "How are fees calculated?", a: "Fees are tiered based on amount: K1 for up to K50, up to K10 for amounts over K1,000." },
    { q: "Can I change my phone number?", a: "Phone numbers are tied to your account and cannot be changed. Register a new account if needed." },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Help & Support</h2>
        </div>
      </div>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Frequently Asked Questions</p>
      <div className="flex flex-col gap-2 mb-6">
        {faqs.map((faq, i) => (
          <details key={i} className="bg-card border border-border rounded-xl overflow-hidden group">
            <summary className="px-4 py-3 text-sm font-medium text-foreground cursor-pointer list-none flex items-center justify-between hover:bg-muted transition-colors">
              {faq.q}
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <p className="px-4 pb-3 text-xs text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Contact Us</p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
          <Phone className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Call Support</p>
            <p className="text-xs text-muted-foreground">+260 211 123 456</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
          <MessageCircle className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">WhatsApp</p>
            <p className="text-xs text-muted-foreground">+260 966 123 456</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Terms & Privacy</p>
            <p className="text-xs text-muted-foreground">Legal documents</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
