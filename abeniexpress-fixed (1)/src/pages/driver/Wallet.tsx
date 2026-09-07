import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wallet as WalletIcon, ArrowDownToLine } from "lucide-react";

const BANKS = [
  { value: "telebirr", label: "TeleBirr" },
  { value: "cbe", label: "Commercial Bank of Ethiopia (CBE)" },
  { value: "bunna", label: "Bunna Bank" },
  { value: "awash", label: "Awash Bank" },
  { value: "abyssinia", label: "Bank of Abyssinia" },
];

export default function DriverWallet() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("telebirr");
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUser(session.user);
    await reload(session.user.id);
    setLoading(false);
  };

  const reload = async (uid: string) => {
    const { data: w } = await (supabase as any).from("driver_wallets").select("*").eq("user_id", uid).maybeSingle();
    setWallet(w || { current_balance_etb: 0, total_earned_etb: 0 });
    const { data: r } = await (supabase as any).from("withdrawal_requests").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setRequests(r || []);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > (wallet?.current_balance_etb || 0)) { toast.error("Insufficient balance"); return; }
    if (!holderName.trim() || !accountNumber.trim()) { toast.error("Fill all fields"); return; }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("withdrawal_requests").insert({
        user_id: user.id,
        amount_etb: amt,
        payment_method: method,
        account_detail_1: holderName.trim(),
        account_detail_2: accountNumber.trim(),
      });
      if (error) throw error;
      toast.success("Withdrawal request submitted. Admin will review shortly.");
      setAmount(""); setHolderName(""); setAccountNumber("");
      await reload(user.id);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-black mb-6">Driver Wallet</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="tech-card">
            <CardContent className="p-5">
              <div className="text-xs uppercase text-muted-foreground tracking-wider">Available</div>
              <div className="text-3xl font-black text-primary mt-2">{Number(wallet.current_balance_etb).toLocaleString()} ETB</div>
            </CardContent>
          </Card>
          <Card className="tech-card">
            <CardContent className="p-5">
              <div className="text-xs uppercase text-muted-foreground tracking-wider">Total Earned</div>
              <div className="text-3xl font-black mt-2">{Number(wallet.total_earned_etb).toLocaleString()} ETB</div>
            </CardContent>
          </Card>
        </div>

        <Card className="tech-card mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" /> Request Withdrawal</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Amount (ETB) *</Label>
                <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <Label>Bank / Method *</Label>
                <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {BANKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Account Holder Name *</Label>
                <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
              </div>
              <div>
                <Label>Account / Phone Number *</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full btn-glow">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Withdrawal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            {requests.length === 0 ? <p className="text-sm text-muted-foreground">No requests yet.</p> :
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div>
                      <div className="font-bold">{Number(r.amount_etb).toLocaleString()} ETB</div>
                      <div className="text-xs text-muted-foreground">{r.payment_method} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className={`text-xs font-bold uppercase px-2 py-1 rounded ${r.status === "approved" || r.status === "paid" ? "bg-success/20 text-success" : r.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>{r.status}</div>
                  </div>
                ))}
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
