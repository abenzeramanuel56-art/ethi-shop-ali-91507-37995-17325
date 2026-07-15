import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle, Clock, RotateCcw, Briefcase, Key, Phone } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import TelegramLinkCard from "@/components/TelegramLinkCard";


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

interface RefundRequest {
  id: string;
  order_id: string;
  reason: string;
  amount_etb: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
}

interface ServiceOrder {
  id: string;
  service_id: string;
  total_etb: number;
  status: string;
  verification_code: string | null;
  created_at: string;
  hours: number | null;
  quantity: number;
  seller_confirmed: boolean;
  services?: {
    title: string;
    category: string;
  };
  seller_stores?: {
    store_name: string;
    contact_phone: string | null;
  };
}

const REFUND_REASONS = [
  { value: 'wrong_item', labelKey: 'refund.wrongItem' },
  { value: 'damaged', labelKey: 'refund.damaged' },
  { value: 'not_as_described', labelKey: 'refund.notAsDescribed' },
  { value: 'no_longer_need', labelKey: 'refund.noLongerNeed' },
  { value: 'other', labelKey: 'refund.other' },
];

const Account = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundDetails, setRefundDetails] = useState("");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        fetchData();
      }
    });
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [quotesResponse, ordersResponse, refundsResponse, serviceOrdersResponse] = await Promise.all([
        supabase.from("quote_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("refund_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("service_orders").select(`
          *,
          services (
            title,
            category
          )
        `).order("created_at", { ascending: false }),
      ]);

      if (quotesResponse.error) throw quotesResponse.error;
      if (ordersResponse.error) throw ordersResponse.error;

      setQuoteRequests(quotesResponse.data || []);
      setOrders(ordersResponse.data || []);
      setRefundRequests(refundsResponse.data || []);
      
      // Fetch seller stores for service orders
      if (serviceOrdersResponse.data) {
        const ordersWithStores = await Promise.all(
          serviceOrdersResponse.data.map(async (order) => {
            const { data: store } = await supabase
              .from("seller_stores")
              .select("store_name, contact_phone")
              .eq("id", order.seller_id)
              .single();
            return { ...order, seller_stores: store };
          })
        );
        setServiceOrders(ordersWithStores as ServiceOrder[]);
      }

      if (ordersResponse.data && ordersResponse.data.length > 0) {
        const itemsMap: Record<string, OrderItem[]> = {};
        await Promise.all(
          ordersResponse.data.map(async (order: Order) => {
            const { data: items } = await supabase
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

  const handleRefundRequest = async () => {
    if (!selectedOrderForRefund || !refundReason) {
      toast.error("Please select a reason for the refund");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("refund_requests").insert({
      order_id: selectedOrderForRefund.id,
      customer_id: user.id,
      reason: `${refundReason}: ${refundDetails}`,
      amount_etb: selectedOrderForRefund.total_etb,
      status: "pending"
    });

    if (error) {
      toast.error("Failed to submit refund request");
      return;
    }

    toast.success("Refund request submitted successfully");
    setRefundDialogOpen(false);
    setRefundReason("");
    setRefundDetails("");
    setSelectedOrderForRefund(null);
    fetchData();
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      const { error } = await (supabase as any).rpc("customer_confirm_delivery", {
        p_order_id: orderId,
      });

      if (error) throw error;

      toast.success("Delivery confirmed! Thank you for your order.");
      fetchData();
    } catch (error: any) {
      console.error("Confirm delivery error:", error);
      
      const msg = error?.message || "";
      if (msg.includes("delivery_not_ready_for_confirmation")) {
        toast.error("Delivery is not ready for confirmation yet.");
      } else if (msg.includes("order_not_found")) {
        toast.error("Order not found or you don't have permission.");
      } else {
        toast.error("Failed to confirm delivery");
      }
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
      shipped: "bg-purple-500 text-white",
      delivered: "bg-success text-success-foreground",
      approved: "bg-success text-success-foreground",
      processed: "bg-success text-success-foreground",
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
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold text-foreground">{t('account.title')}</h1>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">{t('account.yourIds')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('account.uid')}</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                    {userId.slice(0, 8)}...{userId.slice(-8)}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(userId)}>
                    {t('account.copy')}
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('account.id')}</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                    {userId.slice(0, 6)}...{userId.slice(-6)}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(userId)}>
                    {t('account.copy')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 max-w-md">
            <TelegramLinkCard />
          </div>
        </div>



        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">{t('account.orders')}</TabsTrigger>
            <TabsTrigger value="services">Service Orders</TabsTrigger>
            <TabsTrigger value="quotes">{t('account.quoteRequests')}</TabsTrigger>
            <TabsTrigger value="refunds">{t('account.refunds')}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">{t('common.loading')}</div>
            ) : orders.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">{t('account.noOrders')}</p>
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
                            {t('account.order')} #{order.id.slice(0, 8).toUpperCase()}
                          </CardTitle>
                          <CardDescription>
                            {t('account.placedOn')} {new Date(order.created_at).toLocaleDateString()}
                            {order.updated_at !== order.created_at && 
                              ` • ${t('account.updated')} ${new Date(order.updated_at).toLocaleDateString()}`
                            }
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ")}
                          </Badge>
                          {(order.status === "shipped" || order.status === "awaiting_customer_confirmation") && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleConfirmDelivery(order.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirm Received
                            </Button>
                          )}
                          {order.status === "delivered" && (
                            <Dialog open={refundDialogOpen && selectedOrderForRefund?.id === order.id} onOpenChange={(open) => {
                              setRefundDialogOpen(open);
                              if (!open) setSelectedOrderForRefund(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedOrderForRefund(order)}>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  {t('account.requestRefund')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('account.requestRefund')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>{t('account.refundReason')}</Label>
                                    <Select value={refundReason} onValueChange={setRefundReason}>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('support.selectCategory')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {REFUND_REASONS.map((reason) => (
                                          <SelectItem key={reason.value} value={reason.value}>
                                            {t(reason.labelKey)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>{t('support.message')}</Label>
                                    <Textarea
                                      value={refundDetails}
                                      onChange={(e) => setRefundDetails(e.target.value)}
                                      placeholder={t('support.messagePlaceholder')}
                                      rows={4}
                                    />
                                  </div>
                                  <Button onClick={handleRefundRequest} className="w-full">
                                    {t('account.submitRefund')}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {orderItems[order.id] && orderItems[order.id].length > 0 && (
                          <div>
                            <h4 className="mb-2 font-semibold">{t('account.items')}:</h4>
                            <div className="space-y-2">
                              {orderItems[order.id].map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {item.product_name} x{item.quantity}
                                  </span>
                                  <span className="font-medium">
                                    {(item.price_etb * item.quantity).toLocaleString()} {t('common.etb')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between border-t pt-3">
                          <span className="font-semibold">{t('account.total')}:</span>
                          <span className="text-2xl font-bold text-primary">
                            {order.total_etb.toLocaleString()} {t('common.etb')}
                          </span>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-4">
                          <h4 className="mb-2 font-semibold">{t('account.shippingDetails')}:</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{order.shipping_address}</p>
                            <p>{order.city}</p>
                            <p>{t('cart.phone')}: {order.phone}</p>
                          </div>
                        </div>

                        {order.tracking_number && (
                          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                            <h4 className="mb-2 flex items-center gap-2 font-semibold text-primary">
                              <Truck className="h-4 w-4" />
                              {t('account.trackingInfo')}
                            </h4>
                            <div className="font-mono text-lg font-bold">
                              {order.tracking_number}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {t('account.trackPackage')}
                            </p>
                          </div>
                        )}

                        {!order.tracking_number && order.status === "payment_verified" && (
                          <div className="rounded-lg border bg-info/10 p-4 text-sm">
                            <p className="font-medium">✓ {t('account.paymentConfirmed')}</p>
                            <p className="text-muted-foreground">{t('account.orderPreparing')}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">{t('common.loading')}</div>
            ) : quoteRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">{t('account.noQuotes')}</p>
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
                            {t('account.quantity')}: {quote.quantity} • {t('account.requestedOn')}{" "}
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
                              {quote.quoted_price_etb.toLocaleString()} {t('common.etb')}
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

          <TabsContent value="services" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">{t('common.loading')}</div>
            ) : serviceOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">No service orders yet</p>
                <Button className="mt-4" onClick={() => navigate("/services")}>
                  Browse Services
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {serviceOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            {order.services?.title || "Service Order"}
                          </CardTitle>
                          <CardDescription>
                            Ordered on {new Date(order.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between border-b pb-3">
                          <span className="font-semibold">Total:</span>
                          <span className="text-2xl font-bold text-primary">
                            {order.total_etb.toLocaleString()} ETB
                          </span>
                        </div>

                        {order.hours && (
                          <p className="text-sm text-muted-foreground">
                            Hours booked: {order.hours}
                          </p>
                        )}

                        {/* Show verification code for in_progress orders */}
                        {(order.status === "in_progress" || order.status === "payment_verified") && order.verification_code && (
                          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Key className="h-5 w-5 text-primary" />
                              <h4 className="font-semibold text-primary">Your Verification Code</h4>
                            </div>
                            <div className="font-mono text-2xl font-bold tracking-widest text-center bg-background rounded p-3 border">
                              {order.verification_code}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              ⚠️ Only share this code with the service provider AFTER they complete the service. This releases your payment to them.
                            </p>
                          </div>
                        )}

                        {/* Show seller contact for confirmed orders */}
                        {order.seller_confirmed && order.seller_stores?.contact_phone && (
                          <div className="rounded-lg bg-success/10 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Phone className="h-5 w-5 text-success" />
                              <h4 className="font-semibold text-success">Service Provider Contact</h4>
                            </div>
                            <p className="font-medium">{order.seller_stores.store_name}</p>
                            <a 
                              href={`tel:${order.seller_stores.contact_phone}`}
                              className="text-primary hover:underline"
                            >
                              {order.seller_stores.contact_phone}
                            </a>
                          </div>
                        )}

                        {order.status === "pending_payment" && (
                          <div className="rounded-lg border bg-warning/10 p-4 text-sm">
                            <p className="font-medium">⏳ Waiting for payment verification</p>
                            <p className="text-muted-foreground">
                              Please upload your payment proof and wait for admin verification.
                            </p>
                          </div>
                        )}

                        {order.status === "payment_submitted" && (
                          <div className="rounded-lg border bg-info/10 p-4 text-sm">
                            <p className="font-medium">📤 Payment submitted</p>
                            <p className="text-muted-foreground">
                              Your payment is being verified. You'll be notified once approved.
                            </p>
                          </div>
                        )}

                        {order.status === "completed" && (
                          <div className="rounded-lg bg-success/10 p-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-success" />
                            <span className="font-medium text-success">Service Completed</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="refunds" className="mt-6">
            {loading ? (
              <div className="text-center text-muted-foreground">{t('common.loading')}</div>
            ) : refundRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-lg text-muted-foreground">{t('account.noRefunds')}</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {refundRequests.map((refund) => (
                  <Card key={refund.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{t('account.order')} #{refund.order_id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">{refund.reason}</p>
                          <p className="text-lg font-bold text-primary mt-2">
                            {refund.amount_etb.toLocaleString()} {t('common.etb')}
                          </p>
                          {refund.admin_notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {refund.admin_notes}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(refund.status)}>
                          {t(`refund.status.${refund.status}`)}
                        </Badge>
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