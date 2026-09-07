import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Package, Wallet, ShoppingBag, ExternalLink, Trash2 } from "lucide-react";

interface Store { id: string; store_name: string; store_slug: string; }
interface AffProduct {
  id: string; custom_price_etb: number; custom_title: string | null; is_active: boolean;
  click_count: number; sale_count: number; original_product_id: string;
  products?: { name: string; price_etb: number; image_url: string } | null;
}
interface Wallet { current_balance_etb: number; total_earned_etb: number; }
interface Order { id: string; sold_price_etb: number; affiliate_profit_etb: number; status: string; created_at: string; }

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<AffProduct[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: s } = await (supabase as any).from("affiliate_stores").select("*").eq("user_id", user.id).maybeSingle();
    if (!s) { navigate("/affiliate/setup"); return; }
    setStore(s);

    const [{ data: p }, { data: w }, { data: o }] = await Promise.all([
      (supabase as any).from("affiliate_products").select("*, products(name, price_etb, image_url)").eq("affiliate_store_id", s.id).order("created_at", { ascending: false }),
      (supabase as any).from("affiliate_wallets").select("*").eq("user_id", user.id).maybeSingle(),
      (supabase as any).from("affiliate_orders").select("*").eq("affiliate_store_id", s.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setProducts(p || []);
    setWallet(w || { current_balance_etb: 0, total_earned_etb: 0 });
    setOrders(o || []);
    setLoading(false);
  };

  const copyLink = (productId: string) => {
    if (!store) return;
    const url = `${window.location.origin}/a/${store.store_slug}/${productId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const toggleActive = async (p: AffProduct) => {
    await (supabase as any).from("affiliate_products").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this product from your store?")) return;
    await (supabase as any).from("affiliate_products").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black">Affiliate Market</h1>
            <p className="text-sm text-muted-foreground">Store: <span className="text-primary font-semibold">{store?.store_name}</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to={`/a/${store?.store_slug}`}><ExternalLink className="h-4 w-4 mr-2" />View Public Store</Link></Button>
            <Button asChild><Link to="/products">+ Affiliate More Products</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 tech-card">
            <div className="flex items-center gap-3 mb-2"><Wallet className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground">Balance</span></div>
            <div className="text-3xl font-black text-primary">{Math.round(wallet?.current_balance_etb || 0).toLocaleString()} ETB</div>
            <Button size="sm" className="mt-3" onClick={() => navigate("/account")}>Withdraw</Button>
          </Card>
          <Card className="p-5 tech-card">
            <div className="flex items-center gap-3 mb-2"><ShoppingBag className="h-5 w-5 text-accent" /><span className="text-sm text-muted-foreground">Total Earned</span></div>
            <div className="text-3xl font-black">{Math.round(wallet?.total_earned_etb || 0).toLocaleString()} ETB</div>
          </Card>
          <Card className="p-5 tech-card">
            <div className="flex items-center gap-3 mb-2"><Package className="h-5 w-5" /><span className="text-sm text-muted-foreground">Products</span></div>
            <div className="text-3xl font-black">{products.length}</div>
          </Card>
        </div>

        <h2 className="text-xl font-bold mb-3">Your Affiliated Products</h2>
        {products.length === 0 ? (
          <Card className="p-8 text-center tech-card">
            <p className="text-muted-foreground mb-4">You haven't affiliated any products yet.</p>
            <Button asChild><Link to="/products">Browse Products</Link></Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {products.map((p) => (
              <Card key={p.id} className="p-4 tech-card">
                <div className="flex gap-4 items-center flex-wrap">
                  <img src={p.products?.image_url || "/placeholder.svg"} alt="" className="w-16 h-16 rounded object-cover" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{p.custom_title || p.products?.name}</div>
                    <div className="text-xs text-muted-foreground">Base: {p.products?.price_etb} ETB · Your price: <span className="text-primary font-bold">{p.custom_price_etb} ETB</span> · Profit/sale: <span className="text-accent font-bold">{p.custom_price_etb - (p.products?.price_etb || 0)} ETB</span></div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>👁 {p.click_count} clicks</span>
                      <span>💰 {p.sale_count} sales</span>
                      <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(p.id)}><Copy className="h-3 w-3 mr-1" />Copy Link</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>{p.is_active ? "Pause" : "Activate"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold mt-8 mb-3">Recent Orders</h2>
        {orders.length === 0 ? (
          <Card className="p-6 text-center tech-card"><p className="text-sm text-muted-foreground">No orders yet.</p></Card>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Card key={o.id} className="p-3 tech-card flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</div>
                  <div className="text-sm">Sold: <b>{o.sold_price_etb} ETB</b> · Your profit: <b className="text-accent">{o.affiliate_profit_etb} ETB</b></div>
                </div>
                <Badge>{o.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
