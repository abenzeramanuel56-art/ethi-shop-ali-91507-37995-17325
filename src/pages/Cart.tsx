import { useEffect, useRef, useState } from "react";
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
  const [verifyReason, setVerifyReason] = useState("unknown");
  const [pendingReview, setPendingReview] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, { name: string; account: string }> | null>(null);
  const [healthy, setHealthy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pt = (key: string) => t(`payment.${key}`);
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
    supabase.from("app_settings").select("value").eq("key", "checkout_payment_details").maybeSingle().then(({ data }) => {
      if (data) setPaymentDetails(data.value as typeof paymentDetails);
    });
    supabase.functions.invoke("payment-service-status").then(({ data }) => setHealthy(data?.healthy === true));
  }, []);

  useEffect(() => {
    if (!paymentProof || paymentProof.type === "application/pdf") { setPreview(null); return; }
    const url = URL.createObjectURL(paymentProof);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [paymentProof]);

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


  const saveOrder = async (): Promise<string | null> => {
    if (busy.current || !user?.id) return null;
    if (!shippingAddress.trim() || !city.trim() || !phone.trim() || !cartItems.length) {
      toast.error(pt('prepare_error')); return null;
    }
    busy.current = true;
    setSubmitting(true);
    try {
      const sellerId = cartItems.find(i => i.seller_id)?.seller_id || null;
      const { data: order, error } = await supabase.from("orders").insert({
        customer_id: user.id, shipping_address: shippingAddress, city, phone,
        total_etb: grandTotal, delivery_fee_etb: previewDeliveryFee,
        status: "pending_payment", store_type: sellerId ? "seller" : "admin", seller_id: sellerId,
        customer_latitude: customerLatitude, customer_longitude: customerLongitude,
        preferred_vehicle_type: vehicle,
      }).select('id,total_etb').single();
      if (error || !order) throw error;
      const { error: itemsError } = await supabase.from('order_items').insert(cartItems.map(item => ({
        order_id: order.id, product_id: item.product_id || null, product_name: item.product_name,
        quantity: item.quantity, price_etb: item.price_etb, reseller_profit_etb: item.reseller_profit_etb ?? 0,
      })));
      if (itemsError) throw itemsError;
      setPendingOrderId(order.id);
      setSavedTotal(Number(order.total_etb));
      return order.id;
    } catch {
      toast.error(pt('prepare_error')); return null;
    } finally { busy.current = false; setSubmitting(false); }
  };

  const handleCheckout = async () => {
    if (busy.current || !pendingOrderId) return;
    if (!paymentMethod) { toast.error(t('cart.selectPaymentMethod')); return; }
    if (!paymentProof && !transactionId.trim()) { toast.error(pt('missing_input')); return; }
    busy.current = true;
    setSubmitting(true);
    setVerifyError(false);
    try {
      const fd = new FormData();
      if (paymentProof) fd.append('receipt', paymentProof);
      fd.append('order_id', pendingOrderId);
      fd.append('payment_method', paymentMethod);
      fd.append('transaction_id', transactionId.trim().replace(/\s/g, ''));
      const { data: result, error } = await supabase.functions.invoke('verify-payment-receipt', { body: fd });
      if (error || result?.saved === false) throw error;
      if (result?.state === 'confirmed') {
        localStorage.removeItem('cart'); setCartItems([]);
        setConfirmedRef(pendingOrderId);
      } else if (result?.state === 'pending_review' || result?.state === 'verifying') {
        setPendingReview(true);
        setVerifyReason(result?.reason || 'service_error');
      } else {
        setVerifyError(true); setVerifyReason(result?.reason || 'unknown');
      }
    } catch {
      // A transport failure does not establish that the backend saved the receipt.
      setVerifyError(true); setVerifyReason('unknown');
    } finally { busy.current = false; setSubmitting(false); }
  };

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1800);
  };

  const pickFile = (f?: File | null) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type) || f.size <= 0 || f.size > 10 * 1024 * 1024) {
      toast.error(pt('invalid_file')); return;
    }
    setPaymentProof(f); setVerifyError(false);
  };

  const details = paymentMethod ? paymentDetails?.[paymentMethod] : null;
  const instructions = details ? [{ k: pt('name'), v: details.name }, { k: pt(paymentMethod === 'cbe' ? 'account' : 'phone'), v: details.account, copy: true }] : [];

  if (pendingReview) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto px-4 py-16 text-center space-y-5">
      <AlertCircle className="mx-auto h-16 w-16 text-warning" />
      <h1 className="text-3xl font-bold">{pt('pending_review')}</h1>
      <p className="text-warning">{pt(verifyReason === 'attempt_limit' ? 'attempt_limit' : 'pending')}</p>
      <p className="font-mono break-all">{pt('reference')}: {pendingOrderId}</p>
      <Button onClick={() => navigate('/account')}>{pt('orders')}</Button>
    </main></div>;
  }

  if (confirmedRef) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <div className="tech-card p-8 sm:p-10 text-center max-w-md w-full space-y-5">
            <div className="mx-auto h-20 w-20 rounded-full bg-success/15 border border-success/40 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-11 w-11 text-success" />
            </div>
            <h1 className="text-3xl font-black text-foreground">{pt('confirmed')}</h1>
            <p className="text-muted-foreground text-sm">{pt('confirmed')}</p>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{pt('reference')}</p>
              <p className="text-2xl font-mono font-black text-primary break-all">#{confirmedRef}</p>
            </div>
            <Button className="w-full btn-glow" onClick={() => navigate("/account")}>{pt('orders')}</Button>
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
            <p className="font-bold text-foreground">{pt('verifying')}</p>
            <p className="text-sm text-muted-foreground">{pt('stay')}</p>
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
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={!!pendingOrderId} onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={!!pendingOrderId} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={!!pendingOrderId} onClick={() => removeItem(item.id)}>
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

              {!pendingOrderId && <Button className="w-full btn-glow h-12 font-bold" disabled={submitting} onClick={saveOrder}>{pt('save_order')}</Button>}
              {pendingOrderId && <>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-1 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{pt('exact')}</p>
                <p className="text-3xl font-black text-primary">{(savedTotal ?? grandTotal).toLocaleString()} ETB</p>
                <p className="text-[11px] text-muted-foreground">Subtotal {subtotal.toLocaleString()} + Delivery {previewDeliveryFee.toLocaleString()} ETB</p>
                <p className="font-mono text-[10px] break-all text-muted-foreground">#{pendingOrderId}</p>
              </div>
              {/* Payment */}
              <div className="space-y-3">
                {healthy && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex gap-2.5">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-foreground">
                    <span className="font-black text-primary">⚡ {pt('instant')}: </span>{pt('banner')}
                  </p>
                </div>}

                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.paymentMethod')} *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([["cbe", "CBE", "Commercial Bank of Ethiopia", Landmark], ["telebirr", "Telebirr", "Mobile money", Smartphone]] as const).map(([id, name, sub, Icon]) => {
                    const active = paymentMethod === id;
                    return (
                      <Button variant="outline" key={id} type="button" onClick={() => setPaymentMethod(id)}
                        className={`relative h-auto block rounded-lg border p-3 text-left transition-all ${active ? "border-primary bg-primary/10 " : "border-border/50 bg-muted/40 hover:border-primary/40"}`}>
                        {active && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                        <Icon className="h-5 w-5 text-primary mb-1.5" />
                        <p className="font-bold text-sm text-foreground">{name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
                      </Button>
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
                            {copied === row.v ? <><Check className="h-3.5 w-3.5 text-success" />{pt('copied')}</> : <><Copy className="h-3.5 w-3.5" />{pt('copy')}</>}
                          </Button>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                      {pt('exact')}: <span className="font-bold text-primary">{savedTotal?.toLocaleString()} ETB</span>
                    </p>
                  </div>
                )}

                {!paymentDetails && <p className="text-warning">{pt('settings_error')}</p>}
                <Label htmlFor="receipt-id">{pt('transaction')}</Label>
                <Input id="receipt-id" maxLength={64} value={transactionId} disabled={submitting} onChange={e => setTransactionId(e.target.value.replace(/\s/g, ''))} />
                <p className="text-xs text-muted-foreground">{pt('either')}</p>
                <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); if (pendingOrderId) pickFile(e.dataTransfer.files[0]); }}
                  className={`rounded-lg border-2 border-dashed p-4 space-y-3 text-center ${dragging ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <FolderUp className="mx-auto h-8 w-8 text-primary" />
                  <p className="text-sm">{pt('drop')}</p>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                  <Button type="button" variant="outline" disabled={submitting} onClick={() => fileInput.current?.click()}>{pt('choose')}</Button>
                  {preview && <img src={preview} alt={pt('receipt')} className="max-h-40 mx-auto object-contain" />}
                  {paymentProof && <div><p className="text-xs break-all">{paymentProof.name}</p><Button variant="ghost" size="sm" onClick={() => setPaymentProof(null)}>{pt('remove')}</Button></div>}
                </div>
                {verifyError && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive space-y-1">
                  <p className="font-bold">{pt('failed')}</p><p className="text-sm">{pt(verifyReason)}</p>
                </div>}
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <Button className="w-full btn-glow font-bold h-12 mt-2 gap-2" onClick={handleCheckout} disabled={submitting || !paymentMethod || (!paymentProof && !transactionId)}>
                  <ShieldCheck className="h-4 w-4" /> {pt(verifyError ? 'retry' : 'verify')}
                </Button>
              </div>
              </>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
