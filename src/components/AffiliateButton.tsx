import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface Props {
  productId: string;
  productName: string;
  basePrice: number;
}

export function AffiliateButton({ productId, productName, basePrice }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(basePrice + 100));
  const [customTitle, setCustomTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any).from("affiliate_stores").select("id").eq("user_id", user.id).maybeSingle();
      setStoreId(data?.id || null);
    })();
  }, [open]);

  const handleAffiliate = async () => {
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= basePrice) {
      toast.error(`Your price must be higher than base (${basePrice} ETB)`);
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    if (!storeId) { setLoading(false); navigate("/affiliate/setup"); return; }

    const { error } = await (supabase as any).from("affiliate_products").insert({
      affiliate_store_id: storeId,
      original_product_id: productId,
      custom_price_etb: priceNum,
      custom_title: customTitle || null,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.error("Already in your store");
      else toast.error(error.message);
      return;
    }
    toast.success("Added to your affiliate store! 🎉");
    setOpen(false);
    setTimeout(() => navigate("/affiliate"), 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1 border-accent/40 text-accent hover:bg-accent/10">
          <Sparkles className="h-3 w-3" />
          Affiliate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Affiliate this product</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="p-3 rounded bg-muted/50 text-sm">
            <p className="font-semibold">{productName}</p>
            <p className="text-xs text-muted-foreground">Base price: {basePrice} ETB</p>
          </div>
          <div>
            <Label>Your Selling Price (ETB) *</Label>
            <Input type="number" min={basePrice + 1} value={price} onChange={(e) => setPrice(e.target.value)} />
            <p className="text-xs text-accent mt-1">Your profit per sale: {Math.max(0, parseFloat(price || "0") - basePrice)} ETB</p>
          </div>
          <div>
            <Label>Custom Title (optional)</Label>
            <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Rename for your store" />
          </div>
          <Button onClick={handleAffiliate} disabled={loading} className="w-full btn-glow">
            {loading ? "Adding..." : "Add to My Affiliate Store"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
