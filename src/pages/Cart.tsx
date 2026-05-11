import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, ShoppingBag, MapPin, Loader2, Navigation, CheckCircle2, AlertCircle, Bike, Car, Truck as TruckIcon } from "lucide-react";
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

  const handleGetLocation = async () => {
    setLocationError(null);
    try {
      const coords = await requestLocation();
      setCustomerLatitude(coords.latitude);
      setCustomerLongitude(coords.longitude);
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      if (addr) {
        setDetectedAddress(addr);
        if (!shippingAddress) setShippingAddress(addr);
      }
      toast.success("📍 Location captured!");
    } catch (err: any) {
      setLocationError(err?.message || "Failed to get location. You can still order with manual address.");
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

    // GPS is OPTIONAL — never block ordering. We try silently if missing.
    let lat = customerLatitude;
    let lng = customerLongitude;
    if (!lat || !lng) {
      try {
        const coords = await requestLocation();
        lat = coords.latitude;
        lng = coords.longitude;
        setCustomerLatitude(lat);
        setCustomerLongitude(lng);
        // Best-effort reverse geocode in background
        reverseGeocode(coords.latitude, coords.longitude).then((addr) => { if (addr) setDetectedAddress(addr); });
      } catch (err) {
        // Continue without GPS — driver will use the typed address
      }
    }

    setSubmitting(true);

    try {
      let paymentProofUrl = null;
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, paymentProof);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
          paymentProofUrl = publicUrl;
        }
      }

      const hasSellerItems = cartItems.some(i => i.store_type === "seller" || i.store_type === "reseller");
      const storeType = hasSellerItems ? "seller" : "admin";
      const sellerId = hasSellerItems ? cartItems.find(i => i.store_type === "seller" || i.store_type === "reseller")?.seller_id || null : null;

      const subtotalNow = productSubtotal(cartItems);
      const feeNow = deliveryFee(0); // recalculated on driver acceptance using real distance

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

      localStorage.removeItem("cart");
      toast.success(t('cart.orderSuccess'));
      navigate("/account");
    } catch (error: any) {
      toast.error(error.message || t('cart.orderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

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

              {/* Payment Method */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.paymentMethod')} *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-border/50 bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="">{t('cart.selectPayment')}</option>
                  <option value="telebirr">TeleBirr</option>
                  <option value="cbe">CBE (Commercial Bank of Ethiopia)</option>
                </select>
              </div>

              {paymentMethod && (
                <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: 'hsl(var(--primary) / 0.2)', background: 'hsl(var(--primary) / 0.05)' }}>
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">Payment Instructions</p>
                  {paymentMethod === "telebirr" ? (
                    <><p className="text-xs text-muted-foreground">Send to TeleBirr:</p><p className="text-base font-black text-foreground">+251998265025</p></>
                  ) : (
                    <><p className="text-xs text-muted-foreground">CBE Account:</p><p className="text-base font-black text-foreground">1000036292017</p></>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('cart.paymentProof')}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  className="bg-muted/50 border-border/50 text-sm"
                />
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString()} ETB</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery (min, recalculated by driver)</span><span>{previewDeliveryFee.toLocaleString()} ETB</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-border/30">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-2xl font-black text-primary">{grandTotal.toLocaleString()} ETB</span>
                </div>
                <Button className="w-full btn-glow font-bold h-11 mt-2" onClick={handleCheckout} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Order...</> : t('cart.placeOrder')}
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
