import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Store, Package, DollarSign, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [hasStore, setHasStore] = useState(false);
  const [storeName, setStoreName] = useState<string>("");
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    currentBalance: 0,
    totalEarned: 0
  });

  useEffect(() => {
    checkSellerAccess();
  }, []);

  const checkSellerAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "reseller")
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You need to be a seller to access this page",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    const { data: storeData } = await (supabase as any)
      .from("seller_stores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!storeData) {
      setHasStore(false);
      setLoading(false);
      return;
    }

    setHasStore(true);
    setStoreName(storeData.store_name);
    await fetchStats(storeData.id, user.id);
    setLoading(false);
  };

  const fetchStats = async (storeId: string, userId: string) => {
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", storeId);

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", storeId);

    const { data: wallet } = await (supabase as any)
      .from("seller_wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

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
              <p className="mb-4">You need to set up your store before you can start selling.</p>
              <Button onClick={() => navigate("/seller/setup")}>
                Create Store
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Seller Dashboard</h1>
        <p className="text-muted-foreground mb-8">Welcome back, {storeName}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-accent/10 to-accent/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Products</CardTitle>
              <Package className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-success/10 to-success/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.currentBalance.toFixed(2)} ETB</div>
              <p className="text-xs text-muted-foreground">Total Earned: {stats.totalEarned.toFixed(2)} ETB</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
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
                <Button onClick={() => navigate("/seller/products")}>
                  Manage Products
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Manage Services</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Offer services like tutoring, maintenance, tech support, and more.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => navigate("/seller/services")}>
                    Manage Services
                  </Button>
                  <Button onClick={() => navigate("/seller/service-orders")} variant="outline">
                    View Service Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>View Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/seller/orders")}>
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
                <Button onClick={() => navigate("/seller/wallet")}>
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
                <Button onClick={() => navigate("/seller/setup")}>
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
