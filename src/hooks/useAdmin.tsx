import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setRoleChecked(true);
      lastCheckedUserId.current = null;
      return;
    }

    // Skip if we already checked this user
    if (lastCheckedUserId.current === user.id) return;

    const checkRole = async () => {
      try {
        console.log("[useAdmin] Checking role for user:", user.id);
        const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        console.log("[useAdmin] Role check result:", { data, error });
        setIsAdmin(!!data);
      } catch (err) {
        console.error("[useAdmin] Role check error:", err);
        setIsAdmin(false);
      }
      lastCheckedUserId.current = user.id;
      setRoleChecked(true);
    };
    checkRole();
  }, [user, authLoading]);

  // Loading if auth hasn't loaded OR we haven't checked the role yet
  const loading = authLoading || !roleChecked;
  console.log("[useAdmin] State:", { authLoading, roleChecked, isAdmin, loading, userId: user?.id });

  return { isAdmin, loading };
}
