import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface QuoteRequest {
  id: string;
  product_name: string;
  quantity: number;
  status: string;
  quoted_price_etb: number | null;
  created_at: string;
  photo_url: string;
}

interface Order {
  id: string;
  total_etb: number;
  status: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  shipping_address: string;
  city: string;
  phone: string;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  price_etb: number;
}

const Account = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchData();
      }
    });
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [quotesResponse, ordersResponse] = await Promise.all([
        (supabase as any)
          .from("quote_requests")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (quotesResponse.error) throw quotesResponse.error;
      if (ordersResponse.error) throw ordersResponse.error;

      setQuoteRequests(quotesResponse.data || []);
      setOrders(ordersResponse.data || []);

      // Fetch order items for each order
      if (ordersResponse.data && ordersResponse.data.length > 0) {
        const itemsMap: Record<string, OrderItem[]> = {};
        await Promise.all(
          ordersResponse.data.map(async (order: Order) => {
            const { data: items } = await (supabase as any)
              .from("order_items")
              .select("product_name, quantity, price_etb")
              .eq("order_id", order.id);
            itemsMap[order.id] = items || [];
          })
        );
        setOrderItems(itemsMap);
      }
    } catch (error: any) {
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-warning text-warning-foreground",
      quoted: "bg-info text-info-foreground",
      accepted: "bg-success text-success-foreground",
      rejected: "bg-destructive text-destructive-foreground",
      pending_payment: "bg-warning text-warning-foreground",
      payment_verified: "bg-info text-info-foreground",
      ordered_on_aliexpress: "bg-primary text-primary-foreground",
      shipped: "bg-info text-info-foreground",
      delivered: "bg-success text-success-foreground",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <Clock className="h-5 w-5" />;
      case "payment_verified":
      case "ordered_on_aliexpress":
        return <Package className="h-5 w-5" />;
      case "shipped":
        return <Truck className="h-5 w-5" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">My Account</h1>

        <Tabs defaultValue="quotes" className="w-full">
          <TabsList>
            <TabsTrigger value="quotes">Quote Requests</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : quoteRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">
                  No quote requests yet. Request an item to get started!
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {quoteRequests.map((quote) => (
                  <Card key={quote.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle>{quote.product_name}</CardTitle>
                          <CardDescription>
                            Quantity: {quote.quantity} • Requested on{" "}
                            {new Date(quote.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <img
                          src={quote.photo_url}
                          alt={quote.product_name}
                          className="h-24 w-24 rounded-lg border object-cover"
                        />
                        <div>
                          {quote.quoted_price_etb && (
                            <p className="text-2xl font-bold text-primary">
                              {quote.quoted_price_etb.toLocaleString()} ETB
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : orders.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">
                  No orders yet. Start shopping to place your first order!
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </CardTitle>
                          <CardDescription>
                            Placed on {new Date(order.created_at).toLocaleDateString()}
                            {order.updated_at !== order.created_at && 
                              ` • Updated ${new Date(order.updated_at).toLocaleDateString()}`
                            }
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Order Items */}
                        {orderItems[order.id] && orderItems[order.id].length > 0 && (
                          <div>
                            <h4 className="mb-2 font-semibold">Items:</h4>
                            <div className="space-y-2">
                              {orderItems[order.id].map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {item.product_name} x{item.quantity}
                                  </span>
                                  <span className="font-medium">
                                    {(item.price_etb * item.quantity).toLocaleString()} ETB
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between border-t pt-3">
                          <span className="font-semibold">Total:</span>
                          <span className="text-2xl font-bold text-primary">
                            {order.total_etb.toLocaleString()} ETB
                          </span>
                        </div>

                        {/* Shipping Details */}
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <h4 className="mb-2 font-semibold">Shipping Details:</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{order.shipping_address}</p>
                            <p>{order.city}</p>
                            <p>Phone: {order.phone}</p>
                          </div>
                        </div>

                        {/* Tracking Information */}
                        {order.tracking_number && (
                          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                            <h4 className="mb-2 flex items-center gap-2 font-semibold text-primary">
                              <Truck className="h-4 w-4" />
                              Tracking Information
                            </h4>
                            <div className="font-mono text-lg font-bold">
                              {order.tracking_number}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Track your package using this number
                            </p>
                          </div>
                        )}

                        {/* Status Message */}
                        {!order.tracking_number && order.status === "payment_verified" && (
                          <div className="rounded-lg border bg-info/10 p-4 text-sm">
                            <p className="font-medium">✓ Payment Confirmed</p>
                            <p className="text-muted-foreground">
                              Your order is being prepared. You'll receive a tracking number soon!
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;
