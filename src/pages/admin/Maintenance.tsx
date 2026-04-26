import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Power, AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminMaintenance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: roles } = await (supabase as any).from("user_roles").select("role").eq("user_id", session.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) { navigate("/"); return; }
    const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "maintenance_mode").maybeSingle();
    setEnabled(data?.value?.enabled === true);
    setMessage(data?.value?.message || "We're upgrading AbeniExpress. Coming back soon!");
    setLoading(false);
  };

  const toggle = async (newState: boolean) => {
    setSaving(true);
    const { error } = await (supabase as any).from("app_settings").update({
      value: { enabled: newState, message },
      updated_at: new Date().toISOString(),
    }).eq("key", "maintenance_mode");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setEnabled(newState);
    toast.success(newState ? "Site shut down. Coming Soon page is now live for non-admins." : "Site is back live!");
  };

  const saveMessage = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("app_settings").update({
      value: { enabled, message },
    }).eq("key", "maintenance_mode");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Message saved");
  };

  const factoryReset = async () => {
    const confirmText = prompt('Type "RESET" (in capitals) to wipe ALL transactional data (orders, deliveries, notifications, withdrawals). Users, products, services, stores stay intact.');
    if (confirmText !== "RESET") { toast.info("Cancelled"); return; }
    setResetting(true);
    const { error } = await (supabase as any).rpc("admin_factory_reset_transactional");
    setResetting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Factory reset complete!");
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-black mb-6">Site Control</h1>

        <Card className="tech-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Power className="h-5 w-5" /> Maintenance Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${enabled ? "border-destructive/50 bg-destructive/10" : "border-success/50 bg-success/10"}`}>
              <div className="font-bold text-lg">Status: {enabled ? "🔴 SHUT DOWN (Coming Soon page active)" : "🟢 LIVE"}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {enabled ? "Only admins can access the platform. Everyone else sees the Coming Soon page." : "All users have full access."}
              </p>
            </div>

            <div>
              <Label>Coming Soon message</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
              <Button variant="outline" size="sm" onClick={saveMessage} disabled={saving} className="mt-2">Save message</Button>
            </div>

            <div className="flex gap-3">
              {!enabled ? (
                <Button onClick={() => toggle(true)} disabled={saving} variant="destructive" size="lg" className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Power className="h-4 w-4 mr-2" /> Shut It Down</>}
                </Button>
              ) : (
                <Button onClick={() => toggle(false)} disabled={saving} size="lg" className="flex-1 btn-glow">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Power className="h-4 w-4 mr-2" /> Start Now</>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Factory Reset wipes all transactional data: orders, order items, driver deliveries, service orders, notifications, withdrawals, refund requests, digital purchases, and resets all wallet balances to zero. Users, products, services, stores, and applications are kept.
            </p>
            <Button onClick={factoryReset} disabled={resetting} variant="destructive">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-2" /> Factory Reset</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
