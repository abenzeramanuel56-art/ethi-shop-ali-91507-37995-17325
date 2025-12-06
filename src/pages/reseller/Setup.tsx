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

export default function ResellerSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [existingStore, setExistingStore] = useState<any>(null);
  const [formData, setFormData] = useState({
    storeName: "",
    storeSlug: "",
    contactEmail: "",
    contactPhone: ""
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

    const { data, error } = await supabase
      .from("reseller_stores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setExistingStore(data);
      setFormData({
        storeName: data.store_name,
        storeSlug: data.store_slug,
        contactEmail: data.contact_email || "",
        contactPhone: data.contact_phone || ""
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const slug = generateSlug(formData.storeSlug || formData.storeName);

    try {
      if (existingStore) {
        const { error } = await supabase
          .from("reseller_stores")
          .update({
            store_name: formData.storeName,
            store_slug: slug,
            contact_email: formData.contactEmail,
            contact_phone: formData.contactPhone
          })
          .eq("id", existingStore.id);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('setup.storeUpdated')
        });
      } else {
        const { error } = await supabase
          .from("reseller_stores")
          .insert({
            user_id: user.id,
            store_name: formData.storeName,
            store_slug: slug,
            contact_email: formData.contactEmail,
            contact_phone: formData.contactPhone
          });

        if (error) throw error;

        await supabase
          .from("reseller_wallets")
          .insert({
            user_id: user.id,
            current_balance_etb: 0,
            total_earned_etb: 0
          });

        toast({
          title: t('common.success'),
          description: t('setup.storeCreated')
        });
      }

      navigate("/reseller");
    } catch (error: any) {
      toast({
        title: t('common.error'),
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
              {existingStore ? t('setup.editTitle') : t('setup.createTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="storeName">{t('setup.storeName')} *</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="storeSlug">{t('setup.storeSlug')} *</Label>
                <Input
                  id="storeSlug"
                  value={formData.storeSlug}
                  onChange={(e) => setFormData({ ...formData, storeSlug: e.target.value })}
                  placeholder="my-store"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t('setup.storeUrlPreview')} /store/{generateSlug(formData.storeSlug || formData.storeName)}
                </p>
              </div>

              <div>
                <Label htmlFor="contactEmail">{t('setup.contactEmail')}</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">{t('setup.contactPhone')}</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? t('setup.saving') : existingStore ? t('setup.update') : t('setup.create')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}