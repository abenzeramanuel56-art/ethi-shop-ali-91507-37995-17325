import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default function AffiliateSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await (supabase as any).from("affiliate_stores").select("id").eq("user_id", user.id).maybeSingle();
      if (data) { navigate("/affiliate"); return; }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !slug.trim()) { toast.error("Fill store name and link"); return; }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("create_affiliate_store", {
      p_store_name: storeName,
      p_store_slug: slug,
      p_contact_phone: phone,
      p_bio: bio,
    });
    setLoading(false);
    if (error) {
      if (error.message?.includes("slug_taken")) toast.error("That store link is taken. Try another.");
      else toast.error(error.message || "Failed to create store");
      return;
    }
    toast.success("Affiliate store created!");
    navigate("/affiliate");
  };

  if (checking) return <div className="min-h-screen bg-background"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-3xl font-black">Start Your Affiliate Store</h1>
            <p className="text-sm text-muted-foreground">No KYC needed. Promote official Abeni Express products and earn on every sale.</p>
          </div>
        </div>

        <Card className="p-6 tech-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Store Name *</Label>
              <Input value={storeName} onChange={(e) => { setStoreName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="My Awesome Store" required />
            </div>
            <div>
              <Label>Store Link (unique) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">abeniexpress.online/a/</span>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="my-store" required />
              </div>
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519..." />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell buyers about your store..." rows={3} />
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-glow">
              {loading ? "Creating..." : "Create Affiliate Store"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
