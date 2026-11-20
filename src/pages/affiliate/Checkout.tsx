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
import { CheckCircle2, MapPin, Navigation, Loader2, Pencil } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function AffiliateCheckout() {
  const { storeSlug, productId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cbe" | "telebirr" | "">("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [locationMode, setLocationMode] = useState<"none" | "share" | "type">("none");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { loading: locLoading, requestLocation } = useGeolocation();

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
      if (p) await (supabase as any).rpc("affiliate_product_click", { p_product_id: p.id });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await (supabase as any).from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (prof) {
          setFullName(prof.full_name || "");
          setPhone(prof.phone || "");
          setAddress(prof.shipping_address || "");
          setCity(prof.city || "");
        }
      }
      setLoading(false);
    })();
  }, [storeSlug, productId]);

  const reverseGeocode = async (la: number, ln: number) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${ln}&zoom=18&addressdetails=1`, { headers: { "Accept-Language": "en" } });
      if (!r.ok) return null;
      const j = await r.json();
      return j?.display_name || null;
    } catch { return null; }
  };

  const handleShareLocation = async () => {
    setLocationError(null);
    try {
      const coords = await requestLocation();
      setLat(coords.latitude);
      setLng(coords.longitude);
      setLocationMode("share");
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      if (addr) setAddress(addr);
      toast.success("📍 Location captured!");
    } catch (err: any) {
      setLocationError(err?.message || "Failed to get location.");
    }
  };

  const handleBuy = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`); return; }
    const base = Number(item.products.price_etb);
    const sold = Number(item.custom_price_etb);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push({
      id: `${item.original_product_id}-aff-${Date.now()}`,
      product_id: item.original_product_id,
      product_name: item.custom_title || item.products.name,
      price_etb: sold,
      quantity: 1,
      image_url: item.products.image_url,
      store_type: "seller",
      reseller_profit_etb: Math.max(0, sold - base),
      affiliate_product_id: item.id,
      affiliate_store_id: store.id,
    });
    localStorage.setItem("cart", JSON.stringify(cart));
    navigate("/cart");
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center text-muted-foreground">Loading...</div></div>;
  if (!item) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center">Product unavailable</div></div>;

  if (success) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto p-10 text-center max-w-md">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-black mb-2">Order Received! 🎉</h1>
        <p className="text-muted-foreground">Abeni Express will verify your payment and process delivery. Redirecting...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-black mb-4">Checkout</h1>

        {/* Item */}
        <Card className="p-4 mb-4 tech-card flex gap-4">
          <img src={item.products.image_url || "/placeholder.svg"} alt="" className="w-20 h-20 rounded object-cover" />
          <div className="flex-1">
            <h2 className="font-bold">{item.custom_title || item.products.name}</h2>
            <p className="text-xs text-muted-foreground">From {store.store_name}</p>
            <div className="text-2xl font-black text-primary mt-1">{item.custom_price_etb} ETB</div>
          </div>
        </Card>

        <Card className="p-5 tech-card space-y-2 mb-4">
          <h2 className="font-bold">Secure Abeni Express checkout</h2>
          <p className="text-sm text-muted-foreground">Pay with Telebirr or CBE. Your payment is checked automatically, then Abeni Express delivers your order.</p>
        </Card>
        <Button onClick={handleBuy} className="w-full btn-glow h-12 text-base">Continue to checkout — {item.custom_price_etb} ETB</Button>
      </div>
    </div>
  );
}
