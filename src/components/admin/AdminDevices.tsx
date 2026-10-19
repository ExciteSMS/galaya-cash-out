import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Unlink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/adminApi";
import { deviceFaults } from "@/lib/deviceHealth";

interface DeviceRow {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  user_agent: string | null;
  is_bound: boolean;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_updated_at: string | null;
  location_status: string | null;
  battery_level: number | null;
  is_charging: boolean | null;
  merchant_name?: string;
  merchant_phone?: string;
}

export default function AdminDevices() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: devices, error } = await supabase
      .from("user_devices")
      .select("*")
      .eq("is_active", true)
      .order("last_seen", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Join merchants client-side (no FK to auth.users).
    const userIds = Array.from(new Set((devices ?? []).map((d) => d.user_id)));
    const { data: merchants } = await supabase
      .from("merchants")
      .select("user_id, name, phone_number")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const byUser = new Map((merchants ?? []).map((m) => [m.user_id, m]));
    setRows(
      (devices ?? []).map((d) => ({
        ...d,
        merchant_name: byUser.get(d.user_id)?.name,
        merchant_phone: byUser.get(d.user_id)?.phone_number,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const release = async (row: DeviceRow) => {
    if (!confirm(`Release device binding for ${row.merchant_name ?? row.user_id}? They will be able to sign in from a new device.`)) return;
    const { error } = await supabase
      .from("user_devices")
      .update({ is_active: false, is_bound: false })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    await logAudit("device_release", "user_device", row.id, { user_id: row.user_id, device_id: row.device_id });
    toast.success("Device released");
    load();
  };

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.merchant_name ?? "").toLowerCase().includes(q) ||
      (r.merchant_phone ?? "").includes(q) ||
      r.device_id.toLowerCase().includes(q) ||
      (r.platform ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Active Devices
          </h1>
          <p className="text-xs text-muted-foreground">All devices currently bound to merchant accounts.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by merchant, phone, device id, platform…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
      />

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Merchant</th>
              <th className="text-left px-3 py-2">Platform</th>
              <th className="text-left px-3 py-2">Device</th>
              <th className="text-left px-3 py-2">First seen</th>
              <th className="text-left px-3 py-2">Last seen</th>
              <th className="text-left px-3 py-2">Location</th>
              <th className="text-left px-3 py-2">Health</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-6 text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-6 text-muted-foreground text-xs">No active devices.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.merchant_name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.merchant_phone ?? r.user_id.slice(0, 8)}</div>
                </td>
                <td className="px-3 py-2 text-xs">{r.platform ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  <div>{r.device_name ?? "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{r.device_id.slice(0, 18)}…</div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.first_seen).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.last_seen).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">
                  {r.latitude != null && r.longitude != null ? (
                    <div>
                      <a
                        href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                      </a>
                      <div className="text-[10px] text-muted-foreground">
                        {r.location_updated_at ? new Date(r.location_updated_at).toLocaleString() : ""}
                        {r.location_accuracy != null ? ` · ±${Math.round(r.location_accuracy)}m` : ""}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{r.location_status === "denied" ? "Permission denied" : "Unknown"}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {(() => {
                    const faults = deviceFaults(r);
                    if (faults.length) {
                      return <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive" title={faults.join("\n")}>Faulty: {faults[0]}{faults.length > 1 ? ` +${faults.length - 1}` : ""}</span>;
                    }
                    return <span className="text-muted-foreground">{r.is_bound ? `OK${r.battery_level != null ? ` · ${r.battery_level}%` : ""}` : "—"}</span>;
                  })()}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.is_bound ? (
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">Bound</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600" title="A login from this device was blocked because the account is bound elsewhere">Blocked attempt</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.is_bound && <button
                    onClick={() => release(r)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:bg-destructive/10 hover:text-destructive"
                    title="Release binding so the merchant can sign in from a new device"
                  >
                    <Unlink className="h-3 w-3" /> Release
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
