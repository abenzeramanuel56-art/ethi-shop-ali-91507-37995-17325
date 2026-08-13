import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, FileCode, FileText, Download, ShoppingCart, Smartphone, Globe, GraduationCap, Video, FileArchive, Sparkles, Zap, Trophy } from "lucide-react";
import ReportItemDialog from "@/components/ReportItemDialog";

const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles, color: "from-primary to-accent" },
  { id: "apps", label: "Apps", icon: Smartphone, color: "from-blue-500 to-cyan-500" },
  { id: "websites", label: "Websites", icon: Globe, color: "from-purple-500 to-pink-500" },
  { id: "code", label: "Code", icon: FileCode, color: "from-emerald-500 to-teal-500" },
  { id: "courses", label: "Courses", icon: GraduationCap, color: "from-orange-500 to-red-500" },
  { id: "videos", label: "Videos", icon: Video, color: "from-rose-500 to-pink-500" },
  { id: "documents", label: "Docs", icon: FileText, color: "from-amber-500 to-orange-500" },
  { id: "other", label: "Other", icon: FileArchive, color: "from-slate-500 to-slate-700" },
];

function DigitalMarketInner() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Record<string, string>>({});
  const [paymentProof, setPaymentProof] = useState<Record<string, File | null>>({});
  const [downloadCodeInput, setDownloadCodeInput] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    let isMounted = true;
    init(isMounted);
    return () => {
      isMounted = false;
    };
  }, []);

  const init = async (isMounted: boolean) => {
    try {
      // Safety timeout promise to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Init timeout")), 6000)
      );

      const fetchPromise = (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user || null);

        const { data, error } = await (supabase as any)
          .from("digital_products")
          .select("*")
          .eq("ai_verification_status", "approved")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!isMounted) return;
        if (error) {
          console.error("Failed fetching digital products:", error);
          setProducts([]);
        } else {
          setProducts(data || []);
        }

        if (session) {
          const { data: orders } = await (supabase as any)
            .from("digital_product_orders")
            .select("*")
            .eq("buyer_id", session.user.id)
            .order("created_at", { ascending: false });
          
          if (isMounted) {
            setMyOrders(orders || []);
          }
        }
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.error("Digital market load failed or timed out:", err);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const filtered = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => (p.category || "other") === activeCategory);
  }, [products, activeCategory]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: products.length };
    products.forEach((p) => { const c = p.category || "other"; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [products]);

  const buy = async (p: any) => {
    if (!user) { navigate("/auth"); return; }
    const method = paymentMethod[p.id];
    const proof = paymentProof[p.id];
    if (!method) { toast.error("Choose payment method"); return; }
    if (!proof) { toast.error("Upload payment proof screenshot"); return; }

    setBuying(p.id);
    try {
      const ext = proof.name.split('.').pop();
      const path = `${user.id}/digital-${Date.now()}.${ext}`;
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

      toast.success("🎮 Quest accepted! Waiting for admin to verify your payment.");
      let isMounted = true;
      await init(isMounted);
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

    await (supabase as any).from("digital_product_orders").update({ download_count: (order.download_count || 0) + 1 }).eq("id", order.id);

    window.open(signed.signedUrl, "_blank");
    toast.success("⚡ Download started!");
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></div>;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* gamer background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-bold text-primary mb-4 uppercase tracking-widest">
            <Zap className="h-3 w-3" /> Level Up Your Stack
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
            Digital Center
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Buy AI-verified apps, websites, code, courses, videos and documents from Ethiopian creators. Every drop is reviewed by AI.
          </p>
        </div>

        {/* My purchases */}
        {user && myOrders.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-accent" />
              <h2 className="text-xl font-bold">My Inventory</h2>
            </div>
            <div className="grid gap-3">
              {myOrders.map((o) => (
                <Card key={o.id} className="tech-card border border-primary/20">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-mono text-muted-foreground">Order #{o.id.slice(0, 8)}</div>
                      <Badge variant={o.status === "completed" ? "default" : "outline"}>{o.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="text-sm">{Number(o.price_etb).toLocaleString()} ETB</div>
                    {o.status === "completed" && o.download_code && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground">🔑 Your unlock code:</div>
                        <div className="font-mono text-base font-black text-primary tracking-widest">{o.download_code}</div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter code to download"
                            value={downloadCodeInput[o.id] || ""}
                            onChange={(e) => setDownloadCodeInput((prev) => ({ ...prev, [o.id]: e.target.value }))}
                            className="font-mono"
                          />
                          <Button onClick={() => downloadWithCode(o)} className="btn-glow">
                            <Download className="h-4 w-4 mr-1" /> Claim
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

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const count = counts[c.id] || 0;
              return (
                <TabsTrigger
                  key={c.id}
                  value={c.id}
                  className={`flex items-center gap-2 rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:${c.color} data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-xs opacity-70">({count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            {filtered.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No drops in this category yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((p) => {
                  const cat = CATEGORIES.find((c) => c.id === (p.category || "other")) || CATEGORIES[CATEGORIES.length - 1];
                  const CatIcon = cat.icon;
                  return (
                    <Card key={p.id} className="tech-card group relative overflow-hidden border border-border/50 hover:border-primary/50 transition-all hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)]">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${cat.color} opacity-10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`} />
                      <CardContent className="p-5 space-y-3 relative">
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <CatIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base truncate">{p.title}</h3>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">{cat.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{p.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {Number(p.price_etb).toLocaleString()} ETB
                          </div>
                          <ReportItemDialog itemId={p.id} itemName={p.title} reportType="digital_product" triggerLabel="" variant="ghost" size="icon" />
                        </div>

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
                            <div className="text-xs bg-muted/50 rounded p-2 border border-border/50">
                              💸 Send <b>{Number(p.price_etb).toLocaleString()} ETB</b> to {paymentMethod[p.id] === "telebirr" ? "+251998265025 (TeleBirr)" : "1000036292017 (CBE)"}
                            </div>
                          )}
                          <Input type="file" accept="image/*" onChange={(e) => setPaymentProof((prev) => ({ ...prev, [p.id]: e.target.files?.[0] || null }))} className="text-xs" />
                          <Button onClick={() => buy(p)} disabled={buying === p.id} className="w-full btn-glow font-bold">
                            {buying === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4 mr-1" /> Buy Now</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { TabLockGate as _TabLockGateDig } from "@/components/TabLockGate";
export default function DigitalMarketPage() {
  return <_TabLockGateDig tab="digital" label="Digital marketplace"><DigitalMarketInner /></_TabLockGateDig>;
}
