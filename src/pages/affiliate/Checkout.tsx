import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function AffiliateCheckout() {
  const { storeSlug, productId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await (supabase as any).from("affiliate_stores").select("*").eq("store_slug", storeSlug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setStore(s);
      const { data: p } = await (supabase as any)
        .from("affiliate_products")
        .select("*, products(name, price_etb, image_url)")
        .eq("id", productId).eq("affiliate_store_id", s.id).eq("is_active", true).maybeSingle();
      setItem(p);
      // Track click
      if (p) await (supabase as any).rpc("affiliate_product_click", { p_product_id: p.id });
      setLoading(false);
    })();
  }, [storeSlug, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) { toast.error("Upload payment proof"); return; }
    if (!phone || !address) { toast.error("Fill all fields"); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const filename = `affiliate/${Date.now()}-${proofFile.name}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(filename, proofFile);
      if (upErr) throw upErr;

      const base = item.products.price_etb;
      const sold = item.custom_price_etb;
      const profit = sold - base;
      // platform earning = 10% of base + delivery handled later
      const platform = base * 0.10;

      const { error } = await (supabase as any).from("affiliate_orders").insert({
        buyer_id: user?.id || null,
        affiliate_store_id: store.id,
        affiliate_product_id: item.id,
        original_product_id: item.original_product_id,
        quantity: 1,
        sold_price_etb: sold,
        base_price_etb: base,
        affiliate_profit_etb: profit,
        platform_earning_etb: platform,
        total_etb: sold,
        phone, shipping_address: address, city,
        payment_proof_url: filename,
        status: "pending",
      });
      if (error) throw error;
      setSuccess(true);
      toast.success("Order submitted! Redirecting to Abeni Express...");
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit order");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /></div>;
  if (!item) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center">Product unavailable</div></div>;

  if (success) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto p-10 text-center max-w-md">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-black mb-2">Order Received!</h1>
        <p className="text-muted-foreground">Abeni Express will verify your payment and process delivery. Redirecting...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-4 mb-4 tech-card flex gap-4">
          <img src={item.products.image_url || "/placeholder.svg"} alt="" className="w-20 h-20 rounded object-cover" />
          <div className="flex-1">
            <h2 className="font-bold">{item.custom_title || item.products.name}</h2>
            <p className="text-xs text-muted-foreground">From {store.store_name}</p>
            <div className="text-2xl font-black text-primary mt-1">{item.custom_price_etb} ETB</div>
          </div>
        </Card>

        <Card className="p-6 tech-card">
          <h1 className="text-xl font-bold mb-4">Complete Your Order</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
            <div><Label>City *</Label><Input value={city} onChange={(e) => setCity(e.target.value)} required /></div>
            <div><Label>Delivery Address *</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} required /></div>
            <div className="p-3 rounded bg-muted/50 text-sm">
              <p className="font-semibold mb-1">Payment Instructions</p>
              <p>Send <b className="text-primary">{item.custom_price_etb} ETB</b> to Abeni Express official account, then upload the screenshot below.</p>
            </div>
            <div>
              <Label>Payment Proof *</Label>
              <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full btn-glow">
              {submitting ? "Submitting..." : `Pay ${item.custom_price_etb} ETB`}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
