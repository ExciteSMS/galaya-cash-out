import { useState, useEffect } from "react";
import { ArrowLeft, UserPlus, Users, Shield, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/lib/permissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  user_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface StaffAccountsProps {
  onBack: () => void;
}

async function callStaffAdmin(body: Record<string, unknown>): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("staff-admin", { body });
  if (error) {
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { error: detail?.error ?? "Request failed" };
  }
  return data?.error ? { error: data.error } : {};
}

const StaffAccounts = ({ onBack }: StaffAccountsProps) => {
  const { merchant } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("cashier");
  const [pin, setPin] = useState("");

  const fetchStaff = async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from("merchant_staff")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });
    setStaff((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [merchant]);

  const handleAdd = async () => {
    if (!merchant || !name || !phone || !pin) {
      toast.error("Fill in all fields");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("PIN must be 4 digits");
      return;
    }

    const { error } = await callStaffAdmin({ action: "create", name, phone, pin, role });
    if (error) { toast.error(error); return; }
    toast.success(`${name} added as ${role}`);
    setName(""); setPhone(""); setPin(""); setRole("cashier"); setShowAdd(false);
    fetchStaff();
  };

  const toggleActive = async (s: StaffMember) => {
    const { error } = await callStaffAdmin({ action: "update", id: s.id, is_active: !s.is_active });
    if (error) return toast.error(error);
    toast.success(`${s.name} ${s.is_active ? "deactivated" : "activated"}`);
    fetchStaff();
  };

  const changeRole = async (s: StaffMember, next: string) => {
    const { error } = await callStaffAdmin({ action: "update", id: s.id, role: next });
    if (error) return toast.error(error);
    fetchStaff();
  };

  const resetPin = async (s: StaffMember) => {
    const next = window.prompt(`New 4-digit PIN for ${s.name}`);
    if (!next) return;
    const { error } = await callStaffAdmin({ action: "update", id: s.id, pin: next });
    if (error) return toast.error(error);
    toast.success("PIN updated");
    fetchStaff();
  };

  const handleDelete = async (s: StaffMember) => {
    const { error } = await callStaffAdmin({ action: "delete", id: s.id });
    if (error) return toast.error(error);
    toast.success(`${s.name} removed`);
    fetchStaff();
  };

  const activeCount = staff.filter(s => s.is_active).length;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1 hover:bg-muted rounded">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg text-foreground">Staff Accounts</h2>
          <p className="text-xs text-muted-foreground">{activeCount} active · {staff.length} total</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">New Staff Member</p>
          <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input placeholder="4-digit PIN" type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className="flex-1">Add Staff</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No staff added yet</p>
          </div>
        ) : (
          staff.map(s => (
            <div key={s.id} className={`bg-card border rounded-xl p-3 flex items-center gap-3 ${s.is_active ? "border-border" : "border-border opacity-50"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                s.role === "manager" ? "bg-primary/10" : s.role === "supervisor" ? "bg-accent" : "bg-muted"
              }`}>
                {s.role === "manager" ? <ShieldCheck className="w-4 h-4 text-primary" /> : 
                 s.role === "supervisor" ? <Shield className="w-4 h-4 text-accent-foreground" /> :
                 <Users className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.phone}{s.user_id ? "" : " · login not set up"}</p>
                <select
                  value={s.role}
                  onChange={(e) => changeRole(s, e.target.value)}
                  className="mt-1 text-[10px] bg-transparent border border-border rounded px-1 py-0.5"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => resetPin(s)} className="p-1 hover:bg-muted rounded text-[10px] text-muted-foreground" title="Reset PIN">PIN</button>
                <button onClick={() => toggleActive(s)} className="p-1 hover:bg-muted rounded" title={s.is_active ? "Deactivate" : "Activate"}>
                  {s.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
                <button onClick={() => handleDelete(s)} className="p-1 hover:bg-destructive/10 rounded" title="Remove">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffAccounts;
