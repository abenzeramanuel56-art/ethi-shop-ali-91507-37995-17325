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
import { Trash2, ShoppingBag } from "lucide-react";

interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  price_etb: number;
  quantity: number;
  image_url?: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cbe" | "telebirr" | "">("");

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
    // For now, cart is stored in localStorage
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
    toast.success("Item removed from cart");
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

  const handleCheckout = async () => {
    if (!shippingAddress || !city || !phone) {
      toast.error("Please fill in all shipping information");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      let paymentProofUrl = null;

      // Upload payment proof if provided
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProof);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);
        
        paymentProofUrl = publicUrl;
      }

      // Create order
      const storeType = (cartItems as any[]).some((i: any) => i.store_type === "reseller") ? "reseller" : "admin";
      const resellerId = storeType === "reseller" ? (cartItems as any[]).find((i: any) => i.store_type === "reseller")?.reseller_id || null : null;

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
          reseller_id: resellerId
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order insert error:', orderError);
        throw orderError;
      }
      if (!order) {
        const msg = 'Order creation failed: no order returned';
        console.error(msg);
        throw new Error(msg);
      }

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price_etb: item.price_etb,
        reseller_profit_etb: (item as any).reseller_profit_etb ?? null
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items insert error:', itemsError);
        throw itemsError;
      }

      // Clear cart
      localStorage.removeItem("cart");
      toast.success("Order placed successfully!");
      navigate("/account");
    } catch (error: any) {
      console.error('Checkout error:', error);
      // Prefer friendly message but include server error when available
      const serverMsg = error?.message || (error?.error && error.error.message) || JSON.stringify(error);
      toast.error(`Failed to place order: ${serverMsg}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="mb-4 text-xl text-muted-foreground">Your cart is empty</p>
              <Button onClick={() => navigate("/products")}>Browse Products</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Cart Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.product_name}</h3>
                        <p className="text-lg text-primary">{item.price_etb.toLocaleString()} ETB</p>
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
                            className="w-20 text-center"
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
                          {(item.price_etb * item.quantity).toLocaleString()} ETB
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
                  <CardTitle>Checkout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-address">Shipping Address *</Label>
                    <Textarea
                      id="shipping-address"
                      placeholder="Enter your shipping address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Enter your city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method *</Label>
                    <select
                      id="payment-method"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "cbe" | "telebirr" | "")}
                    >
                      <option value="">Select payment method</option>
                      <option value="cbe">CBE (Commercial Bank of Ethiopia)</option>
                      <option value="telebirr">Telebirr</option>
                    </select>
                  </div>

                  {paymentMethod && (
                    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="font-semibold text-foreground">Payment Instructions:</p>
                      {paymentMethod === "telebirr" ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Transfer the total amount to:
                          </p>
                          <p className="text-lg font-bold text-foreground">+251998265025</p>
                          <p className="text-sm text-muted-foreground">via Telebirr</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Transfer the total amount to:
                          </p>
                          <p className="text-lg font-bold text-foreground">1000036292017</p>
                          <p className="text-sm text-muted-foreground">
                            Commercial Bank of Ethiopia (CBE)
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="payment-proof">Payment Proof (Optional)</Label>
                    <Input
                      id="payment-proof"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot of your payment confirmation
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="mb-4 flex justify-between text-xl font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{calculateTotal().toLocaleString()} ETB</span>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleCheckout}>
                      Place Order
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
