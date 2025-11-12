import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart } from "lucide-react";
import ReportStoreDialog from "@/components/ReportStoreDialog";

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
  products: {
    id: string;
    name: string;
    unique_product_code: string;
    description: string;
    image_url: string;
    category: string;
    price_etb: number;
  };
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

  useEffect(() => {
    fetchStore();
  }, [storeSlug]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredProducts(
        products.filter((p) =>
          p.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.products.unique_product_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
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

      setProducts(productsData || []);
      setFilteredProducts(productsData || []);
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
                  {rp.products.image_url ? (
                    <img
                      src={rp.products.image_url}
                      alt={`${rp.products.name} product image`}
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
                </div>
                <CardContent className="flex-grow p-3">
                  <h3 className="line-clamp-2 text-sm font-medium mb-2">{rp.products.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Code: {rp.products.unique_product_code}
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <div className="text-2xl font-bold text-primary">
                      {rp.reseller_price_etb.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">ETB</div>
                  </div>
                  <Button
                    onClick={() => handleAddToCart(rp)}
                    className="w-full h-9 text-xs font-bold gap-1"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}