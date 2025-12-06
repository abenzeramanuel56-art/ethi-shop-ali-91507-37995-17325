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

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [hasStore, setHasStore] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [storeName, setStoreName] = useState<string>("");
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

    setUserId(user.id);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "reseller")
      .single();

    if (!roleData) {
      toast({
        title: t('reseller.accessDenied'),
        description: t('reseller.accessDeniedDesc'),
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    const { data: storeData } = await supabase
      .from("reseller_stores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!storeData) {
      setHasStore(false);
      setLoading(false);
      return;
    }

    setHasStore(true);
    setStoreSlug(storeData.store_slug);
    setStoreName(storeData.store_name);
    await fetchStats(storeData.id);
    setLoading(false);
  };

  const fetchStats = async (storeId: string) => {
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("reseller_id", storeId);

    const { data: products } = await supabase
      .from("reseller_products")
      .select("*")
      .eq("store_id", storeId);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: wallet } = await supabase
      .from("reseller_wallets")
      .select("*")
      .eq("user_id", user?.id)
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
        <p>{t('common.loading')}</p>
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
                {t('reseller.createStore')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{t('reseller.createStoreDesc')}</p>
              <Button onClick={() => navigate("/reseller/setup")}>
                {t('reseller.createStoreBtn')}
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
        <h1 className="text-3xl font-bold mb-4 text-foreground">{t('reseller.title')}</h1>
        
        <Card className="max-w-md mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{t('reseller.yourIds')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{t('reseller.uid')}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                  {userId.slice(0, 8)}...{userId.slice(-8)}
                </code>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(userId)}>
                  {t('reseller.copy')}
                </Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{t('reseller.id')}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                  {userId.slice(0, 6)}...{userId.slice(-6)}
                </code>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(userId)}>
                  {t('reseller.copy')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {storeSlug && (
          <Card className="max-w-md mb-8">
            <CardHeader>
              <CardTitle className="text-lg">{t('reseller.storeLink')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                /store/{storeSlug}
              </code>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${storeSlug}`)}>{t('reseller.copy')}</Button>
              <Button size="sm" onClick={() => navigate(`/store/${storeSlug}`)}>{t('reseller.open')}</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reseller.totalOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reseller.pendingOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-accent/10 to-accent/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reseller.products')}</CardTitle>
              <Package className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-success/10 to-success/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('reseller.currentBalance')}</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.currentBalance.toFixed(2)} {t('common.etb')}</div>
              <p className="text-xs text-muted-foreground">{t('reseller.totalEarned')}: {stats.totalEarned.toFixed(2)} {t('common.etb')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">{t('reseller.products')}</TabsTrigger>
            <TabsTrigger value="orders">{t('reseller.orders')}</TabsTrigger>
            <TabsTrigger value="wallet">{t('reseller.wallet')}</TabsTrigger>
            <TabsTrigger value="store">{t('reseller.storeSettings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>{t('reseller.manageProducts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/products")}>
                  {t('reseller.manageProducts')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>{t('reseller.viewOrders')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/orders")}>
                  {t('reseller.viewAllOrders')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle>{t('reseller.walletWithdrawals')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/wallet")}>
                  {t('reseller.manageWallet')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>{t('reseller.storeSettings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/reseller/setup")}>
                  {t('reseller.editStoreSettings')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}