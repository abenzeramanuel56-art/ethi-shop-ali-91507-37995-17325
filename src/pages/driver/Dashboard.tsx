import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SimpleMap } from "@/components/SimpleMap";
import { DRIVER_RATE_PER_KM } from "@/hooks/useGeolocation";
import { 
  Truck, Package, DollarSign, MapPin, Phone, 
  CheckCircle, Clock, Navigation, Bell
} from "lucide-react";
import { VehicleSettings } from "@/components/VehicleSettings";
import { PushNotificationCard } from "@/components/PushNotificationCard";


interface PendingOrder {
  id: string;
  order_id: string;
  seller_latitude: number | null;
  seller_longitude: number | null;
  seller_phone: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  customer_phone: string | null;
  shipping_address: string | null;
  city: string | null;
  distance_km: number | null;
  estimated_earning_etb: number | null;
  preferred_vehicle_type: string | null;
  created_at: string;
}

interface DriverOrder {
  id: string;
  order_id: string;
  status: string;
  seller_confirmed_pickup: boolean;
  customer_confirmed_delivery: boolean;
  distance_km: number | null;
  driver_earning_etb: number | null;
  seller_latitude: number | null;
  seller_longitude: number | null;
  seller_phone: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  customer_phone: string | null;
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
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [myOrders, setMyOrders] = useState<DriverOrder[]>([]);
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);

  useEffect(() => {
    checkDriverStatus();
  }, []);

  useEffect(() => {
    if (!isDriver) return;

    // Request browser notification permission once
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // Subscribe to realtime pending orders
    const channel = supabase
      .channel('pending-driver-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pending_driver_orders' },
        (payload: any) => {
          fetchPendingOrders();
          const wanted = payload.new?.preferred_vehicle_type as string | null;
          const matches = !wanted || ["any", ""].includes(wanted.toLowerCase()) ||
            (vehicleType || "").toLowerCase() === wanted.toLowerCase();
          if (!matches) return; // only alert drivers whose truck matches the order
          // External browser notification
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              const n = new Notification("🚚 New delivery available!", {
                body: `Pickup → ${payload.new?.city || "city"} · ${payload.new?.distance_km || "?"} km · ${payload.new?.estimated_earning_etb || "?"} ETB`,
                icon: "/favicon.ico",
                tag: "new-order",
              });
              n.onclick = () => window.focus();
            }
          } catch {}
          // Audio ping
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
            audio.play().catch(() => {});
          } catch {}
          toast.info("🚚 New delivery order available!");
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pending_driver_orders' },
        () => fetchPendingOrders()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pending_driver_orders' },
        () => fetchPendingOrders()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDriver, vehicleType]);

  // Live GPS tracking — broadcast driver location every 15s while there are active deliveries
  useEffect(() => {
    if (!isDriver) return;
    const activeIds = myOrders
      .filter(o => o.status === "pending" || o.status === "picked_up")
      .map(o => o.id);
    if (activeIds.length === 0) return;
    if (!navigator.geolocation) return;

    const broadcast = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          activeIds.forEach((id) => {
            (supabase as any).rpc("driver_update_location", {
              p_driver_order_id: id,
              p_lat: pos.coords.latitude,
              p_lng: pos.coords.longitude,
            });
          });
        },
        (err) => console.warn("GPS error", err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };

    broadcast();
    const interval = setInterval(broadcast, 15000);
    return () => clearInterval(interval);
  }, [isDriver, myOrders]);

  const checkDriverStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);

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
    // Load vehicle so we can gate order acceptance
    const { data: appData } = await (supabase as any)
      .from("driver_applications")
      .select("vehicle_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const v = appData?.vehicle_type || null;
    setVehicleType(v);

    fetchPendingOrders(v);
    fetchDriverData(user.id);
  };

  const fetchPendingOrders = async (vehicleOverride?: string | null) => {
    const v = vehicleOverride !== undefined ? vehicleOverride : vehicleType;
    try {
      const { data, error } = await (supabase as any)
        .from("pending_driver_orders")
        .select("*")
        .is("accepted_by", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Only show deliveries that match the vehicle the customer ordered ("any" = open to all)
      const mine = (data || []).filter((o: PendingOrder) =>
        !o.preferred_vehicle_type ||
        ["any", ""].includes(o.preferred_vehicle_type.toLowerCase()) ||
        (v || "").toLowerCase() === o.preferred_vehicle_type.toLowerCase()
      );
      setPendingOrders(mine);
    } catch (error) {
      console.error("Failed to fetch pending orders:", error);
    }
  };

  const fetchDriverData = async (driverId: string) => {
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
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setMyOrders(ordersData || []);

      // Fetch wallet
      const { data: walletData } = await (supabase as any)
        .from("driver_wallets")
        .select("*")
        .eq("user_id", driverId)
        .maybeSingle();

      setWallet(walletData || { current_balance_etb: 0, total_earned_etb: 0 });
    } catch (error: any) {
      toast.error("Failed to load driver data");
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (pendingOrder: PendingOrder) => {
    if (!userId) return;
    if (!vehicleType) {
      toast.error("Set your vehicle type in the Vehicle tab before accepting orders.");
      return;
    }

    try {
      const { error } = await (supabase as any).rpc("driver_accept_pending_order", {
        p_pending_id: pendingOrder.id,
      });

      if (error) throw error;

      toast.success("Order accepted! Go pick up from the seller.");
      await fetchPendingOrders();
      await fetchDriverData(userId);
    } catch (error: any) {
      const raw = typeof error?.message === "string" ? error.message : "";

      if (raw.includes("vehicle_mismatch")) {
        toast.error(raw.replace("vehicle_mismatch: ", "Vehicle mismatch — "));
      } else if (raw.includes("pending_order_not_available")) {
        toast.error("This order was already taken by another driver.");
      } else if (raw.includes("not_a_driver")) {
        toast.error("Your account is not registered as a driver.");
      } else if (raw.includes("not_authenticated")) {
        toast.error("Please sign in again and try.");
      } else {
        toast.error(raw || "Failed to accept order. Please try again.");
      }

      fetchPendingOrders();
    }
  };

  const confirmPickup = async (driverOrderId: string) => {
    try {
      const { error } = await (supabase as any).rpc("driver_confirm_pickup", {
        p_driver_order_id: driverOrderId,
      });

      if (error) throw error;

      toast.success(
        "Pickup confirmed! Customer has been notified. Now deliver to the customer."
      );
      if (userId) fetchDriverData(userId);
    } catch (error: any) {
      const raw = typeof error?.message === "string" ? error.message : "";

      if (raw.includes("driver_order_not_found")) {
        toast.error("Order not found for your driver account.");
      } else if (raw.includes("not_a_driver")) {
        toast.error("Your account is not registered as a driver.");
      } else if (raw.includes("not_authenticated")) {
        toast.error("Please sign in again and try.");
      } else {
        toast.error(raw ? `Failed to confirm pickup: ${raw}` : "Failed to confirm pickup");
      }
    }
  };

  const confirmDelivery = async (driverOrderId: string) => {
    try {
      const { error } = await (supabase as any).rpc("driver_confirm_delivery", {
        p_driver_order_id: driverOrderId,
      });

      if (error) throw error;

      toast.success("Customer notified! Waiting for them to confirm receipt.");
      if (userId) fetchDriverData(userId);
    } catch (error: any) {
      const raw = typeof error?.message === "string" ? error.message : "";

      if (raw.includes("driver_order_not_found_or_invalid_status")) {
        toast.error("You can only confirm delivery after pickup (In Transit).");
      } else {
        toast.error(raw ? `Failed to confirm delivery: ${raw}` : "Failed to confirm delivery");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "picked_up": return "bg-blue-500";
      case "awaiting_customer_confirmation": return "bg-purple-500";
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

  const activeOrders = myOrders.filter(o => o.status === "pending");
  const inTransitOrders = myOrders.filter(o => o.status === "picked_up");
  const awaitingConfirmationOrders = myOrders.filter(o => o.status === "awaiting_customer_confirmation");
  const completedOrders = myOrders.filter(o => o.status === "delivered");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Truck className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        </div>

        <PushNotificationCard
          title="New order alerts"
          description="Turn this on so you hear about new deliveries even when the app is closed."
        />

        {!vehicleType && (

          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-destructive">⚠️ Vehicle required</p>
                <p className="text-sm text-muted-foreground">You must set your vehicle type before you can accept any orders.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => {
                const tab = document.querySelector('[value="vehicle"]') as HTMLElement | null;
                tab?.click();
              }}>
                Set Vehicle
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Orders</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {pendingOrders.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {wallet?.current_balance_etb?.toFixed(2) || "0.00"} ETB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length + inTransitOrders.length + awaitingConfirmationOrders.length}</div>
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

        <Tabs defaultValue="available">
          <TabsList className="flex-wrap">
            <TabsTrigger value="available" className="relative">
              Available Orders
              {pendingOrders.length > 0 && (
                <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Pickup ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="transit">
              In Transit ({inTransitOrders.length})
            </TabsTrigger>
            <TabsTrigger value="awaiting">
              Awaiting Confirmation ({awaitingConfirmationOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
          </TabsList>

          {/* Available Orders Tab */}
          <TabsContent value="available" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No orders available right now</p>
                <p className="text-sm text-muted-foreground mt-2">
                  New orders will appear here when admin approves them
                </p>
              </Card>
            ) : (
              pendingOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Badge className="bg-orange-500 mb-2">New Order</Badge>
                        {order.preferred_vehicle_type && (
                          <Badge variant="outline" className="mb-2 ml-2 capitalize">
                            {order.preferred_vehicle_type}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Order #{order.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        {order.estimated_earning_etb && (
                          <p className="text-lg font-bold text-green-600">
                            +{order.estimated_earning_etb.toFixed(2)} ETB
                          </p>
                        )}
                        {order.distance_km && (
                          <p className="text-sm text-muted-foreground">
                            ~{order.distance_km.toFixed(1)} km
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>Deliver to: {order.shipping_address}, {order.city}</span>
                      </div>
                    </div>

                    {/* Contact Info for Available Orders */}
                    <div className="space-y-2 mb-4 p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Contact Information:</p>
                      {order.seller_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4" />
                          <span>Seller: <a href={`tel:${order.seller_phone}`} className="text-primary underline">{order.seller_phone}</a></span>
                        </div>
                      )}
                      {order.customer_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4" />
                          <span>Customer: <a href={`tel:${order.customer_phone}`} className="text-primary underline">{order.customer_phone}</a></span>
                        </div>
                      )}
                    </div>

                    {/* Map Preview */}
                    {order.seller_latitude && order.customer_latitude && (
                      <SimpleMap
                        locations={[
                          { 
                            latitude: order.seller_latitude, 
                            longitude: order.seller_longitude!, 
                            label: "Pickup (Seller)", 
                            type: "seller" 
                          },
                          { 
                            latitude: order.customer_latitude, 
                            longitude: order.customer_longitude!, 
                            label: "Delivery (Customer)", 
                            type: "customer" 
                          }
                        ]}
                        className="mb-4"
                      />
                    )}

                    <Button 
                      onClick={() => acceptOrder(order)}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept This Order
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Pending Pickup Tab */}
          <TabsContent value="pending" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending pickups</p>
              </Card>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">
                          {order.orders?.seller_stores?.store_name || "Seller"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        Awaiting Pickup
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4 p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Contact Information:</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>Seller: <a href={`tel:${order.seller_phone || order.orders?.seller_stores?.contact_phone}`} className="text-primary underline">{order.seller_phone || order.orders?.seller_stores?.contact_phone || "N/A"}</a></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>Customer: <a href={`tel:${order.customer_phone || order.orders?.phone}`} className="text-primary underline">{order.customer_phone || order.orders?.phone}</a></span>
                      </div>
                    </div>

                    {/* Map */}
                    {order.seller_latitude && order.customer_latitude && (
                      <SimpleMap
                        locations={[
                          { 
                            latitude: order.seller_latitude, 
                            longitude: order.seller_longitude!, 
                            label: "Pickup (Seller)", 
                            type: "seller" 
                          },
                          { 
                            latitude: order.customer_latitude, 
                            longitude: order.customer_longitude!, 
                            label: "Delivery (Customer)", 
                            type: "customer" 
                          }
                        ]}
                        className="mb-4"
                      />
                    )}

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

          {/* In Transit Tab */}
          <TabsContent value="transit" className="space-y-4">
            {inTransitOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No orders in transit</p>
              </Card>
            ) : (
              inTransitOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Delivering to Customer</h3>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge className="bg-blue-500">In Transit</Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4 p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Customer Contact:</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${order.customer_phone || order.orders?.phone}`} className="text-primary underline text-lg">
                          {order.customer_phone || order.orders?.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{order.orders?.shipping_address}, {order.orders?.city}</span>
                      </div>
                    </div>

                    {/* Map */}
                    {order.customer_latitude && (
                      <SimpleMap
                        locations={[
                          { 
                            latitude: order.customer_latitude, 
                            longitude: order.customer_longitude!, 
                            label: "Delivery Location", 
                            type: "customer" 
                          }
                        ]}
                        className="mb-4"
                      />
                    )}

                    <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
                      <span className="text-sm">Your Earning:</span>
                      <span className="text-lg font-bold text-green-600">
                        +{order.driver_earning_etb?.toFixed(2) || "0.00"} ETB
                      </span>
                    </div>

                    <Button 
                      onClick={() => confirmDelivery(order.id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Delivery
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Awaiting Customer Confirmation Tab */}
          <TabsContent value="awaiting" className="space-y-4">
            {awaitingConfirmationOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No orders awaiting customer confirmation</p>
              </Card>
            ) : (
              awaitingConfirmationOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">
                          {order.orders?.seller_stores?.store_name || "Delivery"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge className="bg-purple-500">Awaiting Confirmation</Badge>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg mb-4">
                      <p className="text-sm text-purple-800">
                        ⏳ Waiting for customer to confirm they received the order.
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Once confirmed, {order.driver_earning_etb?.toFixed(2) || "0.00"} ETB will be credited to your wallet.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Pending Earning:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {order.driver_earning_etb?.toFixed(2) || "0.00"} ETB
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Completed Tab */}
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
                          {order.orders?.seller_stores?.store_name || "Delivery"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {order.distance_km && (
                          <p className="text-xs text-muted-foreground">
                            {order.distance_km.toFixed(1)} km
                          </p>
                        )}
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

          {/* Wallet Tab */}
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
                      <p className="text-3xl font-bold">{wallet?.current_balance_etb?.toFixed(2) || "0.00"} ETB</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Earned</p>
                      <p className="text-3xl font-bold">{wallet?.total_earned_etb?.toFixed(2) || "0.00"} ETB</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Rate</h4>
                    <p className="text-muted-foreground">
                      You earn <span className="font-bold text-primary">{DRIVER_RATE_PER_KM} ETB per kilometer</span> for each delivery.
                    </p>
                  </div>

                  <Button className="w-full" onClick={() => navigate("/driver/wallet")}>
                    Manage Withdrawals
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicle">
            <VehicleSettings userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
