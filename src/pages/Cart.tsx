import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, ShoppingBag, MapPin, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";

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
  const { loading: locationLoading, requestLocation } = useGeolocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadProfile(session.user.id);
    loadCart();
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) {
      setShippingAddress(data.shipping_address || "");
      setCity(data.city || "");
      setPhone(data.phone || "");
    }
  };

  const loadCart = () => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      setCartItems(JSON.parse(saved));
    }
  };

  const updateCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem("cart", JSON.stringify(items));
  };

  const removeItem = (id: string) => {
    const updated = cartItems.filter(item => item.id !== id);
    updateCart(updated);
    toast.success(t('cart.itemRemoved'));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    const updated = cartItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    updateCart(updated);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price_etb * item.quantity), 0);
  };

  const handleGetLocation = async () => {
    try {
      const coords = await requestLocation();
      setCustomerLatitude(coords.latitude);
      setCustomerLongitude(coords.longitude);
      toast.success("Location captured successfully!");
    } catch (err) {
      toast.error("Failed to get your location. Please enable location access.");
    }
  };

  const handleCheckout = async () => {
    if (!shippingAddress || !city || !phone) {
      toast.error(t('cart.fillShipping'));
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

    // Request location if not already captured
    if (!customerLatitude || !customerLongitude) {
      try {
        const coords = await requestLocation();
        setCustomerLatitude(coords.latitude);
        setCustomerLongitude(coords.longitude);
      } catch (err) {
        // Continue without location if user denies
        console.log("Location not captured, continuing without it");
      }
    }

    setSubmitting(true);

    try {
      let paymentProofUrl = null;

      // Upload payment proof if provided
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProof);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
          paymentProofUrl = publicUrl;
        }
      }

      // Determine store type and seller ID
      const hasSellerItems = cartItems.some(i => i.store_type === "seller" || i.store_type === "reseller");
      const storeType = hasSellerItems ? "seller" : "admin";
      const sellerId = hasSellerItems 
        ? cartItems.find(i => i.store_type === "seller" || i.store_type === "reseller")?.seller_id || null 
        : null;

      // Create order with customer location
      const { data: order, error: orderError } = await (supabase as any)
        .from("orders")
        .insert({
          customer_id: user.id,
          shipping_address: shippingAddress,
          city: city,
          phone: phone,
          total_etb: calculateTotal(),
          payment_proof_url: paymentProofUrl,
          payment_method: paymentMethod,
          status: "pending_payment",
          store_type: storeType,
          seller_id: sellerId,
          customer_latitude: customerLatitude,
          customer_longitude: customerLongitude
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order error:', orderError);
        throw new Error(orderError.message || 'Failed to create order');
      }
      
      if (!order) throw new Error("Order creation failed");

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: item.quantity,
        price_etb: item.price_etb,
        reseller_profit_etb: item.reseller_profit_etb ?? 0
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error('Items error:', itemsError);
        throw new Error(itemsError.message || 'Failed to create order items');
      }

      // Clear cart
      localStorage.removeItem("cart");
      toast.success(t('cart.orderSuccess'));
      navigate("/account");
    } catch (error: any) {
      console.error('Checkout error:', error);
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
        <h1 className="mb-6 text-3xl font-bold text-foreground">{t('cart.title')}</h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="mb-4 text-xl text-muted-foreground">{t('cart.empty')}</p>
              <Button onClick={() => navigate("/products")}>{t('cart.browseProducts')}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('cart.items')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="h-20 w-20 rounded-lg object-cover"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.src = '/placeholder.svg';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.product_name}</h3>
                        <p className="text-lg text-primary">{item.price_etb.toLocaleString()} {t('common.etb')}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="font-bold">
                          {(item.price_etb * item.quantity).toLocaleString()} {t('common.etb')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('cart.checkout')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-address">{t('cart.shippingAddress')} *</Label>
                    <Textarea
                      id="shipping-address"
                      placeholder={t('cart.shippingAddress')}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">{t('cart.city')} *</Label>
                    <Input
                      id="city"
                      placeholder={t('cart.city')}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('cart.phone')} *</Label>
                    <Input
                      id="phone"
                      placeholder={t('cart.phone')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Delivery Location */}
                  <div className="space-y-2">
                    <Label>Delivery Location</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLocation}
                      disabled={locationLoading}
                      className="w-full"
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          {customerLatitude ? "Location Captured ✓" : "Share My Location"}
                        </>
                      )}
                    </Button>
                    {customerLatitude && customerLongitude && (
                      <p className="text-xs text-muted-foreground text-center">
                        📍 {customerLatitude.toFixed(4)}, {customerLongitude.toFixed(4)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Share your location for accurate delivery
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">{t('cart.paymentMethod')} *</Label>
                    <select
                      id="payment-method"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "cbe" | "telebirr" | "")}
                    >
                      <option value="">{t('cart.selectPayment')}</option>
                      <option value="cbe">{t('cart.cbe')}</option>
                      <option value="telebirr">{t('cart.telebirr')}</option>
                    </select>
                  </div>

                  {paymentMethod && (
                    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="font-semibold text-foreground">{t('cart.paymentInstructions')}</p>
                      {paymentMethod === "telebirr" ? (
                        <>
                          <p className="text-sm text-muted-foreground">{t('cart.transferAmount')}</p>
                          <p className="text-lg font-bold text-foreground">+251998265025</p>
                          <p className="text-sm text-muted-foreground">{t('cart.via')} Telebirr</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">{t('cart.transferAmount')}</p>
                          <p className="text-lg font-bold text-foreground">1000036292017</p>
                          <p className="text-sm text-muted-foreground">Commercial Bank of Ethiopia (CBE)</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="payment-proof">{t('cart.paymentProof')}</Label>
                    <Input
                      id="payment-proof"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">{t('cart.uploadScreenshot')}</p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="mb-4 flex justify-between text-xl font-bold">
                      <span>{t('cart.total')}</span>
                      <span className="text-primary">{calculateTotal().toLocaleString()} {t('common.etb')}</span>
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={handleCheckout}
                      disabled={submitting}
                    >
                      {submitting ? t('common.loading') : t('cart.placeOrder')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
