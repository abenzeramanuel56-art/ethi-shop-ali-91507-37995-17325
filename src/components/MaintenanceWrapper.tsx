import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceGate } from "./MaintenanceGate";

export function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsAdmin(false); setChecked(true); return; }
      const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", session.user.id);
      setIsAdmin((data || []).some((r: any) => r.role === "admin"));
      setChecked(true);
    };
    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!checked) return <>{children}</>;
  return <MaintenanceGate isAdmin={isAdmin}>{children}</MaintenanceGate>;
}
