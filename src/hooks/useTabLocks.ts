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
        // Safety timeout to ensure loading never gets stuck indefinitely
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Tab locks fetch timeout")), 5000)
        );

        const fetchPromise = (async () => {
          const { data: setting } = await (supabase as any)
            .from("app_settings")
            .select("value")
            .eq("key", "tab_locks")
            .maybeSingle();

          if (!isMounted) return;

          if (setting?.value) {
            setLocks({ ...DEFAULT, ...(setting.value as any) });
          }

          if (userId) {
            const { data } = await (supabase as any)
              .from("user_roles")
              .select("role")
              .eq("user_id", userId);

            if (isMounted) {
              setIsAdmin((data || []).some((r: any) => r.role === "admin"));
            }
          } else {
            if (isMounted) {
              setIsAdmin(false);
            }
          }
        })();

        await Promise.race([fetchPromise, timeout]);
      } catch (error) {
        console.error("Error loading tab locks/roles:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        loadLocksAndRole(session?.user?.id);
      }
    });

    // Listen to login/logout state changes dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setLoading(true);
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
