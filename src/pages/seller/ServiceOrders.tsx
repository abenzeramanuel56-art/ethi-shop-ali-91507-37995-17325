import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Phone, User, Calendar, DollarSign, MapPin, CheckCircle, Clock, Key } from "lucide-react";

interface ServiceOrder {
  id: string;
  service_id: string;
  customer_id: string;
  seller_id: string;
  quantity: number;
  hours: number | null;
  total_etb: number;
  status: string;
  payment_proof_url: string | null;
  payment_method: string | null;
  verification_code: string | null;
  customer_phone: string;
  customer_name: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  notes: string | null;
  seller_confirmed: boolean;
  created_at: string;
  services?: {
    title: string;
    category: string;
    price_type: string;
  };
  profiles?: {
    full_name: string;
  } | null;
}

export default function SellerServiceOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [verificationCodes, setVerificationCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    checkSellerAccess();
  }, []);

  const checkSellerAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: store } = await supabase
      .from("seller_stores")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!store) {
      toast({
        title: "No Store",
        description: "Please create your store first",
        variant: "destructive"
      });
      navigate("/seller/setup");
      return;
    }

    setStoreId(store.id);
    fetchOrders(store.id);
  };

  const fetchOrders = async (sellerId: string) => {
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        services (
          title,
          category,
          price_type
        )
      `)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
      return;
    }

    // Fetch customer profiles separately
    const ordersWithProfiles = await Promise.all(
      (data || []).map(async (order) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.customer_id)
          .single();
        
        return { ...order, profiles: profile };
      })
    );

    setOrders(ordersWithProfiles as ServiceOrder[]);
    setLoading(false);
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const { error } = await (supabase as any).rpc("seller_confirm_service_order", {
        p_order_id: orderId
      });

      if (error) throw error;

      toast({
        title: "Order Confirmed",
        description: "You have confirmed this service order. Please contact the customer.",
      });

      if (storeId) fetchOrders(storeId);
    } catch (error: any) {
      console.error("Confirm error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm order",
        variant: "destructive"
      });
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    const code = verificationCodes[orderId];
    if (!code) {
      toast({
        title: "Enter Code",
        description: "Please enter the verification code from the customer",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await (supabase as any).rpc("complete_service_order", {
        p_order_id: orderId,
        p_verification_code: code
      });

      if (error) throw error;

      toast({
        title: "Service Completed! 💰",
        description: "Payment has been released to your wallet (minus 10% platform fee).",
      });

      setVerificationCodes(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });

      if (storeId) fetchOrders(storeId);
    } catch (error: any) {
      console.error("Complete error:", error);
      if (error.message?.includes("invalid_verification_code")) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please check with the customer.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to complete order",
          variant: "destructive"
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment": return "bg-warning text-warning-foreground";
      case "payment_submitted": return "bg-info text-info-foreground";
      case "payment_verified":
      case "in_progress": return "bg-primary text-primary-foreground";
      case "completed": return "bg-success text-success-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          My Service Orders
        </h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No service orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {order.services?.title || "Unknown Service"}
                    </span>
                    <div className="flex items-center gap-2">
                      {order.seller_confirmed && (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="text-sm font-medium">
                          {order.customer_name || order.profiles?.full_name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <a href={`tel:${order.customer_phone}`} className="text-sm font-medium text-primary hover:underline">
                          {order.customer_phone}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total (You'll receive 90%)</p>
                        <p className="text-sm font-medium">{order.total_etb} ETB → {(order.total_etb * 0.9).toFixed(2)} ETB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Order Date</p>
                        <p className="text-sm font-medium">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {order.hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Hours</p>
                          <p className="text-sm font-medium">{order.hours} hours</p>
                        </div>
                      </div>
                    )}
                    {order.customer_latitude && order.customer_longitude && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-primary"
                            onClick={() => openInMaps(order.customer_latitude!, order.customer_longitude!)}
                          >
                            Open in Maps →
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mb-4 p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  )}

                  {/* Actions based on status */}
                  {order.status === "in_progress" && !order.seller_confirmed && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleConfirmOrder(order.id)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm & Accept Order
                      </Button>
                    </div>
                  )}

                  {order.status === "in_progress" && order.seller_confirmed && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-medium mb-2 flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Enter Verification Code to Complete
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Ask the customer for their verification code after you've completed the service.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter 6-digit code"
                            value={verificationCodes[order.id] || ""}
                            onChange={(e) => setVerificationCodes(prev => ({
                              ...prev,
                              [order.id]: e.target.value.toUpperCase()
                            }))}
                            className="max-w-[200px] font-mono uppercase"
                            maxLength={6}
                          />
                          <Button onClick={() => handleCompleteOrder(order.id)}>
                            Complete & Get Paid
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {order.status === "completed" && (
                    <div className="p-3 bg-success/10 rounded-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium text-success">Service Completed - Payment Released</span>
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