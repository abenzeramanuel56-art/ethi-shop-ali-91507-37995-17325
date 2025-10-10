import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

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
  profiles: {
    full_name: string;
  };
}

export default function ResellerOrders() {
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

    const { data: store } = await supabase
      .from("reseller_stores")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!store) {
      navigate("/reseller/setup");
      return;
    }

    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        profiles (full_name)
      `)
      .eq("reseller_id", store.id)
      .order("created_at", { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment": return "default";
      case "confirmed": return "secondary";
      case "shipped": return "default";
      case "delivered": return "default";
      default: return "secondary";
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
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{order.profiles?.full_name}</p>
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
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{order.phone}</p>
                    </div>
                    {order.payment_proof_url && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Proof</p>
                        <a
                          href={order.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          View Proof
                        </a>
                      </div>
                    )}
                    {order.tracking_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking Number</p>
                        <p className="font-medium">{order.tracking_number}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}