import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Store, Package, DollarSign, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    currentBalance: 0,
    totalEarned: 0
  });

  useEffect(() => {
    checkResellerAccess();
  }, []);

  const checkResellerAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has reseller role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "reseller")
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You need reseller access to view this page",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    // Check if reseller has created a store
    const { data: storeData } = await supabase
      .from("reseller_stores")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!storeData) {
      setHasStore(false);
      setLoading(false);
      return;
    }

    setHasStore(true);
    await fetchStats(storeData.id);
    setLoading(false);
  };

  const fetchStats = async (storeId: string) => {
    // Fetch orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("reseller_id", storeId);

    // Fetch products
    const { data: products } = await supabase
      .from("reseller_products")
      .select("*")
      .eq("store_id", storeId);

    // Fetch wallet
    const { data: { user } } = await supabase.auth.getUser();
    const { data: wallet } = await supabase
      .from("reseller_wallets")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    setStats({
      totalOrders: orders?.length || 0,
      pendingOrders: orders?.filter(o => o.status === "pending_payment").length || 0,
      totalProducts: products?.length || 0,
      currentBalance: parseFloat(String(wallet?.current_balance_etb || 0)),
      totalEarned: parseFloat(String(wallet?.total_earned_etb || 0))
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasStore) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-6 w-6" />
                Create Your Store
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">You need to create a store before you can start selling.</p>
              <Button onClick={() => navigate("/reseller/setup")}>
                Create Store
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Reseller Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentBalance.toFixed(2)} ETB</div>
              <p className="text-xs text-muted-foreground">Total Earned: {stats.totalEarned.toFixed(2)} ETB</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="store">Store Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Manage Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/products")}>
                  Manage Products
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>View Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/orders")}>
                  View All Orders
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle>Wallet & Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/wallet")}>
                  Manage Wallet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Store Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/setup")}>
                  Edit Store Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}