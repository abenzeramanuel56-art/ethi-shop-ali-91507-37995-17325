import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Store, DollarSign } from "lucide-react";

interface ResellerStore {
  id: string;
  store_name: string;
  store_slug: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
  reseller_wallets: {
    current_balance_etb: number;
    total_earned_etb: number;
  }[];
}

export default function AdminResellers() {
  const [resellers, setResellers] = useState<ResellerStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    try {
      const { data, error } = await supabase
        .from("reseller_stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch related data separately
      const storesWithDetails = await Promise.all(
        (data || []).map(async (store) => {
          const [profileData, walletData] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", store.user_id).single(),
            supabase.from("reseller_wallets").select("current_balance_etb, total_earned_etb").eq("user_id", store.user_id).maybeSingle()
          ]);

          return {
            ...store,
            profiles: profileData.data || { full_name: "Unknown" },
            reseller_wallets: walletData.data ? [walletData.data] : []
          };
        })
      );

      setResellers(storesWithDetails as any);
    } catch (error: any) {
      toast.error("Failed to load resellers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading resellers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Reseller Management</h2>
      </div>

      {resellers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No resellers registered yet</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resellers.map((reseller) => (
            <Card key={reseller.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>{reseller.store_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Owner: {reseller.profiles?.full_name || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">/{reseller.store_slug}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Info</h4>
                    <p className="text-sm text-muted-foreground">
                      Email: {reseller.contact_email || "Not provided"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Phone: {reseller.contact_phone || "Not provided"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(reseller.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Wallet Stats
                    </h4>
                    {reseller.reseller_wallets?.[0] ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Current Balance: {reseller.reseller_wallets[0].current_balance_etb.toFixed(2)} ETB
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Earned: {reseller.reseller_wallets[0].total_earned_etb.toFixed(2)} ETB
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No earnings yet</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/store/${reseller.store_slug}`, '_blank')}
                  >
                    View Store
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
