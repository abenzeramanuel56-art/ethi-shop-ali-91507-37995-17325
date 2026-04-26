import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FileCode, FileText, Download, ShoppingCart, KeyRound } from "lucide-react";

export default function DigitalMarket() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Record<string, string>>({});
  const [paymentProof, setPaymentProof] = useState<Record<string, File | null>>({});
  const [downloadCodeInput, setDownloadCodeInput] = useState<Record<string, string>>({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    const { data } = await (supabase as any).from("digital_products").select("*").eq("ai_verification_status", "approved").eq("is_active", true).order("created_at", { ascending: false });
    setProducts(data || []);
    if (session) {
      const { data: orders } = await (supabase as any).from("digital_product_orders").select("*").eq("buyer_id", session.user.id).order("created_at", { ascending: false });
      setMyOrders(orders || []);
    }
    setLoading(false);
  };

  const buy = async (p: any) => {
    if (!user) { navigate("/auth"); return; }
    const method = paymentMethod[p.id];
    const proof = paymentProof[p.id];
    if (!method) { toast.error("Choose payment method"); return; }
    if (!proof) { toast.error("Upload payment proof"); return; }

    setBuying(p.id);
    try {
      const ext = proof.name.split('.').pop();
      const path = `${user.id}-digital-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proof);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const { error } = await (supabase as any).from("digital_product_orders").insert({
        digital_product_id: p.id,
        buyer_id: user.id,
        seller_id: p.seller_id,
        price_etb: p.price_etb,
        payment_method: method,
        payment_proof_url: pub.publicUrl,
      });
      if (error) throw error;

      toast.success("Order placed! Once admin verifies your payment, you'll get a download code.");
      await init();
    } catch (e: any) {
      toast.error(e.message || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  const downloadWithCode = async (order: any) => {
    const code = downloadCodeInput[order.id]?.trim().toUpperCase();
    if (!code) { toast.error("Enter your download code"); return; }
    if (code !== order.download_code) { toast.error("Invalid code"); return; }

    const product = await (supabase as any).from("digital_products").select("file_url, file_name, title").eq("id", order.digital_product_id).single();
    if (!product.data) { toast.error("File not found"); return; }

    const url = product.data.file_url;
    const marker = "/digital-products/";
    const idx = url.indexOf(marker);
    const path = idx >= 0 ? url.substring(idx + marker.length).split("?")[0] : url;

    const { data: signed, error } = await supabase.storage.from("digital-products").createSignedUrl(path, 60);
    if (error || !signed) { toast.error("Could not generate download link"); return; }

    // Increment download count
    await (supabase as any).from("digital_product_orders").update({ download_count: (order.download_count || 0) + 1 }).eq("id", order.id);

    window.open(signed.signedUrl, "_blank");
    toast.success("Download started");
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-black mb-2">Digital Marketplace</h1>
        <p className="text-sm text-muted-foreground mb-8">Buy AI-verified apps, code, and digital files from Ethiopian creators.</p>

        {user && myOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">My Purchases</h2>
            <div className="grid gap-3">
              {myOrders.map((o) => (
                <Card key={o.id} className="tech-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-mono text-muted-foreground">Order #{o.id.slice(0, 8)}</div>
                      <Badge variant={o.status === "completed" ? "default" : "outline"}>{o.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="text-sm">{Number(o.price_etb).toLocaleString()} ETB</div>
                    {o.status === "completed" && o.download_code && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground">Your download code (also sent to your notifications):</div>
                        <div className="font-mono text-base font-black text-primary tracking-widest">{o.download_code}</div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Re-enter code to download"
                            value={downloadCodeInput[o.id] || ""}
                            onChange={(e) => setDownloadCodeInput((prev) => ({ ...prev, [o.id]: e.target.value }))}
                            className="font-mono"
                          />
                          <Button onClick={() => downloadWithCode(o)} className="btn-glow">
                            <Download className="h-4 w-4 mr-1" /> Download
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Downloads: {o.download_count || 0}</div>
                      </div>
                    )}
                    {o.status === "pending_payment" && (
                      <p className="text-xs text-muted-foreground">⏳ Waiting for admin to verify your payment.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-3">Browse</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground col-span-2">No digital products available yet.</div>
          ) : products.map((p) => (
            <Card key={p.id} className="tech-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {p.product_type === "code" ? <FileCode className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{p.description}</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-primary">{Number(p.price_etb).toLocaleString()} ETB</div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <select
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={paymentMethod[p.id] || ""}
                    onChange={(e) => setPaymentMethod((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  >
                    <option value="">Payment method...</option>
                    <option value="telebirr">TeleBirr</option>
                    <option value="cbe">CBE</option>
                  </select>
                  {paymentMethod[p.id] && (
                    <div className="text-xs bg-muted/50 rounded p-2">
                      Send {Number(p.price_etb).toLocaleString()} ETB to {paymentMethod[p.id] === "telebirr" ? "+251998265025 (TeleBirr)" : "1000036292017 (CBE)"}
                    </div>
                  )}
                  <Input type="file" accept="image/*" onChange={(e) => setPaymentProof((prev) => ({ ...prev, [p.id]: e.target.files?.[0] || null }))} className="text-xs" />
                  <Button onClick={() => buy(p)} disabled={buying === p.id} className="w-full btn-glow">
                    {buying === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4 mr-1" /> Buy Now</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
