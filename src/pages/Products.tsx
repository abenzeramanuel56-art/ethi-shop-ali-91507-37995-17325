import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProductFilters } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, SlidersHorizontal, Store, Zap } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import ReportItemDialog from "@/components/ReportItemDialog";

interface Product {
  id: string;
  name: string;
  description: string;
  price_etb: number;
  image_url: string;
  category: string;
  stock_status: boolean;
  unique_product_code?: string;
  seller_id?: string | null;
}

interface StoreInfo {
  id: string;
  store_name: string;
  store_slug: string;
}

const Products = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [storeMap, setStoreMap] = useState<Record<string, StoreInfo>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [freeShipping, setFreeShipping] = useState(false);
  const navigate = useNavigate();

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 20000;
    return Math.ceil(Math.max(...products.map(p => p.price_etb)) / 1000) * 1000;
  }, [products]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("stock_status", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const prods = data || [];
      setProducts(prods);
      setFilteredProducts(prods);

      // Fetch store info for seller products
      const sellerIds = [...new Set(prods.filter((p: Product) => p.seller_id).map((p: Product) => p.seller_id))] as string[];
      if (sellerIds.length > 0) {
        const { data: stores } = await (supabase as any)
          .from("seller_stores")
          .select("id, store_name, store_slug")
          .in("id", sellerIds);

        if (stores) {
          const map: Record<string, StoreInfo> = {};
          stores.forEach((s: StoreInfo) => { map[s.id] = s; });
          setStoreMap(map);
        }
      }
    } catch (error: any) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const matchesPrice = product.price_etb >= priceRange[0] && product.price_etb <= priceRange[1];
      return matchesSearch && matchesCategory && matchesPrice;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategories, priceRange, freeShipping]);

  useEffect(() => {
    if (products.length > 0) setPriceRange([0, maxPrice]);
  }, [maxPrice, products.length]);

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setFreeShipping(false);
    setSearchQuery("");
  };

  const handleAddToCart = (product: Product) => {
    const saved = localStorage.getItem("cart");
    const cart = saved ? JSON.parse(saved) : [];
    const existing = cart.find((i: any) => i.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        price_etb: product.price_etb,
        quantity: 1,
        image_url: product.image_url,
        store_type: product.seller_id ? "seller" : "admin",
        seller_id: product.seller_id || null,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success(`${product.name} ${t('store.addedToCartDesc')}`);
  };

  const handleBuyNow = (product: Product) => {
    handleAddToCart(product);
    navigate("/cart");
  };

  // Group products by store
  const adminProducts = filteredProducts.filter(p => !p.seller_id);
  const groupedByStore: Record<string, { store: StoreInfo; products: Product[] }> = {};
  filteredProducts.filter(p => p.seller_id).forEach(p => {
    const store = storeMap[p.seller_id!];
    if (store) {
      if (!groupedByStore[store.id]) groupedByStore[store.id] = { store, products: [] };
      groupedByStore[store.id].products.push(p);
    }
  });

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="group tech-card flex flex-col overflow-hidden hover:scale-[1.02] hover:border-primary/40 transition-all duration-300">
      <div className="relative aspect-square overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={`${product.name} product image`}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.src.endsWith('/placeholder.svg')) return;
              img.src = '/placeholder.svg';
            }}
            className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-muted-foreground text-xs">No image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Badge className="absolute left-2 top-2 text-xs font-bold px-2 py-0.5" style={{ background: 'hsl(var(--sale-red))', color: '#fff', border: 'none' }}>
          <Zap className="h-2.5 w-2.5 mr-1" />
          HOT
        </Badge>
      </div>
      
      <div className="flex flex-col flex-grow p-3">
        <h3 className="line-clamp-2 text-sm font-semibold mb-1 text-foreground leading-snug">{product.name}</h3>
        {product.unique_product_code && (
          <p className="text-xs text-muted-foreground mb-2 font-mono">#{product.unique_product_code}</p>
        )}
        <div className="flex items-baseline gap-1 mb-2 mt-auto">
          <span className="text-xl font-black text-primary">{product.price_etb.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">{t('common.etb')}</span>
        </div>
        <div className="flex gap-1.5">
          <Button 
            className="flex-1 h-8 text-xs gap-1" 
            onClick={() => handleAddToCart(product)}
            variant="outline"
          >
            <ShoppingCart className="h-3 w-3" />
            Cart
          </Button>
          <Button className="flex-1 h-8 text-xs font-bold btn-glow" onClick={() => handleBuyNow(product)}>
            Buy Now
          </Button>
          <ReportItemDialog itemId={product.id} itemName={product.name} reportType="product" storeId={product.seller_id || undefined} triggerLabel="" variant="ghost" size="icon" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <SidebarProvider>
        <div className="flex w-full">
          <ProductFilters
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            freeShipping={freeShipping}
            onFreeShippingChange={setFreeShipping}
            onReset={handleResetFilters}
            maxPrice={maxPrice}
          />

          <main className="flex-1">
            <div className="container mx-auto px-4 py-8">
              <div className="mb-6 flex items-center gap-4">
                <SidebarTrigger className="md:hidden">
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SidebarTrigger>
                <div className="flex-1">
                  <h1 className="mb-1 text-3xl font-black text-foreground">{t('products.title')}</h1>
                  <p className="text-sm text-muted-foreground">{t('products.subtitle')}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('products.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50"
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {filteredProducts.length} of {products.length} products
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {[1,2,3,4,5,6,7,8,9,10].map((i) => (
                    <div key={i} className="tech-card overflow-hidden">
                      <div className="aspect-square animate-pulse bg-muted" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                        <div className="h-4 animate-pulse rounded bg-muted w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="tech-card p-12 text-center">
                  <p className="text-lg text-muted-foreground">
                    {searchQuery || selectedCategories.length > 0 ? t('products.noMatch') : t('products.noProducts')}
                  </p>
                  {(searchQuery || selectedCategories.length > 0) && (
                    <Button onClick={handleResetFilters} className="mt-4">{t('products.clearFilters')}</Button>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  {/* Admin products (no store) */}
                  {adminProducts.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-primary">AbeniExpress Official</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{adminProducts.length} items</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {adminProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                      </div>
                    </section>
                  )}

                  {/* Seller store sections */}
                  {Object.values(groupedByStore).map(({ store, products: storeProducts }) => (
                    <section key={store.id}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--accent) / 0.1)', border: '1px solid hsl(var(--accent) / 0.2)' }}>
                          <Store className="h-4 w-4 text-accent" />
                          <span className="text-sm font-bold text-accent">{store.store_name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{storeProducts.length} items</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {storeProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                      </div>
                    </section>
                  ))}

                  {/* Products without store info (fallback) */}
                  {filteredProducts.filter(p => p.seller_id && !storeMap[p.seller_id]).length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-muted-foreground">Other Sellers</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filteredProducts.filter(p => p.seller_id && !storeMap[p.seller_id]).map((product) => <ProductCard key={product.id} product={product} />)}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Products;
