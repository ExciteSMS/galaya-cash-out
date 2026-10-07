import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bell, CheckCheck, CircleDollarSign, Megaphone, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const typeIcon: Record<string, typeof Bell> = {
  transaction: CircleDollarSign,
  announcement: Megaphone,
};

export default function NotificationCenter({ onBack }: { onBack?: () => void }) {
  const { merchant } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!merchant) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`merchant_id.eq.${merchant.id},merchant_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setNotifications((data as AppNotification[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [merchant]);

  const markAllRead = async () => {
    if (!merchant) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unread.map((n) => n.id));
    if (error) { toast.error(error.message); return; }
    load();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      {onBack && <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notifications
          </h2>
          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-primary font-medium"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcon[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`bg-card border rounded-xl p-3 flex items-start gap-3 ${
                  n.read ? "border-border opacity-70" : "border-primary/40"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(n.created_at), "dd MMM, HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
