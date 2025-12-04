import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Package, ShoppingCart, Users, Plus } from "lucide-react";
import AdminResellers from "./Resellers";
import AdminWithdrawals from "./Withdrawals";
import AdminMessaging from "./Messaging";
import AdminReports from "./Reports";
import AdminPunishments from "./Punishments";
import { ImageUpdater } from "./ImageUpdater";

interface Stats {
  pendingQuotes: number;
  pendingPayments: number;
  activeOrders: number;
  totalRevenue: number;
}

interface QuoteRequest {
  id: string;
  product_name: string;
  aliexpress_url: string;
  quantity: number;
  photo_url: string;
  notes: string | null;
  status: string;
  quoted_price_etb: number | null;
  created_at: string;
  customer_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_etb: number;
  cost_usd: number | null;
  image_url: string | null;
  category: string;
  stock_status: boolean;
  aliexpress_url: string | null;
}

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price_etb: number;
  product?: {
    aliexpress_url: string | null;
  };
}

interface Order {
  id: string;
  customer_id: string;
  shipping_address: string;
  city: string;
  phone: string;
  total_etb: number;
  payment_method: string | null;
  payment_proof_url: string | null;
  status: string;
  tracking_number: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reseller_id: string | null;
  order_items?: OrderItem[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    pendingQuotes: 0,
    pendingPayments: 0,
    activeOrders: 0,
    totalRevenue: 0,
  });
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price_etb: "",
    cost_usd: "",
    category: "other",
    stock_status: true,
    aliexpress_url: "",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [orderUpdates, setOrderUpdates] = useState<{
    status: string;
    tracking_number: string;
    admin_notes: string;
  }>({ status: "", tracking_number: "", admin_notes: "" });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [quotesResponse, ordersResponse, productsResponse] = await Promise.all([
        (supabase as any)
          .from("quote_requests")
          .select("*")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("orders")
          .select(`
            *,
            order_items (
              id,
              product_id,
              product_name,
              quantity,
              price_etb,
              products:product_id (aliexpress_url)
            )
          `),
        (supabase as any)
          .from("products")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (quotesResponse.error) throw quotesResponse.error;
      if (ordersResponse.error) throw ordersResponse.error;
      if (productsResponse.error) throw productsResponse.error;

      const quotes = quotesResponse.data || [];
      const ordersList = (ordersResponse.data || []).map((order: any) => ({
        ...order,
        order_items: (order.order_items || []).map((item: any) => ({
          ...item,
          product: item.products,
        })),
      }));
      const productsList = productsResponse.data || [];

      setQuoteRequests(quotes);
      setProducts(productsList);
      setOrders(ordersList.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));

      setStats({
        pendingQuotes: quotes.filter((q: any) => q.status === "pending").length,
        pendingPayments: ordersList.filter((o: any) => o.status === "pending_payment").length,
        activeOrders: ordersList.filter((o: any) => 
          !["delivered", "cancelled"].includes(o.status)
        ).length,
        totalRevenue: ordersList
          .filter((o: any) => o.status === "delivered")
          .reduce((sum: number, o: any) => sum + parseFloat(String(o.total_etb)), 0),
      });
    } catch (error: any) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async () => {
    if (!selectedQuote || !quotedPrice) {
      toast.error("Please enter a price");
      return;
    }

    try {
      // Update quote request status
      const { error: quoteError } = await (supabase as any)
        .from("quote_requests")
        .update({
          status: "quoted",
          quoted_price_etb: parseFloat(quotedPrice),
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedQuote.id);

      if (quoteError) throw quoteError;

      // Automatically add quoted item as a product
      const { error: productError } = await (supabase as any)
        .from("products")
        .insert([{
          name: selectedQuote.product_name,
          description: `Customer requested item - ${selectedQuote.notes || ""}`,
          price_etb: parseFloat(quotedPrice),
          image_url: selectedQuote.photo_url,
          category: "other",
          stock_status: true,
        }]);

      if (productError) {
        console.error("Failed to auto-add product:", productError);
        // Don't throw - quote was still sent successfully
      }

      toast.success("Quote sent and product added successfully!");
      setSelectedQuote(null);
      setQuotedPrice("");
      setAdminNotes("");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to send quote");
    }
  };

  const handleUpdateOrder = async (orderId: string) => {
    if (!orderUpdates.status) {
      toast.error("Please select a status");
      return;
    }

    try {
      const currentOrder = orders.find(o => o.id === orderId);
      const isPaymentJustVerified = orderUpdates.status === "payment_verified" && 
                                   currentOrder?.status !== "payment_verified";
      const isTrackingAdded = orderUpdates.tracking_number && 
                             currentOrder?.tracking_number !== orderUpdates.tracking_number;

      const { error } = await (supabase as any)
        .from("orders")
        .update({
          status: orderUpdates.status,
          tracking_number: orderUpdates.tracking_number || null,
          admin_notes: orderUpdates.admin_notes || null,
        })
        .eq("id", orderId);

      if (error) throw error;

      // Send confirmation email if payment was just verified
      if (isPaymentJustVerified) {
        try {
          await supabase.functions.invoke("send-order-confirmation", {
            body: { orderId },
          });
          console.log("Confirmation email sent successfully");
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }
      }

      // Send tracking notification if tracking number was added/updated
      if (isTrackingAdded) {
        try {
          await supabase.functions.invoke("send-tracking-notification", {
            body: { orderId, trackingNumber: orderUpdates.tracking_number },
          });
          console.log("Tracking notification sent successfully");
        } catch (emailError) {
          console.error("Failed to send tracking notification:", emailError);
        }
      }

      toast.success("Order updated successfully!");
      setEditingOrder(null);
      setOrderUpdates({ status: "", tracking_number: "", admin_notes: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update order");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_payment: "bg-warning text-warning-foreground",
      payment_verified: "bg-info text-info-foreground",
      ordered_on_aliexpress: "bg-primary text-primary-foreground",
      shipped: "bg-info text-info-foreground",
      delivered: "bg-success text-success-foreground",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price_etb) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      let imageUrl = null;

      // Upload image if provided
      if (productImage) {
        const fileExt = productImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, productImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await (supabase as any)
        .from("products")
        .insert([{
          name: newProduct.name,
          description: newProduct.description || null,
          price_etb: parseFloat(newProduct.price_etb),
          cost_usd: newProduct.cost_usd ? parseFloat(newProduct.cost_usd) : null,
          category: newProduct.category as any,
          stock_status: newProduct.stock_status,
          image_url: imageUrl,
          aliexpress_url: newProduct.aliexpress_url || null,
        }]);

      if (error) throw error;

      toast.success("Product added successfully!");
      setShowProductForm(false);
      setNewProduct({
        name: "",
        description: "",
        price_etb: "",
        cost_usd: "",
        category: "other",
        stock_status: true,
        aliexpress_url: "",
      });
      setProductImage(null);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to add product");
      console.error(error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalRevenue.toLocaleString()} ETB
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quotes">Quote Requests</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="reseller_orders">Reseller Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="resellers">Resellers</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="punishments">Punishments</TabsTrigger>
        </TabsList>

          <TabsContent value="reseller_orders">
            <Card>
              <CardHeader>
                <CardTitle>Reseller Orders</CardTitle>
                <CardDescription>Verify payments and credit reseller wallets</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.filter((o) => o.reseller_id).length === 0 ? (
                  <p className="text-muted-foreground">No reseller orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {orders.filter((o) => o.reseller_id).map((order) => (
                      <Card key={order.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                              <div className="text-sm text-muted-foreground">Status: {order.status}</div>
                              {order.payment_proof_url && (
                                <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                  View Payment Proof
                                </a>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(order.payment_proof_url || '#', '_blank')}
                                disabled={!order.payment_proof_url}
                              >
                                Payment Proof
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setOrderUpdates({ status: 'payment_verified', tracking_number: '', admin_notes: '' });
                                  handleUpdateOrder(order.id);
                                }}
                                disabled={order.status === 'payment_verified'}
                              >
                                Verify Payment & Credit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Quote Requests</CardTitle>
                <CardDescription>Manage customer quote requests</CardDescription>
              </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : quoteRequests.length === 0 ? (
              <p className="text-center text-muted-foreground">No quote requests</p>
            ) : (
              <div className="space-y-4">
                {quoteRequests.map((quote) => (
                  <Card key={quote.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <img
                          src={quote.photo_url}
                          alt={quote.product_name}
                          className="h-24 w-24 rounded-lg border object-cover"
                        />
                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{quote.product_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {quote.quantity}
                              </p>
                            </div>
                            <Badge className={
                              quote.status === "pending" 
                                ? "bg-warning text-warning-foreground"
                                : "bg-info text-info-foreground"
                            }>
                              {quote.status}
                            </Badge>
                          </div>
                          
                          {quote.notes && (
                            <p className="mb-2 text-sm">Notes: {quote.notes}</p>
                          )}
                          
                          <a
                            href={quote.aliexpress_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View on AliExpress →
                          </a>

                          {quote.status === "pending" && (
                            <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4">
                              <div className="space-y-2">
                                <Label htmlFor={`price-${quote.id}`}>
                                  Quoted Price (ETB)
                                </Label>
                                <Input
                                  id={`price-${quote.id}`}
                                  type="number"
                                  step="0.01"
                                  placeholder="Enter price in ETB"
                                  value={selectedQuote?.id === quote.id ? quotedPrice : ""}
                                  onChange={(e) => {
                                    setSelectedQuote(quote);
                                    setQuotedPrice(e.target.value);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`notes-${quote.id}`}>
                                  Admin Notes (Optional)
                                </Label>
                                <Textarea
                                  id={`notes-${quote.id}`}
                                  placeholder="Internal notes..."
                                  value={selectedQuote?.id === quote.id ? adminNotes : ""}
                                  onChange={(e) => {
                                    setSelectedQuote(quote);
                                    setAdminNotes(e.target.value);
                                  }}
                                />
                              </div>
                              <Button
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  handleSendQuote();
                                }}
                                disabled={!quotedPrice}
                              >
                                Send Quote
                              </Button>
                            </div>
                          )}

                          {quote.quoted_price_etb && (
                            <div className="mt-2">
                              <p className="text-lg font-bold text-primary">
                                Quoted: {quote.quoted_price_etb.toLocaleString()} ETB
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <CardDescription>Manage customer orders and tracking</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center text-muted-foreground">Loading...</div>
                ) : orders.length === 0 ? (
                  <p className="text-center text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.created_at).toLocaleString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  City: {order.city} • Phone: {order.phone}
                                </p>
                              </div>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status.replace("_", " ")}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm">
                                <span className="font-medium">Shipping Address:</span> {order.shipping_address}
                              </p>
                              <p className="text-lg font-bold text-primary">
                                Total: {order.total_etb.toLocaleString()} ETB
                              </p>
                              {order.payment_method && (
                                <p className="text-sm">
                                  <span className="font-medium">Payment Method:</span>{" "}
                                  {order.payment_method.toUpperCase()}
                                </p>
                              )}
                              {order.payment_proof_url && (
                                <a
                                  href={order.payment_proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  View Payment Proof →
                                </a>
                              )}
                              {order.tracking_number && (
                                <p className="text-sm">
                                  <span className="font-medium">Tracking:</span> {order.tracking_number}
                                </p>
                              )}
                              {order.admin_notes && (
                                <p className="text-sm">
                                  <span className="font-medium">Admin Notes:</span> {order.admin_notes}
                                </p>
                              )}
                              
                              {/* Order Items with AliExpress Links */}
                              {order.order_items && order.order_items.length > 0 && (
                                <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                                  <p className="mb-2 font-medium text-sm">Order Items:</p>
                                  <div className="space-y-2">
                                    {order.order_items.map((item) => (
                                      <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div>
                                          <span>{item.product_name}</span>
                                          <span className="text-muted-foreground"> × {item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span>{item.price_etb.toLocaleString()} ETB</span>
                                          {item.product?.aliexpress_url && (
                                            <a
                                              href={item.product.aliexpress_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline"
                                            >
                                              AliExpress →
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {editingOrder === order.id ? (
                              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={orderUpdates.status}
                                    onChange={(e) =>
                                      setOrderUpdates({ ...orderUpdates, status: e.target.value })
                                    }
                                  >
                                    <option value="">Select status</option>
                                    <option value="pending_payment">Pending Payment</option>
                                    <option value="payment_verified">Payment Verified</option>
                                    <option value="ordered_on_aliexpress">Ordered on AliExpress</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Tracking Number</Label>
                                  <Input
                                    placeholder="Enter tracking number"
                                    value={orderUpdates.tracking_number}
                                    onChange={(e) =>
                                      setOrderUpdates({
                                        ...orderUpdates,
                                        tracking_number: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Admin Notes</Label>
                                  <Textarea
                                    placeholder="Internal notes..."
                                    value={orderUpdates.admin_notes}
                                    onChange={(e) =>
                                      setOrderUpdates({ ...orderUpdates, admin_notes: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleUpdateOrder(order.id)}>
                                    Update Order
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingOrder(null);
                                      setOrderUpdates({
                                        status: "",
                                        tracking_number: "",
                                        admin_notes: "",
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  setEditingOrder(order.id);
                                  setOrderUpdates({
                                    status: order.status,
                                    tracking_number: order.tracking_number || "",
                                    admin_notes: order.admin_notes || "",
                                  });
                                }}
                              >
                                Manage Order
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>Manage your product catalog</CardDescription>
                  </div>
                  <Button onClick={() => setShowProductForm(!showProductForm)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showProductForm && (
                  <Card className="mb-6">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-name">Product Name *</Label>
                            <Input
                              id="product-name"
                              placeholder="Enter product name"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-category">Category</Label>
                            <select
                              id="product-category"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={newProduct.category}
                              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                            >
                              <option value="electronics">Electronics</option>
                              <option value="fashion">Fashion</option>
                              <option value="home">Home & Garden</option>
                              <option value="sports">Sports & Outdoors</option>
                              <option value="toys">Toys & Games</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-description">Description</Label>
                          <Textarea
                            id="product-description"
                            placeholder="Enter product description"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="aliexpress-url">AliExpress URL (Admin Only)</Label>
                          <Input
                            id="aliexpress-url"
                            type="url"
                            placeholder="https://www.aliexpress.com/item/..."
                            value={newProduct.aliexpress_url}
                            onChange={(e) => setNewProduct({ ...newProduct, aliexpress_url: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            This URL will only be visible to admins, not to customers
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-image">Product Image</Label>
                          <Input
                            id="product-image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-price">Price (ETB) *</Label>
                            <Input
                              id="product-price"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={newProduct.price_etb}
                              onChange={(e) => setNewProduct({ ...newProduct, price_etb: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-cost">Cost (USD)</Label>
                            <Input
                              id="product-cost"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={newProduct.cost_usd}
                              onChange={(e) => setNewProduct({ ...newProduct, cost_usd: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="product-stock"
                            checked={newProduct.stock_status}
                            onChange={(e) => setNewProduct({ ...newProduct, stock_status: e.target.checked })}
                            className="h-4 w-4 rounded border-input"
                          />
                          <Label htmlFor="product-stock" className="cursor-pointer">In Stock</Label>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={handleAddProduct}>Add Product</Button>
                          <Button variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Image Updater Tool */}
                <div className="mb-6">
                  <ImageUpdater />
                </div>

                {loading ? (
                  <div className="text-center text-muted-foreground">Loading...</div>
                ) : products.length === 0 ? (
                  <p className="text-center text-muted-foreground">No products yet</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                      <Card key={product.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="mb-4 h-48 w-full rounded-lg object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                            )}
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold">{product.name}</h3>
                              <Badge variant={product.stock_status ? "default" : "secondary"}>
                                {product.stock_status ? "In Stock" : "Out of Stock"}
                              </Badge>
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-lg font-bold text-primary">
                                {product.price_etb.toLocaleString()} ETB
                              </span>
                              {product.cost_usd && (
                                <span className="text-sm text-muted-foreground">
                                  Cost: ${product.cost_usd}
                                </span>
                              )}
                            </div>
                            {product.aliexpress_url && (
                              <a
                                href={product.aliexpress_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-sm text-primary hover:underline"
                              >
                                View on AliExpress →
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="resellers">
        <AdminResellers />
      </TabsContent>

      <TabsContent value="withdrawals">
        <AdminWithdrawals />
      </TabsContent>

          <TabsContent value="messaging">
            <AdminMessaging />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReports />
          </TabsContent>

          <TabsContent value="punishments">
            <AdminPunishments />
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Reseller Applications</CardTitle>
                <CardDescription>Review and approve reseller applications</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/admin/applications")}>
                  View All Applications
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Respond to customer support tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/admin/support-tickets")}>
                  View All Tickets
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
  </div>
</div>
  );
};

export default AdminDashboard;
