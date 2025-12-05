import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart } from "lucide-react";
import ReportStoreDialog from "@/components/ReportStoreDialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreInfo {
  id: string;
  store_name: string;
  store_slug: string;
  contact_email: string;
  contact_phone: string;
}

interface ResellerProduct {
  id: string;
  reseller_price_etb: number;
  products: any;
}

export default function Store() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<ResellerProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ResellerProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchStore();
  }, [storeSlug]);

  const STORAGE_BUCKET = "product-images";

  async function resolveImageUrl(path?: string | null) {
    if (!path) return "/placeholder.svg";
    if (path.startsWith("http")) return path;

    try {
      const pubRes: any = await supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pubRes?.data?.publicUrl || pubRes?.public_url || pubRes?.publicURL || pubRes?.publicURI;
      if (publicUrl) return publicUrl;

      const signedRes: any = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60);
      const signedUrl = signedRes?.data?.signedUrl || signedRes?.data?.signedURL;
      if (signedUrl) return signedUrl;
    } catch (e) {
      // ignore
    }

    return "/placeholder.svg";
  }

  const getProduct = (rp: ResellerProduct) => {
    if (!rp || !rp.products) return null;
    return Array.isArray(rp.products) ? rp.products[0] : rp.products;
  };

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>, rp: ResellerProduct) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const prod = getProduct(rp);
    if (!prod) {
      toast({ title: t('common.error'), description: "Product data missing", variant: "destructive" });
      return;
    }

    const bucket = "product-images";
    const path = `products/${prod.id}/${Date.now()}_${file.name}`;

    try {
      setUploadingProductId(rp.id);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path) as any;
      const publicUrl = publicData?.publicUrl || publicData?.public_url || publicData?.publicURL;
      if (!publicUrl) throw new Error("Unable to get public URL for uploaded image");

      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", prod.id);

      if (updateError) throw updateError;

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== rp.id) return p;
          if (Array.isArray(p.products)) {
            const cloned = [...p.products];
            cloned[0] = { ...cloned[0], image_url: publicUrl };
            return { ...p, products: cloned };
          } else {
            return { ...p, products: { ...(p.products || {}), image_url: publicUrl } };
          }
        })
      );

      toast({ title: t('common.success'), description: `${prod.name} image updated` });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setUploadingProductId(null);
      if (e.target) e.target.value = "";
    }
  };

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      setFilteredProducts(
        products.filter((p) => {
          const prod = getProduct(p);
          if (!prod) return false;
          return (
            (prod.name || "").toLowerCase().includes(term) ||
            (prod.unique_product_code || "").toLowerCase().includes(term)
          );
        })
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const fetchStore = async () => {
    setLoading(true);
    try {
      const slug = (storeSlug || "").toLowerCase();
      if (!slug) throw new Error("Missing store slug");

      const { data: storeData, error: storeError } = await supabase
        .rpc("get_store_by_slug", { p_slug: slug })
        .single();

      if (storeError) throw storeError;
      if (!storeData) throw new Error("Store not found");

      setStore(storeData as StoreInfo);

      const { data: productsData, error: productsError } = await supabase
        .from("reseller_products")
        .select(`
          *,
          products (*)
        `)
        .eq("store_id", storeData.id)
        .eq("is_active", true);

      if (productsError) throw productsError;

      const normalized = await Promise.all(
        (productsData || []).map(async (rp: any) => {
          const prod = Array.isArray(rp.products) ? rp.products[0] : rp.products;
          if (prod) {
            prod.image_url = await resolveImageUrl(prod.image_url);
          }
          return { ...rp, products: prod };
        })
      );

      setProducts(normalized);
      setFilteredProducts(normalized);
    } catch (err) {
      toast({
        title: t('store.notFound'),
        description: t('store.notFoundDesc'),
        variant: "destructive",
      });
      navigate("/");
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: ResellerProduct) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const prod = getProduct(product);
    if (!prod) return;
    
    const existingItem = cart.find((item: any) => item.id === prod.id && item.store_type === "reseller");
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: `${prod.id}-reseller-${Date.now()}`,
        product_id: prod.id,
        product_name: prod.name,
        price_etb: product.reseller_price_etb,
        image_url: prod.image_url,
        quantity: 1,
        reseller_id: store?.id,
        store_type: "reseller",
        reseller_profit_etb: Math.max(0, product.reseller_price_etb - (prod.price_etb || 0))
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    
    toast({
      title: t('store.addedToCart'),
      description: `${prod.name} ${t('store.addedToCartDesc')}`
    });
  };

  const handleBuyNow = (product: ResellerProduct) => {
    handleAddToCart(product);
    navigate("/cart");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">{t('store.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{store?.store_name}</h1>
            {store?.contact_email && (
              <p className="text-sm text-muted-foreground">{t('store.contact')}: {store.contact_email}</p>
            )}
          </div>
          {store && (
            <ReportStoreDialog storeId={store.id} storeName={store.store_name} />
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('store.searchProducts')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {t('products.showing')} {filteredProducts.length} {t('products.products')}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? t('store.noProductsFound') : t('store.noProducts')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((rp) => {
              const prod = getProduct(rp);
              if (!prod) return null;
              
              return (
                <Card key={rp.id} className="group flex flex-col overflow-hidden border-0 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden bg-accent/30">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={`${prod.name} product image`}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src.endsWith('/placeholder.svg')) return;
                          img.src = '/placeholder.svg';
                        }}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                    <Badge className="absolute left-2 top-2 bg-sale-red text-white border-0 shadow-md">
                      {t('products.hotDeal')}
                    </Badge>
                  </div>
                  
                  <CardContent className="flex-grow p-3">
                    <h3 className="line-clamp-2 text-sm font-medium mb-1">{prod.name}</h3>
                    {prod.unique_product_code && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {t('store.code')}: {prod.unique_product_code}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2 mb-2">
                      <div className="text-xl font-bold text-primary">
                        {(Number(rp.reseller_price_etb ?? 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('common.etb')}</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <span className="font-medium">{t('products.freeShipping')}</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex gap-2 p-3 pt-0">
                    <Button
                      onClick={() => handleAddToCart(rp)}
                      className="flex-1 h-9 text-xs gap-1"
                      variant="outline"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      {t('products.cart')}
                    </Button>
                    <Button 
                      className="flex-1 h-9 text-xs font-bold" 
                      onClick={() => handleBuyNow(rp)}
                    >
                      {t('products.buyNow')}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
