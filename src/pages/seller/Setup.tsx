import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocationPicker } from "@/components/LocationPicker";
import { Store, MapPin, Phone, Mail, Zap, AlertCircle } from "lucide-react";

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
    locationAddress: "",
  });

  useEffect(() => { checkExistingStore(); }, []);

  const checkExistingStore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data } = await (supabase as any).from("seller_stores").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      setExistingStore(data);
      setFormData({
        storeName: data.store_name,
        storeSlug: data.store_slug,
        contactEmail: data.contact_email || "",
        contactPhone: data.contact_phone || "",
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        locationAddress: data.location_address || "",
      });
    }
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const handleLocationChange = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, locationAddress: address || prev.locationAddress }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      toast({ title: "Location Required", description: "Please set your store location for delivery pickup.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const slug = generateSlug(formData.storeSlug || formData.storeName);
    const payload = {
      store_name: formData.storeName,
      store_slug: slug,
      contact_email: formData.contactEmail,
      contact_phone: formData.contactPhone,
      latitude: formData.latitude,
      longitude: formData.longitude,
      location_address: formData.locationAddress,
    };
    try {
      if (existingStore) {
        const { error } = await (supabase as any).from("seller_stores").update(payload).eq("id", existingStore.id);
        if (error) throw error;
        toast({ title: "Store updated successfully" });
      } else {
        const { error } = await (supabase as any).from("seller_stores").insert({ user_id: user.id, ...payload });
        if (error) throw error;
        await (supabase as any).from("seller_wallets").insert({ user_id: user.id, current_balance_etb: 0, total_earned_etb: 0 });
        toast({ title: "Store created successfully! 🎉" });
      }
      navigate("/seller");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4" style={{ background: 'hsl(var(--primary) / 0.15)', border: '1px solid hsl(var(--primary) / 0.3)' }}>
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground">
            {existingStore ? "Edit Store Settings" : "Create Your Store"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {existingStore ? "Update your store information" : "Set up your store to start selling on AbeniExpress"}
          </p>
        </div>

        <div className="tech-card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Store Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Store Name *</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value, storeSlug: generateSlug(e.target.value) })}
                  placeholder="My Awesome Store"
                  className="pl-10 bg-muted/50 border-border/50"
                  required
                />
              </div>
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Store URL Slug *</Label>
              <div className="relative">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.storeSlug}
                  onChange={(e) => setFormData({ ...formData, storeSlug: e.target.value })}
                  placeholder="my-awesome-store"
                  className="pl-10 bg-muted/50 border-border/50"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                URL: /store/{generateSlug(formData.storeSlug || formData.storeName)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="store@email.com"
                    className="pl-10 bg-muted/50 border-border/50"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Contact Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+251..."
                    className="pl-10 bg-muted/50 border-border/50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="border-t border-border/50 pt-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Store Location</span>
                <span className="text-xs text-destructive font-medium">(Required for delivery)</span>
              </div>
              <LocationPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                address={formData.locationAddress}
                onLocationChange={handleLocationChange}
                label=""
              />
              {formData.locationAddress && (
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Address Label</Label>
                  <Input
                    value={formData.locationAddress}
                    onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                    placeholder="Store address"
                    className="mt-1.5 bg-muted/50 border-border/50"
                  />
                </div>
              )}
              {!formData.latitude && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">Store location is required. You won't be able to post products without it.</p>
                </div>
              )}
            </div>





            <Button type="submit" disabled={loading} className="w-full btn-glow font-bold h-11">
              {loading ? "Saving..." : existingStore ? "Update Store" : "Create Store & Start Selling"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
