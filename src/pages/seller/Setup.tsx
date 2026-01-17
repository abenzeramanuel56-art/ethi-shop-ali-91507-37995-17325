import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocationPicker } from "@/components/LocationPicker";

export default function SellerSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [existingStore, setExistingStore] = useState<any>(null);
  const [formData, setFormData] = useState({
    storeName: "",
    storeSlug: "",
    contactEmail: "",
    contactPhone: "",
    latitude: null as number | null,
    longitude: null as number | null,
    locationAddress: ""
  });

  useEffect(() => {
    checkExistingStore();
  }, []);

  const checkExistingStore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await (supabase as any)
      .from("seller_stores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setExistingStore(data);
      setFormData({
        storeName: data.store_name,
        storeSlug: data.store_slug,
        contactEmail: data.contact_email || "",
        contactPhone: data.contact_phone || "",
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        locationAddress: data.location_address || ""
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleLocationChange = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      locationAddress: address || prev.locationAddress
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require location for store creation/update
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Location Required",
        description: "Please set your store location. This is required for delivery pickup.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const slug = generateSlug(formData.storeSlug || formData.storeName);

    try {
      if (existingStore) {
        const { error } = await (supabase as any)
          .from("seller_stores")
          .update({
            store_name: formData.storeName,
            store_slug: slug,
            contact_email: formData.contactEmail,
            contact_phone: formData.contactPhone,
            latitude: formData.latitude,
            longitude: formData.longitude,
            location_address: formData.locationAddress
          })
          .eq("id", existingStore.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Store updated successfully"
        });
      } else {
        const { error } = await (supabase as any)
          .from("seller_stores")
          .insert({
            user_id: user.id,
            store_name: formData.storeName,
            store_slug: slug,
            contact_email: formData.contactEmail,
            contact_phone: formData.contactPhone,
            latitude: formData.latitude,
            longitude: formData.longitude,
            location_address: formData.locationAddress
          });

        if (error) throw error;

        await (supabase as any)
          .from("seller_wallets")
          .insert({
            user_id: user.id,
            current_balance_etb: 0,
            total_earned_etb: 0
          });

        toast({
          title: "Success",
          description: "Store created successfully"
        });
      }

      navigate("/seller");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
              {existingStore ? "Edit Store Settings" : "Create Your Store"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="storeName">Store Name *</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="storeSlug">Store Slug *</Label>
                <Input
                  id="storeSlug"
                  value={formData.storeSlug}
                  onChange={(e) => setFormData({ ...formData, storeSlug: e.target.value })}
                  placeholder="my-store"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Store URL: /store/{generateSlug(formData.storeSlug || formData.storeName)}
                </p>
              </div>

              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+251..."
                  required
                />
              </div>

              {/* Store Location */}
              <div className="border-t pt-4">
                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  address={formData.locationAddress}
                  onLocationChange={handleLocationChange}
                  label="Store Location (Required for delivery pickup) *"
                />
                {!formData.latitude && (
                  <p className="text-sm text-destructive mt-2">
                    ⚠️ Store location is required. You won't be able to post products without setting your location.
                  </p>
                )}
                {formData.locationAddress && (
                  <div className="mt-2">
                    <Label className="text-xs">Address</Label>
                    <Input
                      value={formData.locationAddress}
                      onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                      placeholder="Store address"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : existingStore ? "Update Store" : "Create Store"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
