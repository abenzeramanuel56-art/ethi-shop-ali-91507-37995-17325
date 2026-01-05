import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Truck, Package, DollarSign, MapPin, Phone, 
  CheckCircle, Clock, Navigation
} from "lucide-react";

interface DriverOrder {
  id: string;
  order_id: string;
  status: string;
  seller_confirmed_pickup: boolean;
  customer_confirmed_delivery: boolean;
  distance_km: number | null;
  driver_earning_etb: number | null;
  created_at: string;
  orders: {
    id: string;
    shipping_address: string;
    city: string;
    phone: string;
    total_etb: number;
    seller_stores: {
      store_name: string;
      contact_phone: string;
    } | null;
  };
}

interface DriverWallet {
  current_balance_etb: number;
  total_earned_etb: number;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    checkDriverStatus();
  }, []);

  const checkDriverStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "driver")
      .maybeSingle();

    if (!roleData) {
      toast.error("You are not registered as a driver");
      navigate("/apply-driver");
      return;
    }

    setIsDriver(true);
    fetchDriverData(user.id);
  };

  const fetchDriverData = async (userId: string) => {
    try {
      // Fetch driver orders
      const { data: ordersData, error: ordersError } = await (supabase as any)
        .from("driver_orders")
        .select(`
          *,
          orders (
            id,
            shipping_address,
            city,
            phone,
            total_etb,
            seller_stores:seller_id (
              store_name,
              contact_phone
            )
          )
        `)
        .eq("driver_id", userId)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch wallet
      const { data: walletData } = await (supabase as any)
        .from("driver_wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      setWallet(walletData || { current_balance_etb: 0, total_earned_etb: 0 });
    } catch (error: any) {
      toast.error("Failed to load driver data");
    } finally {
      setLoading(false);
    }
  };

  const confirmPickup = async (driverOrderId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("driver_orders")
        .update({ 
          seller_confirmed_pickup: true,
          pickup_at: new Date().toISOString(),
          status: "picked_up"
        })
        .eq("id", driverOrderId);

      if (error) throw error;
      toast.success("Pickup confirmed! Now deliver to the customer.");
      checkDriverStatus();
    } catch (error: any) {
      toast.error("Failed to confirm pickup");
    }
  };

  const confirmDelivery = async (driverOrderId: string, customerPhone: string) => {
    try {
      const { error } = await (supabase as any)
        .from("driver_orders")
        .update({ 
          customer_confirmed_delivery: true,
          delivered_at: new Date().toISOString(),
          status: "delivered"
        })
        .eq("id", driverOrderId);

      if (error) throw error;
      toast.success("Delivery confirmed! Payment has been credited to your wallet.");
      
      // Show customer phone
      toast.info(`Customer phone: ${customerPhone}`);
      checkDriverStatus();
    } catch (error: any) {
      toast.error("Failed to confirm delivery");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "picked_up": return "bg-blue-500";
      case "delivered": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          Loading...
        </div>
      </div>
    );
  }

  if (!isDriver) {
    return null;
  }

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => o.status === "picked_up");
  const completedOrders = orders.filter(o => o.status === "delivered");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Truck className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {wallet?.current_balance_etb.toFixed(2)} ETB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {wallet?.total_earned_etb.toFixed(2)} ETB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders.length + activeOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedOrders.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Pickup ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              In Transit ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending pickups</p>
              </Card>
            ) : (
              pendingOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">
                          {order.orders?.seller_stores?.store_name || "Unknown Store"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>Seller: {order.orders?.seller_stores?.contact_phone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>Deliver to: {order.orders?.city}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => confirmPickup(order.id)}
                      className="w-full"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Confirm Pickup from Seller
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No orders in transit</p>
              </Card>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Delivering to Customer</h3>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        In Transit
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{order.orders?.shipping_address}, {order.orders?.city}</span>
                      </div>
                      {order.distance_km && (
                        <div className="flex items-center gap-2 text-sm">
                          <Navigation className="h-4 w-4" />
                          <span>Distance: {order.distance_km} km</span>
                        </div>
                      )}
                      {order.driver_earning_etb && (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                          <DollarSign className="h-4 w-4" />
                          <span>Earning: {order.driver_earning_etb.toFixed(2)} ETB</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={() => confirmDelivery(order.id, order.orders?.phone || "")}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Delivery
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed deliveries yet</p>
              </Card>
            ) : (
              completedOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {order.orders?.seller_stores?.store_name || "Unknown Store"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-500">Delivered</Badge>
                        {order.driver_earning_etb && (
                          <p className="text-sm font-medium text-green-600 mt-1">
                            +{order.driver_earning_etb.toFixed(2)} ETB
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle>Wallet & Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <p className="text-3xl font-bold">{wallet?.current_balance_etb.toFixed(2)} ETB</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-3xl font-bold">{wallet?.total_earned_etb.toFixed(2)} ETB</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Rate</h4>
                    <p className="text-muted-foreground">
                      You earn <span className="font-bold text-primary">25 ETB per kilometer</span> for each delivery.
                    </p>
                  </div>

                  <Button className="w-full" disabled={!wallet || wallet.current_balance_etb < 100}>
                    Request Withdrawal (Min. 100 ETB)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
