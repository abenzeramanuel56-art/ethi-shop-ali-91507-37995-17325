import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Power, AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminMaintenance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [tabLocks, setTabLocks] = useState({ products: false, services: false, digital: false });
  const [savingLocks, setSavingLocks] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: roles } = await (supabase as any).from("user_roles").select("role").eq("user_id", session.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) { navigate("/"); return; }
    const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "maintenance_mode").maybeSingle();
    setEnabled(data?.value?.enabled === true);
    setMessage(data?.value?.message || "We're upgrading AbeniExpress. Coming back soon!");
    const { data: lockData } = await (supabase as any).from("app_settings").select("value").eq("key", "tab_locks").maybeSingle();
    if (lockData?.value) setTabLocks({ products: false, services: false, digital: false, ...lockData.value });
    setLoading(false);
  };

  const toggleTabLock = async (tab: "products" | "services" | "digital") => {
    setSavingLocks(tab);
    const next = { ...tabLocks, [tab]: !tabLocks[tab] };
    const { error } = await (supabase as any).from("app_settings").update({
      value: next,
      updated_at: new Date().toISOString(),
    }).eq("key", "tab_locks");
    setSavingLocks(null);
    if (error) { toast.error(error.message); return; }
    setTabLocks(next);
    toast.success(`${tab} is now ${next[tab] ? "locked (Coming Soon)" : "live"}`);
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

  const runFactoryReset = async () => {
    if (resetConfirmText !== "RESET") return;
    setResetting(true);
    const { error } = await (supabase as any).rpc("admin_factory_reset_transactional");
    setResetting(false);
    if (error) {
      toast.error("Factory reset failed: " + error.message);
      return;
    }
    toast.success("Factory reset complete!");
    setResetDialogOpen(false);
    setResetConfirmText("");
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></div>;

  const confirmValid = resetConfirmText === "RESET";

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
            <Button onClick={() => setResetDialogOpen(true)} variant="destructive">
              <RotateCcw className="h-4 w-4 mr-2" /> Factory Reset
            </Button>
          </CardContent>
        </Card>
        <Card className="tech-card mb-6">
          <CardHeader>
            <CardTitle>Individual Section Locks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Lock specific sections as "Coming Soon" for regular users. Admins always keep access.
            </p>
            {(["products", "services", "digital"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                <div>
                  <p className="font-bold capitalize">{k === "digital" ? "Digital Products" : k}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {tabLocks[k] ? "🔴 Coming Soon (locked)" : "🟢 Live"}
                  </p>
                </div>
                <Button
                  onClick={() => toggleTabLock(k)}
                  disabled={savingLocks === k}
                  variant={tabLocks[k] ? "default" : "outline"}
                  size="sm"
                >
                  {savingLocks === k ? <Loader2 className="h-4 w-4 animate-spin" /> : tabLocks[k] ? "Unlock" : "Lock"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={(o) => { setResetDialogOpen(o); if (!o) setResetConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirm Factory Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">This permanently deletes <strong>all orders, deliveries, service orders, digital purchases, notifications, withdrawals, refund requests, and wallet balances</strong>.</span>
              <span className="block">Users, products, services, stores, and applications are kept.</span>
              <span className="block font-semibold text-destructive">This cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reset-confirm">Type <strong>RESET</strong> (in capital letters) to confirm:</Label>
            <Input
              id="reset-confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              className={
                resetConfirmText.length > 0
                  ? confirmValid
                    ? "border-success focus-visible:ring-success"
                    : "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {resetConfirmText.length > 0 && !confirmValid && (
              <p className="text-xs text-destructive">Type the word RESET exactly (all capitals).</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runFactoryReset(); }}
              disabled={!confirmValid || resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-2" /> Wipe Data</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
