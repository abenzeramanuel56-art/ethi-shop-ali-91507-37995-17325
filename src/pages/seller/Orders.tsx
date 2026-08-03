import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Phone } from "lucide-react";
import { SignedImage, openSignedUrl } from "@/components/SignedImage";

interface Order {
  id: string;
  created_at: string;
  customer_id: string;
  total_etb: number;
  status: string;
  shipping_address: string;
  city: string;
  phone: string;
  payment_proof_url: string;
  tracking_number: string;
  profiles?: {
    full_name: string;
    phone: string;
  } | null;
  driver_orders?: Array<{
    status: string;
    driver_earning_etb: number | null;
    distance_km: number | null;
    seller_confirmed_pickup: boolean;
    customer_confirmed_delivery: boolean;
    current_driver_latitude: number | null;
    current_driver_longitude: number | null;
    last_location_update_at: string | null;
  }>;
}

export default function SellerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: store } = await (supabase as any)
      .from("seller_stores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!store) {
      navigate("/seller/setup");
      return;
    }

    const { data } = await supabase
      .from("orders")
      .select("*, driver_orders(status, driver_earning_etb, distance_km, seller_confirmed_pickup, customer_confirmed_delivery, current_driver_latitude, current_driver_longitude, last_location_update_at)")
      .eq("seller_id", store.id)
      .order("created_at", { ascending: false });

    // Fetch profiles separately
    const ordersWithProfiles = await Promise.all(
      (data || []).map(async (order: any) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", order.customer_id)
          .single();

        return { ...order, profiles: profileData };
      })
    );

    setOrders(ordersWithProfiles as any);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment": return "bg-warning text-warning-foreground";
      case "payment_verified": return "bg-info text-info-foreground";
      case "shipped": return "bg-primary text-primary-foreground";
      case "delivered": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Package className="h-8 w-8" />
          My Orders ({orders.length})
        </h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order #{order.id.slice(0, 8)}</span>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{order.profiles?.full_name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{order.total_etb} ETB</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping Address</p>
                      <p className="font-medium">{order.shipping_address}, {order.city}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.phone}</p>
                        <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.phone}`)}>
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {order.payment_proof_url && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Proof</p>
                        <SignedImage
                          url={order.payment_proof_url}
                          alt="Payment proof"
                          className="mt-1 max-h-40 rounded border cursor-pointer object-contain"
                          onClick={() => openSignedUrl(order.payment_proof_url)}
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {order.driver_orders && order.driver_orders.length > 0 && (
                    <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-2">
                      <p className="font-semibold flex items-center gap-2">🚚 Live Delivery Tracking</p>
                      {order.driver_orders.map((d, i) => (
                        <div key={i} className="text-sm space-y-1">
                          <p>Status: <Badge className={getStatusColor(d.status)}>{d.status.replace(/_/g, " ").toUpperCase()}</Badge></p>
                          {d.distance_km != null && <p>Distance: <strong>{d.distance_km} km</strong></p>}
                          <p>Seller pickup confirmed: <strong>{d.seller_confirmed_pickup ? "✅ Yes" : "⏳ Waiting"}</strong></p>
                          <p>Customer received: <strong>{d.customer_confirmed_delivery ? "✅ Yes" : "⏳ In transit"}</strong></p>
                          {d.current_driver_latitude != null && d.current_driver_longitude != null && (
                            <p className="text-muted-foreground">
                              Driver at: {d.current_driver_latitude.toFixed(5)}, {d.current_driver_longitude.toFixed(5)}
                              {d.last_location_update_at && ` · updated ${new Date(d.last_location_update_at).toLocaleTimeString()}`}
                            </p>
                          )}
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground italic">View only — only the driver and admin can change delivery status.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
