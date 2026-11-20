import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, ShoppingCart, Package, Wrench, Sparkles, BadgeCheck, Phone, Mail, Store as StoreIcon } from "lucide-react";
import ReportStoreDialog from "@/components/ReportStoreDialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreInfo { id: string; store_name: string; store_slug: string; contact_email: string; contact_phone: string; }
type Tab = "products" | "services" | "digital";

export default function Store() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [digital, setDigital] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("products");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const slug = (storeSlug || "").toLowerCase();
      const { data: s } = await supabase.rpc("get_store_by_slug", { p_slug: slug }).maybeSingle();
      if (!s) { toast.error(t("store.notFound")); navigate("/"); return; }
      const info = s as StoreInfo;
      setStore(info);
      const [own, linked, svc, dig] = await Promise.all([
        supabase.from("products").select("*").eq("seller_id", info.id).eq("stock_status", true).order("created_at", { ascending: false }).limit(200),
        (supabase as any).from("seller_products").select("seller_price_etb, products(*)").eq("store_id", info.id).eq("is_active", true).limit(200),
        supabase.from("services").select("*").eq("seller_id", info.id).eq("is_active", true).order("created_at", { ascending: false }).limit(200),
        (supabase as any).from("digital_products").select("id,title,description,price_etb,preview_url,category,product_type").eq("store_id", info.id).eq("is_active", true).eq("ai_verification_status", "approved").limit(200),
      ]);
      const map = new Map<string, any>();
      (own.data || []).forEach((p: any) => map.set(p.id, p));
      (linked.data || []).forEach((r: any) => { const p = Array.isArray(r.products) ? r.products[0] : r.products; if (p && !map.has(p.id)) map.set(p.id, { ...p, price_etb: r.seller_price_etb ?? p.price_etb }); });
      const list = [...map.values()];
      setProducts(list); setServices(svc.data || []); setDigital(dig.data || []);
      setTab(list.length ? "products" : (svc.data?.length ? "services" : (dig.data?.length ? "digital" : "products")));
      setLoading(false);
    })();
  }, [storeSlug]);

  const match = (txt: string) => txt.toLowerCase().includes(q.trim().toLowerCase());
  const shown = useMemo(() => {
    if (tab === "products") return products.filter(p => match(p.name || ""));
    if (tab === "services") return services.filter(s => match(s.title || ""));
    return digital.filter(d => match(d.title || ""));
  }, [tab, q, products, services, digital]);

  const addToCart = (p: any, go = false) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const ex = cart.find((i: any) => i.product_id === p.id);
    if (ex) ex.quantity += 1;
    else cart.push({ id: `${p.id}-${Date.now()}`, product_id: p.id, product_name: p.name, price_etb: Number(p.price_etb), quantity: 1, image_url: p.image_url, store_type: "seller", seller_id: store?.id });
    localStorage.setItem("cart", JSON.stringify(cart));
    if (go) navigate("/cart"); else toast.success(`${p.name} ${t("store.addedToCartDesc")}`);
  };

  if (loading || !store) return <div className="min-h-screen bg-background"><Navbar /><p className="py-20 text-center text-muted-foreground">{t("store.loading")}</p></div>;

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "products", label: "Products", icon: Package, count: products.length },
    { key: "services", label: "Services", icon: Wrench, count: services.length },
    { key: "digital", label: "Digital", icon: Sparkles, count: digital.length },
  ];
  const initials = store.store_name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <header className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.25), transparent 65%)" }} />
        <div className="container relative mx-auto px-4 py-12 md:py-16 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-3xl font-black text-primary-foreground shadow-lg" style={{ boxShadow: "var(--glow-primary)" }}>
            {initials || <StoreIcon />}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">{store.store_name}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary"><BadgeCheck className="h-3.5 w-3.5" /> Verified Abeni Express seller</Badge>
            {store.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{store.contact_phone}</span>}
            {store.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{store.contact_email}</span>}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Secure checkout by Abeni Express · Telebirr & CBE</p>
          <div className="mt-6 flex justify-center gap-6 md:gap-10">
            {tabs.map(x => <div key={x.key}><div className="text-2xl font-black text-primary">{x.count}</div><div className="text-xs text-muted-foreground">{x.label}</div></div>)}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map(x => (
              <Button key={x.key} variant={tab === x.key ? "default" : "outline"} size="sm" className="gap-1.5 shrink-0" onClick={() => setTab(x.key)}>
                <x.icon className="h-4 w-4" />{x.label} <span className="opacity-70">({x.count})</span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search this store..." value={q} onChange={e => setQ(e.target.value)} className="pl-10" />
            </div>
            <ReportStoreDialog storeId={store.id} storeName={store.store_name} />
          </div>
        </div>

        {shown.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">Nothing here yet.</Card>
        ) : tab === "products" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map(p => (
              <Card key={p.id} className="group flex flex-col overflow-hidden tech-card transition-all hover:-translate-y-1">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={p.image_url || "/placeholder.svg"} alt={p.name} loading="lazy" onError={e => { e.currentTarget.src = "/placeholder.svg"; }} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="line-clamp-2 text-sm font-medium">{p.name}</h3>
                  <div className="mt-auto pt-2 text-lg font-black text-primary">{Number(p.price_etb).toLocaleString()} <span className="text-xs text-muted-foreground">ETB</span></div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => addToCart(p)} aria-label="Add to cart"><ShoppingCart className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" className="flex-[2] h-8 text-xs font-bold" onClick={() => addToCart(p, true)}>{t("products.buyNow")}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : tab === "services" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(s => (
              <Card key={s.id} className="flex flex-col p-5 tech-card">
                <Badge variant="outline" className="mb-2 w-fit">{s.custom_category || s.category}</Badge>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-lg font-black text-primary">{Number(s.price_etb).toLocaleString()} ETB<span className="text-xs text-muted-foreground"> / {s.price_type}</span></span>
                  <Button size="sm" asChild><Link to={`/order-service/${s.id}`}>Order</Link></Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(d => (
              <Card key={d.id} className="flex flex-col p-5 tech-card">
                <Badge variant="outline" className="mb-2 w-fit gap-1"><Sparkles className="h-3 w-3" />{d.category}</Badge>
                <h3 className="font-bold">{d.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{d.description}</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-lg font-black text-primary">{Number(d.price_etb).toLocaleString()} ETB</span>
                  <Button size="sm" asChild><Link to={`/digital-market?q=${encodeURIComponent(d.title)}`}>Buy</Link></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
