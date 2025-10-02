import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
}

const Account = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                          <CardDescription>
                            Placed on {new Date(order.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-primary">
                          {order.total_etb.toLocaleString()} ETB
                        </p>
                        {order.tracking_number && (
                          <p className="text-sm text-muted-foreground">
                            Tracking: {order.tracking_number}
                          </p>
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
