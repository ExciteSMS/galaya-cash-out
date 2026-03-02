import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    // Reset loading when user changes so we don't redirect prematurely
    setRoleLoading(true);

    const checkRole = async () => {
      try {
        const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        setIsAdmin(!!data);
      } catch {
        setIsAdmin(false);
      }
      setRoleLoading(false);
    };
    checkRole();
  }, [user]);

  return { isAdmin, loading: authLoading || roleLoading };
}
