import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Store, DollarSign } from "lucide-react";

interface SellerStore {
  id: string;
  store_name: string;
  store_slug: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string };
  seller_wallets: { current_balance_etb: number; total_earned_etb: number }[];
}

export default function AdminSellers() {
  const [sellers, setSellers] = useState<SellerStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("seller_stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const storesWithDetails = await Promise.all(
        (data || []).map(async (store: any) => {
          const [profileData, walletData] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", store.user_id).single(),
            (supabase as any).from("seller_wallets").select("current_balance_etb, total_earned_etb").eq("user_id", store.user_id).maybeSingle()
          ]);

          return {
            ...store,
            profiles: profileData.data || { full_name: "Unknown" },
            seller_wallets: walletData.data ? [walletData.data] : []
          };
        })
      );

      setSellers(storesWithDetails);
    } catch (error: any) {
      toast.error("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading sellers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Seller Management</h2>
      </div>

      {sellers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No sellers registered yet</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sellers.map((seller) => (
            <Card key={seller.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>{seller.store_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Owner: {seller.profiles?.full_name}</p>
                    </div>
                  </div>
                  <Badge variant="outline">/{seller.store_slug}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Info</h4>
                    <p className="text-sm text-muted-foreground">Email: {seller.contact_email || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">Phone: {seller.contact_phone || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />Wallet
                    </h4>
                    {seller.seller_wallets?.[0] ? (
                      <>
                        <p className="text-sm">Balance: {seller.seller_wallets[0].current_balance_etb.toFixed(2)} ETB</p>
                        <p className="text-sm">Earned: {seller.seller_wallets[0].total_earned_etb.toFixed(2)} ETB</p>
                      </>
                    ) : <p className="text-sm text-muted-foreground">No earnings</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
