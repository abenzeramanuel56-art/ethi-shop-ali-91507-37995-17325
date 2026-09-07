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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !address || !city) { toast.error("Please fill in all delivery fields"); return; }
    if (!paymentMethod) { toast.error("Please choose a payment method"); return; }
    if (!proofFile) { toast.error("Please upload your payment screenshot"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubmitting(false);
        toast.error("Please sign in to complete your purchase.");
        navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const safeName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${user.id}/affiliate-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(filename, proofFile);
      if (upErr) throw new Error(`Could not upload your payment screenshot: ${upErr.message}`);

      const base = Number(item.products.price_etb);
      const sold = Number(item.custom_price_etb);
      const profit = sold - base;
      const platform = base * 0.10;

      const { error } = await (supabase as any).from("affiliate_orders").insert({
        buyer_id: user.id,
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
        customer_latitude: lat,
        customer_longitude: lng,
        payment_proof_url: filename,
        status: "pending",
      });
      if (error) throw error;

      setSuccess(true);
      toast.success("Order submitted! Abeni Express will verify and deliver.");
      setTimeout(() => navigate("/"), 3500);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit order");
    } finally { setSubmitting(false); }
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Delivery Details */}
          <Card className="p-5 tech-card space-y-3">
            <h2 className="font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Delivery Details</h2>

            <div>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519..." required />
            </div>

            {/* Location choice */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <Label className="mb-2 block">How do you want to give your address?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={locationMode === "share" ? "default" : "outline"}
                  className="w-full"
                  onClick={handleShareLocation}
                  disabled={locLoading}
                >
                  {locLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Navigation className="h-4 w-4 mr-1" />}
                  Share Current Location
                </Button>
                <Button
                  type="button"
                  variant={locationMode === "type" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => { setLocationMode("type"); setLat(null); setLng(null); }}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Type Address
                </Button>
              </div>
              {locationError && <p className="text-xs text-destructive mt-2">{locationError}</p>}
              {lat && lng && (
                <p className="text-xs text-primary mt-2">📍 GPS captured ({lat.toFixed(4)}, {lng.toFixed(4)})</p>
              )}
            </div>

            <div>
              <Label>City *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div>
              <Label>Delivery Address *</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={2} placeholder="Neighborhood, street, landmarks..." />
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-5 tech-card space-y-3">
            <h2 className="font-bold">Payment</h2>
            <p className="text-sm text-muted-foreground">
              Send <b className="text-primary">{item.custom_price_etb} ETB</b> to Abeni Express, then upload your screenshot below.
            </p>

            <div>
              <Label>Payment Method *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button type="button" variant={paymentMethod === "cbe" ? "default" : "outline"} onClick={() => setPaymentMethod("cbe")}>CBE</Button>
                <Button type="button" variant={paymentMethod === "telebirr" ? "default" : "outline"} onClick={() => setPaymentMethod("telebirr")}>TeleBirr</Button>
              </div>
              {paymentMethod === "cbe" && (
                <p className="text-xs mt-2 p-2 rounded bg-muted/50">CBE Account: <b>1000123456789</b> — Abeni Express</p>
              )}
              {paymentMethod === "telebirr" && (
                <p className="text-xs mt-2 p-2 rounded bg-muted/50">TeleBirr: <b>+251900000000</b> — Abeni Express</p>
              )}
            </div>

            <div>
              <Label>Payment Proof (screenshot) *</Label>
              <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} required />
            </div>
          </Card>

          {/* Total */}
          <Card className="p-4 tech-card flex justify-between items-center">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-black text-primary">{item.custom_price_etb} ETB</span>
          </Card>

          <Button type="submit" disabled={submitting} className="w-full btn-glow h-12 text-base">
            {submitting ? "Submitting..." : `Place Order — ${item.custom_price_etb} ETB`}
          </Button>
        </form>
      </div>
    </div>
  );
}
