import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, X, Trash2, AlertTriangle, DollarSign, RotateCcw, Megaphone } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const typeIcons: Record<string, React.ElementType> = {
  payment: DollarSign,
  refund: RotateCcw,
  alert: AlertTriangle,
  announcement: Megaphone,
  info: Bell,
};

export default function NotificationBell() {
  const { merchant } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [merchant]);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unread.map(n => n.id));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  const clearAll = useCallback(async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map(n => n.id);
    await supabase.from("notifications").delete().in("id", ids);
    setNotifications([]);
  }, [notifications]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    // Clear the badge automatically when the bell is opened
    if (next && unreadCount > 0) markAllRead();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[8px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-72 max-h-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Notifications</span>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-destructive hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-64">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = typeIcons[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      className="w-full text-left px-3 py-2.5 border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${!n.read ? "font-medium text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{format(new Date(n.created_at), "dd MMM HH:mm")}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
