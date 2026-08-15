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
    let isMounted = true;

    const loadLocksAndRole = async (userId?: string) => {
      try {
        // 1. Fetch tab locks with independent error handling
        try {
          const { data: setting, error: settingError } = await (supabase as any)
            .from("app_settings")
            .select("value")
            .eq("key", "tab_locks")
            .maybeSingle();

          if (!settingError && setting?.value && isMounted) {
            setLocks({ ...DEFAULT, ...(setting.value as any) });
          }
        } catch (err) {
          console.warn("Skipped app_settings fetch, using defaults:", err);
        }

        // 2. Fetch user role with independent error handling
        if (userId) {
          try {
            const { data, error: roleError } = await (supabase as any)
              .from("user_roles")
              .select("role")
              .eq("user_id", userId);

            if (!roleError && isMounted) {
              setIsAdmin((data || []).some((r: any) => r.role === "admin"));
            }
          } catch (err) {
            console.warn("Skipped user_roles fetch, defaulting non-admin:", err);
            if (isMounted) setIsAdmin(false);
          }
        } else {
          if (isMounted) setIsAdmin(false);
        }
      } catch (error) {
        console.error("General error in loadLocksAndRole:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial check with immediate fallback guarantee
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        loadLocksAndRole(session?.user?.id);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Listen to login/logout state changes dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        loadLocksAndRole(session?.user?.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { locks, isAdmin, loading };
}
