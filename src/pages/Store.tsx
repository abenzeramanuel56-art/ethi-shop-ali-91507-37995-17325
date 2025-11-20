import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart } from "lucide-react";
import ReportStoreDialog from "@/components/ReportStoreDialog";
import ProductImageUploader from "@/components/ProductImageUploader";

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
  // supabase joined relation can be object or array
  products: any;
}

export default function Store() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<ResellerProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ResellerProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  const STORAGE_BUCKET = "product-images"; // change if your bucket name differs

  // Resolve a stored path or URL to a usable image URL. Tries:
  // - return as-is if it's already an http URL
  // - try getPublicUrl (public bucket)
  // - fallback to createSignedUrl (private bucket)
  // - final fallback to placeholder
  async function resolveImageUrl(path?: string | null) {
    if (!path) return "/placeholder.svg";
    if (path.startsWith("http")) return path;

    try {
      // Try public URL
      const pubRes: any = await supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = pubRes?.data?.publicUrl || pubRes?.public_url || pubRes?.publicURL || pubRes?.publicURI;
      if (publicUrl) return publicUrl;

      // Try signed url (short lived)
      const signedRes: any = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60);
      const signedUrl = signedRes?.data?.signedUrl || signedRes?.data?.signedURL;
      if (signedUrl) return signedUrl;
    } catch (e) {
      // ignore and fallthrough to placeholder
    }

    return "/placeholder.svg";
  }

  // normalize joined product (object or array)
  const getProduct = (rp: ResellerProduct) => {
    if (!rp || !rp.products) return null;
    return Array.isArray(rp.products) ? rp.products[0] : rp.products;
  };

  // IMAGE UPLOADER: uploads file to Supabase Storage and updates products.image_url
  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>, rp: ResellerProduct) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const prod = getProduct(rp);
    if (!prod) {
      toast({ title: "Upload failed", description: "Product data missing", variant: "destructive" });
      return;
    }

    const bucket = "product-images"; // change to your bucket name if different
    const path = `products/${prod.id}/${Date.now()}_${file.name}`;

    try {
      setUploadingProductId(rp.id);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      // get public URL (if bucket is public). getPublicUrl is synchronous
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path) as any;
      const publicUrl = publicData?.publicUrl || publicData?.public_url || publicData?.publicURL;
      if (!publicUrl) throw new Error("Unable to get public URL for uploaded image");

      // update product record
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", prod.id);

      if (updateError) throw updateError;

      // update local state to reflect new image without refetching
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

      toast({ title: "Image updated", description: `${prod.name} image updated` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setUploadingProductId(null);
      // clear input value so same file can be selected again
      if (e.target) e.target.value = "";
    }
  };

  // Image with fallback and protection against infinite onError loops
  function ImageWithFallback({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
    const erroredRef = useRef(false);
    const [imgSrc, setImgSrc] = useState<string>(() => src || "/placeholder.svg");

    useEffect(() => {
      setImgSrc(src || "/placeholder.svg");
      erroredRef.current = false;
    }, [src]);

    return (
      <img
        src={imgSrc}
        alt={alt || "product image"}
        loading="lazy"
        onError={(e) => {
          if (erroredRef.current) return;
          erroredRef.current = true;
          (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
        }}
        className={className}
      />
    );
  }

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

      // ensure products have safe image_url fields and normalize joined product
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
        title: "Store Not Found",
        description: "This store does not exist",
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
    
    const existingItem = cart.find((item: any) => item.id === product.products.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.products.id,
        product_id: product.products.id,
        product_name: product.products.name,
        price_etb: product.reseller_price_etb,
        image_url: product.products.image_url,
        quantity: 1,
        reseller_id: store?.id,
        store_type: "reseller",
        reseller_profit_etb: Math.max(0, product.reseller_price_etb - (product.products.price_etb || 0))
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    
    toast({
      title: "Added to Cart",
      description: `${product.products.name} added to cart`
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading store...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{store?.store_name}</h1>
            {store?.contact_email && (
              <p className="text-muted-foreground">Contact: {store.contact_email}</p>
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
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? "No products found" : "No products available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((rp) => (
              <Card key={rp.id} className="group flex flex-col overflow-hidden border-0 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="relative aspect-square overflow-hidden bg-accent/30">
                  {(() => {
                    const prod = getProduct(rp);
                    if (!prod) return (
                      <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
                    );
                    return prod.image_url ? (
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
                      <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
                    );
                  })()}
                </div>
                <CardContent className="flex-grow p-3">
                  <h3 className="line-clamp-2 text-sm font-medium mb-2">{getProduct(rp)?.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Code: {getProduct(rp)?.unique_product_code}
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <div className="text-2xl font-bold text-primary">
                      {(Number(rp.reseller_price_etb ?? 0)).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">ETB</div>
                  </div>
                  <div className="flex gap-2 items-center mb-3">
                    <Button
                      onClick={() => handleAddToCart(rp)}
                      className="flex-1 h-9 text-xs font-bold gap-1"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      Add to Cart
                    </Button>

                    {/* Hidden file input triggered by label */}
                    <div className="flex items-center">
                      <input
                        id={`file-${rp.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageSelect(e, rp)}
                      />
                      <label htmlFor={`file-${rp.id}`} className="text-xs text-muted-foreground cursor-pointer px-2 py-1 rounded hover:bg-accent/20">
                        {uploadingProductId === rp.id ? "Uploading..." : "Update Image"}
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}