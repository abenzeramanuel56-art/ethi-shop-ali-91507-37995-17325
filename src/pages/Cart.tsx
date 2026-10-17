import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, ShoppingBag, MapPin, Loader2, Navigation, CheckCircle2, AlertCircle, Bike, Car, Truck as TruckIcon, Zap, Copy, Check, FolderUp, XCircle, Landmark, Smartphone, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { deliveryFee, productSubtotal } from "@/lib/pricing";

interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  price_etb: number;
  quantity: number;
  image_url?: string;
  store_type?: string;
  seller_id?: string;
  reseller_profit_etb?: number;
}

const Cart = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cbe" | "telebirr" | "">("");
  const [customerLatitude, setCustomerLatitude] = useState<number | null>(null);
  const [customerLongitude, setCustomerLongitude] = useState<number | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string>("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<"any" | "motorbike" | "car" | "van" | "truck">("any");
  const { loading: locationLoading, requestLocation } = useGeolocation();
  const [verifyError, setVerifyError] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // distance is unknown at checkout time; use a flat min fee preview
  const subtotal = productSubtotal(cartItems);
  const previewDeliveryFee = deliveryFee(0); // min 50 ETB shown until route is known
  const grandTotal = subtotal + previewDeliveryFee;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUser(session.user);
    loadProfile(session.user.id);
    loadCart();
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await (supabase as any).from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) {
      setShippingAddress(data.shipping_address || "");
      setCity(data.city || "");
      setPhone(data.phone || "");
    }
  };

  const loadCart = () => {
    const saved = localStorage.getItem("cart");
    if (saved) setCartItems(JSON.parse(saved));
  };

  const updateCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem("cart", JSON.stringify(items));
  };

  const removeItem = (id: string) => {
    updateCart(cartItems.filter(item => item.id !== id));
    toast.success(t('cart.itemRemoved'));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    updateCart(cartItems.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const calculateTotal = () => cartItems.reduce((sum, item) => sum + (item.price_etb * item.quantity), 0);

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { "Accept-Language": "en" } });
      if (!r.ok) return null;
      const j = await r.json();
      return j?.display_name || null;
    } catch { return null; }
  };

  const persistLocation = async (lat: number, lng: number) => {
    if (!user?.id) return;
    // best-effort: keep the profile in sync so drivers always have a fallback pin
    await (supabase as any)
      .from("profiles")
      .update({ latitude: lat, longitude: lng, location_updated_at: new Date().toISOString() })
      .eq("id", user.id);
  };

  const applyCoords = async (lat: number, lng: number) => {
    setCustomerLatitude(lat);
    setCustomerLongitude(lng);
    const addr = await reverseGeocode(lat, lng);
    if (addr) {
      setDetectedAddress(addr);
      if (!shippingAddress) setShippingAddress(addr);
    }
    persistLocation(lat, lng).catch((e) => console.warn("Could not save location to profile", e));
  };

  const handleGetLocation = async () => {
    setLocationError(null);
    try {
      const coords = await requestLocation();
      await applyCoords(coords.latitude, coords.longitude);
      toast.success("📍 Location captured!");
    } catch (err: any) {
      console.error("Share location failed:", err);
      setLocationError(err?.message || "Failed to get location. You can still order with a manual address.");
    }
  };


  const handleCheckout = async () => {
    if (!shippingAddress?.trim() || !city?.trim() || !phone?.trim()) {
      toast.error("Please fill in your address, city and phone number to deliver your order.");
      return;
    }
    if (!paymentMethod) {
      toast.error(t('cart.selectPaymentMethod'));
      return;
    }
    if (cartItems.length === 0) {
      toast.error(t('cart.emptyCart'));
      return;
    }

    // GPS is OPTIONAL — never auto-request (avoids the "abeniexpress.lovable.app
    // wants to know your location" browser popup at checkout). User can opt-in
    // explicitly via the "Share My Location" button above.
    const lat = customerLatitude;
    const lng = customerLongitude;

    setSubmitting(true);

    if (!paymentProof) {
      toast.error("Please upload your payment receipt screenshot.");
      return;
    }
    setVerifyError(false);

    try {
      let paymentProofUrl = null;
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, paymentProof);
        if (uploadError) throw new Error(`Could not upload payment proof: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
        paymentProofUrl = publicUrl;
      }

      const hasSellerItems = cartItems.some(i => i.store_type === "seller" || i.store_type === "reseller");
      const storeType = hasSellerItems ? "seller" : "admin";
      const sellerId = hasSellerItems ? cartItems.find(i => i.store_type === "seller" || i.store_type === "reseller")?.seller_id || null : null;

      const subtotalNow = productSubtotal(cartItems);
      const feeNow = deliveryFee(0); // recalculated on driver acceptance using real distance

      let orderId = pendingOrderId;
      if (orderId) {
        await (supabase as any).from("orders").update({ payment_proof_url: paymentProofUrl, payment_method: paymentMethod }).eq("id", orderId);
      } else {
        const { data: order, error: orderError } = await (supabase as any)
          .from("orders")
          .insert({
            customer_id: user.id,
            shipping_address: shippingAddress,
            city: city,
            phone: phone,
            total_etb: subtotalNow + feeNow,
            delivery_fee_etb: feeNow,
            payment_proof_url: paymentProofUrl,
            payment_method: paymentMethod,
            status: "pending_payment",
            store_type: storeType,
            seller_id: sellerId,
            customer_latitude: lat,
            customer_longitude: lng,
            preferred_vehicle_type: vehicle,
          })
          .select()
          .single();
        if (orderError) throw new Error(orderError.message || 'Failed to create order');
        if (!order) throw new Error("Order creation failed");

        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity: item.quantity,
          price_etb: item.price_etb,
          reseller_profit_etb: item.reseller_profit_etb ?? 0
        }));
        const { error: itemsError } = await (supabase as any).from("order_items").insert(orderItems);
        if (itemsError) throw new Error(itemsError.message || 'Failed to create order items');
        orderId = order.id;
        setPendingOrderId(order.id);
      }

      // Automated receipt verification (amount = exact order total)
      const fd = new FormData();
      fd.append("receipt", paymentProof);
      fd.append("order_id", orderId!);
      fd.append("amount", String(subtotalNow + feeNow));
      fd.append("payment_method", paymentMethod);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment-receipt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: fd,
      });
      const result = await res.json().catch(() => ({}));
      if (result?.verified) {
        localStorage.removeItem("cart");
        setCartItems([]);
        setConfirmedRef(String(result.reference || orderId).slice(0, 8).toUpperCase());
      } else {
        setVerifyError(true);
      }
    } catch (error: any) {
      toast.error(error.message || t('cart.orderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1800);
  };

  const pickFile = (f?: File | null) => {
    if (f && f.type.startsWith("image/")) { setPaymentProof(f); setVerifyError(false); }
    else if (f) toast.error("Please upload an image screenshot.");
  };

  const instructions = paymentMethod === "cbe"
    ? [{ k: "Bank Name", v: "Commercial Bank of Ethiopia (CBE)" }, { k: "Account Number", v: "1000036292017", copy: true }, { k: "Account Name", v: "Selamawit Gebretsadik" }]
    : [{ k: "Payment Type", v: "Telebirr" }, { k: "Phone Number", v: "0998265025", copy: true }, { k: "Account Name", v: "Selamawit Gebretsadik" }];

  if (confirmedRef) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <div className="tech-card p-8 sm:p-10 text-center max-w-md w-full space-y-5">
            <div className="mx-auto h-20 w-20 rounded-full bg-success/15 border border-success/40 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-11 w-11 text-success" />
            </div>
            <h1 className="text-3xl font-black text-foreground">Order Confirmed!</h1>
            <p className="text-muted-foreground text-sm">Your payment was verified automatically. We're preparing your order now.</p>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Order Reference</p>
              <p className="text-2xl font-mono font-black text-primary">#{confirmedRef}</p>
            </div>
            <Button className="w-full btn-glow" onClick={() => navigate("/account")}>View My Orders</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {submitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md px-6">
          <div className="tech-card p-8 max-w-sm w-full text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <p className="font-bold text-foreground">Automatically verifying payment with the network...</p>
            <p className="text-sm text-muted-foreground">Please do not close this window.</p>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-black text-foreground">{t('cart.title')}</h1>

        {cartItems.length === 0 ? (
          <div className="tech-card p-12 text-center max-w-md mx-auto">
            <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <p className="mb-4 text-xl text-muted-foreground">{t('cart.empty')}</p>
            <Button onClick={() => navigate("/products")} className="btn-glow">{t('cart.browseProducts')}</Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="tech-card p-4 flex gap-4">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.product_name}</h3>
                    <p className="text-primary font-bold">{item.price_etb.toLocaleString()} {t('common.etb')}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <p className="font-bold text-sm">{(item.price_etb * item.quantity).toLocaleString()} ETB</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout */}
            <div className="tech-card p-6 space-y-4 h-fit sticky top-24">
              <h2 className="text-lg font-black text-foreground">{t('cart.checkout')}</h2>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.shippingAddress')} *</Label>
                <Textarea
                  placeholder={t('cart.shippingAddress')}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="bg-muted/50 border-border/50 resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.city')} *</Label>
                  <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="bg-muted/50 border-border/50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.phone')} *</Label>
                  <Input placeholder="+251..." value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/50 border-border/50" />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Delivery GPS Location</Label>
                <Button
                  type="button"
                  variant={customerLatitude ? "outline" : "default"}
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className={`w-full gap-2 ${customerLatitude ? "border-success/40 text-success bg-success/10 hover:bg-success/20" : "btn-glow"}`}
                  style={customerLatitude ? { borderColor: 'hsl(var(--success) / 0.4)', color: 'hsl(var(--success))' } : {}}
                >
                  {locationLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Getting Location...</>
                  ) : customerLatitude ? (
                    <><CheckCircle2 className="h-4 w-4" /> Location Captured ✓</>
                  ) : (
                    <><Navigation className="h-4 w-4" /> Share My Location</>
                  )}
                </Button>
                {customerLatitude && (
                  <p className="text-xs text-muted-foreground text-center font-mono">
                    📍 {customerLatitude.toFixed(5)}, {customerLongitude?.toFixed(5)}
                  </p>
                )}
                {detectedAddress && (
                  <p className="text-xs text-success bg-success/10 rounded p-2">📍 Detected: {detectedAddress}</p>
                )}
                {locationError && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-destructive">{locationError}</p>
                  </div>
                )}
                {locationError && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude e.g. 9.0192"
                      inputMode="decimal"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= -90 && v <= 90) setCustomerLatitude(v);
                      }}
                      className="bg-muted/50 border-border/50"
                    />
                    <Input
                      placeholder="Longitude e.g. 38.7525"
                      inputMode="decimal"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= -180 && v <= 180) setCustomerLongitude(v);
                      }}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">📍 GPS is optional — typed address still works</p>

              </div>

              {/* Vehicle preference */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preferred Delivery Vehicle</Label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="any">Any available driver</option>
                  <option value="motorbike">🏍️ Motorbike (small parcels)</option>
                  <option value="car">🚗 Car (medium parcels)</option>
                  <option value="van">🚐 Van (bulky items)</option>
                  <option value="truck">🚛 Truck (heavy / large)</option>
                </select>
                <p className="text-xs text-muted-foreground">Only drivers with this vehicle will be notified</p>
              </div>

              {/* Payment */}
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex gap-2.5">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-foreground">
                    <span className="font-black text-primary">⚡ Instant Automated Verification:</span> Do not wait for an admin to manually verify your payment! Our system automatically verifies your receipt with the bank network in under 2 seconds for instant order approval.
                  </p>
                </div>

                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.paymentMethod')} *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([["cbe", "CBE", "Commercial Bank of Ethiopia", Landmark], ["telebirr", "Telebirr", "Mobile money", Smartphone]] as const).map(([id, name, sub, Icon]) => {
                    const active = paymentMethod === id;
                    return (
                      <button key={id} type="button" onClick={() => setPaymentMethod(id)}
                        className={`relative rounded-xl border p-3 text-left transition-all ${active ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.25)]" : "border-border/50 bg-muted/40 hover:border-primary/40"}`}>
                        {active && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                        <Icon className="h-5 w-5 text-primary mb-1.5" />
                        <p className="font-bold text-sm text-foreground">{name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 animate-fade-in">
                    {instructions.map((row) => (
                      <div key={row.k} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.k}</p>
                          <p className={`font-bold text-foreground break-words ${row.copy ? "font-mono text-base" : "text-sm"}`}>{row.v}</p>
                        </div>
                        {row.copy && (
                          <Button type="button" size="sm" variant="outline" className="h-8 gap-1 flex-shrink-0" onClick={() => copy(row.v)}>
                            {copied === row.v ? <><Check className="h-3.5 w-3.5 text-success" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                          </Button>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                      Note: Please {paymentMethod === "cbe" ? "transfer" : "send"} the exact order total (<span className="font-bold text-primary">{grandTotal.toLocaleString()} ETB</span>) and upload the receipt screenshot below.
                    </p>
                  </div>
                )}

                <label
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/10" : paymentProof ? "border-success/50 bg-success/5" : "border-border/60 bg-muted/30 hover:border-primary/50"}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                  {paymentProof ? (
                    <><CheckCircle2 className="h-8 w-8 text-success" /><p className="text-sm font-semibold text-foreground truncate max-w-full">{paymentProof.name}</p><p className="text-xs text-muted-foreground">Tap to replace</p></>
                  ) : (
                    <><FolderUp className="h-8 w-8 text-primary" /><p className="text-sm font-semibold text-foreground">Upload receipt screenshot *</p><p className="text-xs text-muted-foreground">Drag & drop or tap to browse</p></>
                  )}
                </label>

                {verifyError && (
                  <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <p className="text-xs text-destructive font-medium">Verification Failed. Please make sure you uploaded the correct, unedited screenshot of your transfer with the exact order total.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString()} ETB</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery (min, recalculated by driver)</span><span>{previewDeliveryFee.toLocaleString()} ETB</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-border/30">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-2xl font-black text-primary">{grandTotal.toLocaleString()} ETB</span>
                </div>
                <Button className="w-full btn-glow font-bold h-12 mt-2 gap-2" onClick={handleCheckout} disabled={submitting}>
                  <ShieldCheck className="h-4 w-4" /> Verify & Complete Order
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
