import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

export default function AffiliatePublicStore() {
  const { storeSlug } = useParams();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await (supabase as any).from("affiliate_stores").select("*").eq("store_slug", storeSlug).eq("is_active", true).maybeSingle();
      if (!s) { setLoading(false); return; }
      setStore(s);
      const { data: p } = await (supabase as any)
        .from("affiliate_products")
        .select("*, products(name, price_etb, image_url, description)")
        .eq("affiliate_store_id", s.id).eq("is_active", true);
      setProducts(p || []);
      setLoading(false);
    })();
  }, [storeSlug]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /></div>;
  if (!store) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto p-10 text-center"><h1 className="text-2xl font-bold">Store not found</h1></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-accent/10"><Store className="h-6 w-6 text-accent" /></div>
          <div>
            <h1 className="text-3xl font-black">{store.store_name}</h1>
            {store.bio && <p className="text-sm text-muted-foreground">{store.bio}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Card key={p.id} className="tech-card overflow-hidden">
              <img src={p.products?.image_url || "/placeholder.svg"} alt="" className="w-full aspect-square object-cover" />
              <div className="p-3">
                <h3 className="font-semibold line-clamp-2 text-sm">{p.custom_title || p.products?.name}</h3>
                <div className="text-xl font-black text-primary mt-1">{p.custom_price_etb} ETB</div>
                <Button asChild className="w-full mt-2 btn-glow" size="sm">
                  <Link to={`/a/${store.store_slug}/${p.id}`}>Buy Now</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
        {products.length === 0 && <p className="text-center text-muted-foreground py-10">No products yet.</p>}
      </div>
    </div>
  );
}
