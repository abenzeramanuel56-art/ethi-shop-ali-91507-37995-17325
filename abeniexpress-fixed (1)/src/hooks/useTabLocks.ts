import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TabLocks = {
  products: boolean;
  services: boolean;
  digital: boolean;
};

const DEFAULT: TabLocks = { products: false, services: false, digital: false };

export function useTabLocks() {
  const [locks, setLocks] = useState<TabLocks>(DEFAULT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: setting }, { data: { session } }] = await Promise.all([
        (supabase as any).from("app_settings").select("value").eq("key", "tab_locks").maybeSingle(),
        supabase.auth.getSession(),
      ]);
      if (setting?.value) setLocks({ ...DEFAULT, ...(setting.value as any) });
      if (session) {
        const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", session.user.id);
        setIsAdmin((data || []).some((r: any) => r.role === "admin"));
      }
      setLoading(false);
    };
    load();
  }, []);

  return { locks, isAdmin, loading };
}
