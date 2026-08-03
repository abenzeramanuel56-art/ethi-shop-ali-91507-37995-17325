import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Phone, User, Calendar, DollarSign, CheckCircle, XCircle } from "lucide-react";

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
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  services?: {
    title: string;
    category: string;
  };
  profiles?: {
    full_name: string;
  } | null;
  seller_stores?: {
    store_name: string;
  };
}

export default function AdminServiceOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    checkAdmin();
    fetchOrders();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      navigate("/");
      return;
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        services (
          title,
          category
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
      return;
    }

    // Fetch customer profiles and seller stores separately
    const ordersWithDetails = await Promise.all(
      (data || []).map(async (order) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.customer_id)
          .single();
        
        const { data: store } = await supabase
          .from("seller_stores")
          .select("store_name")
          .eq("id", order.seller_id)
          .single();
        
        return { ...order, profiles: profile, seller_stores: store };
      })
    );

    setOrders(ordersWithDetails as ServiceOrder[]);
    setLoading(false);
  };

  const handleVerifyPayment = async (orderId: string) => {
    const { error } = await supabase
      .from("service_orders")
      .update({
        status: "payment_verified",
        admin_notes: adminNotes || null,
      })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to verify payment",
        variant: "destructive",
      });
      return;
    }

    const order = orders.find(o => o.id === orderId);
    if (order?.customer_id) {
      supabase.functions.invoke("send-user-email", {
        body: {
          userId: order.customer_id,
          subject: "Payment Verified — Service in Progress",
          heading: "Payment Confirmed ✓",
          message: "Your payment has been verified by our team and the service provider has been notified. Check your dashboard for your verification code — share it ONLY after the service is fully completed.",
        },
      }).catch(e => console.error("email error", e));
    }

    toast({
      title: "Payment Verified",
      description: "Service order is now in progress. Verification code has been generated.",
    });

    setSelectedOrder(null);
    setAdminNotes("");
    fetchOrders();
  };

  const handleRejectPayment = async (orderId: string) => {
    const { error } = await supabase
      .from("service_orders")
      .update({
        status: "cancelled",
        admin_notes: adminNotes || "Payment rejected",
      })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject payment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payment Rejected",
      description: "Order has been cancelled",
    });

    setSelectedOrder(null);
    setAdminNotes("");
    fetchOrders();
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
          Service Orders
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
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="text-sm font-medium">{order.profiles?.full_name || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{order.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-medium">{order.total_etb} ETB</p>
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
                    <div>
                      <p className="text-xs text-muted-foreground">Provider</p>
                      <p className="text-sm font-medium">{order.seller_stores?.store_name || "Unknown"}</p>
                    </div>
                    {order.hours && (
                      <div>
                        <p className="text-xs text-muted-foreground">Hours</p>
                        <p className="text-sm font-medium">{order.hours} hours</p>
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mb-4 p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  )}

                  {order.payment_proof_url && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Payment Proof</p>
                      <SignedImage
                        url={order.payment_proof_url}
                        alt="Payment proof"
                        className="max-h-48 rounded border cursor-pointer object-contain"
                        onClick={() => openSignedUrl(order.payment_proof_url)}
                      />
                    </div>
                  )}

                  {order.verification_code && order.status === "in_progress" && (
                    <div className="mb-4 p-3 bg-primary/10 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Verification Code (Customer Only)</p>
                      <p className="text-lg font-mono font-bold">{order.verification_code}</p>
                    </div>
                  )}

                  {order.status === "payment_submitted" && (
                    <>
                      {selectedOrder === order.id ? (
                        <div className="space-y-4">
                          <div>
                            <Label>Admin Notes</Label>
                            <Textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Add notes (optional)"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleVerifyPayment(order.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify Payment
                            </Button>
                            <Button
                              onClick={() => handleRejectPayment(order.id)}
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Payment
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedOrder(null);
                                setAdminNotes("");
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button onClick={() => setSelectedOrder(order.id)}>
                          Review Payment
                        </Button>
                      )}
                    </>
                  )}

                  {order.admin_notes && (
                    <div className="mt-4 p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                      <p className="text-sm">{order.admin_notes}</p>
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