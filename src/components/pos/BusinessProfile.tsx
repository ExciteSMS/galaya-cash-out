import { useState, useEffect } from "react";
import { ArrowLeft, Store, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getTransactions, Transaction } from "@/lib/api";
import MerchantTierBadge from "./MerchantTierBadge";

interface BusinessProfileProps {
  onBack: () => void;
}

const BusinessProfile = ({ onBack }: BusinessProfileProps) => {
  const { merchant } = useAuth();
  const [name, setName] = useState(merchant?.name || "");
  const [phone] = useState(merchant?.phone_number || "");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactions().then(setTransactions).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Business name is required");
      return;
    }
    if (!merchant) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("merchants")
      .update({ name: name.trim(), address: address.trim() })
      .eq("id", merchant.id);

    if (updateError) {
      setError("Failed to update profile");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Business Profile</h2>
        </div>
      </div>

      {/* Merchant Tier */}
      <MerchantTierBadge transactions={transactions} />

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Business Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Number</label>
          <input
            type="text"
            value={phone}
            disabled
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Phone number cannot be changed</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Business Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Plot 123, Cairo Road, Lusaka"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && <p className="text-destructive text-xs mt-3">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
      </button>
    </div>
  );
};

export default BusinessProfile;
