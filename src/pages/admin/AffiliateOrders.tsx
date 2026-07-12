import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SignedImage, openSignedUrl } from "@/components/SignedImage";
import { CheckCircle, XCircle, MapPin, Phone, User } from "lucide-react";

interface AffOrder {
  id: string;
  buyer_id: string | null;
  affiliate_store_id: string;
  affiliate_product_id: string;
  sold_price_etb: number;
  base_price_etb: number;
  affiliate_profit_etb: number;
  platform_earning_etb: number;
  total_etb: number;
  status: string;
  payment_proof_url: string | null;
  shipping_address: string | null;
  phone: string | null;
  city: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  admin_notes: string | null;
  created_at: string;
  product_name?: string;
  store_name?: string;
  buyer_name?: string;
}

export default function AdminAffiliateOrders() {
  const [orders, setOrders] = useState<AffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("affiliate_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load affiliate orders"); setLoading(false); return; }

    const enriched = await Promise.all(
      (data || []).map(async (o: any) => {
        const [{ data: ap }, { data: store }, { data: buyer }] = await Promise.all([
          (supabase as any).from("affiliate_products").select("custom_title, products(name)").eq("id", o.affiliate_product_id).maybeSingle(),
          (supabase as any).from("affiliate_stores").select("store_name").eq("id", o.affiliate_store_id).maybeSingle(),
          o.buyer_id ? (supabase as any).from("profiles").select("full_name").eq("id", o.buyer_id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        return {
          ...o,
          product_name: ap?.custom_title || ap?.products?.name || "Product",
          store_name: store?.store_name || "—",
          buyer_name: buyer?.full_name || "Guest",
        };
      })
    );
    setOrders(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verify = async (id: string) => {
    setProcessingId(id);
    const { error } = await (supabase as any).rpc("admin_verify_affiliate_order", { p_order_id: id });
    setProcessingId(null);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Payment verified — affiliate paid ✓");
    load();
  };

  const reject = async (id: string) => {
    setProcessingId(id);
    const { error } = await (supabase as any)
      .from("affiliate_orders")
      .update({ status: "rejected", admin_notes: notes[id] || "Payment could not be verified" })
      .eq("id", id);
    setProcessingId(null);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Order rejected");
    load();
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading affiliate orders...</div>;

  const pending = orders.filter(o => o.status === "pending");
  const others = orders.filter(o => o.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Affiliate Orders</h2>
        <p className="text-sm text-muted-foreground">Verify payments to release affiliate commissions and fulfill delivery.</p>
      </div>

      {pending.length === 0 && others.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">No affiliate orders yet.</Card>
      )}

      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-primary mb-2">Pending Verification ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(o => (
              <Card key={o.id} className="p-4 tech-card">
                <div className="flex flex-wrap justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground">Store: {o.store_name} • Order #{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary">{o.status}</Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {o.buyer_name}</p>
                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {o.phone || "—"}</p>
                    <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5" /> <span>{o.shipping_address || "—"}{o.city ? `, ${o.city}` : ""}</span></p>
                    {o.customer_latitude && o.customer_longitude && (
                      <a href={`https://www.google.com/maps?q=${o.customer_latitude},${o.customer_longitude}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        View GPS location
                      </a>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p>Sold: <b>{o.sold_price_etb} ETB</b></p>
                    <p className="text-xs text-muted-foreground">Base: {o.base_price_etb} ETB</p>
                    <p className="text-xs text-accent">Affiliate profit: {o.affiliate_profit_etb} ETB</p>
                    <p className="text-xs">Platform earning: {o.platform_earning_etb} ETB</p>
                  </div>
                </div>

                {o.payment_proof_url && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-1">Payment proof</p>
                    <SignedImage bucket="payment-proofs" path={o.payment_proof_url} alt="proof" className="max-h-40 rounded border cursor-pointer" onClick={() => openSignedUrl("payment-proofs", o.payment_proof_url!)} />
                  </div>
                )}

                <Textarea
                  className="mt-3"
                  placeholder="Admin notes (optional)"
                  value={notes[o.id] || ""}
                  onChange={(e) => setNotes(n => ({ ...n, [o.id]: e.target.value }))}
                />

                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => verify(o.id)} disabled={processingId === o.id} className="btn-glow">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {processingId === o.id ? "Processing..." : "Verify Payment & Pay Affiliate"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => reject(o.id)} disabled={processingId === o.id}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-2">History</h3>
          <div className="space-y-2">
            {others.map(o => (
              <Card key={o.id} className="p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{o.product_name}</p>
                  <p className="text-xs text-muted-foreground">{o.store_name} • {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <Badge variant={o.status === "payment_verified" ? "default" : "destructive"}>{o.status}</Badge>
                  <p className="text-xs mt-1">{o.sold_price_etb} ETB</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
