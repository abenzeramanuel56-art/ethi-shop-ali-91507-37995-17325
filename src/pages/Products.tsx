import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProductFilters } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface Product {
  id: string;
  name: string;
  description: string;
  price_etb: number;
  image_url: string;
  category: string;
  stock_status: boolean;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
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
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = products.filter((product) => {
      // Search filter
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);

      // Price range filter
      const matchesPrice =
        product.price_etb >= priceRange[0] && product.price_etb <= priceRange[1];

      // Free shipping filter (all products have free shipping in this case)
      const matchesFreeShipping = !freeShipping || true;

      return matchesSearch && matchesCategory && matchesPrice && matchesFreeShipping;
    });

    setFilteredProducts(filtered);
  }, [searchQuery, products, selectedCategories, priceRange, freeShipping]);

  useEffect(() => {
    if (products.length > 0) {
      setPriceRange([0, maxPrice]);
    }
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
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = (product: Product) => {
    handleAddToCart(product);
    navigate("/cart");
  };

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
            <div className="container mx-auto px-4 py-12">
              <div className="mb-8 flex items-center gap-4">
                <SidebarTrigger className="md:hidden">
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SidebarTrigger>
                <div className="flex-1">
                  <h1 className="mb-2 text-4xl font-bold text-foreground">Browse Products</h1>
                  <p className="text-lg text-muted-foreground">
                    Curated selection of popular AliExpress products
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {products.length} products
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="aspect-square animate-pulse bg-muted" />
                      <CardHeader>
                        <div className="h-6 animate-pulse rounded bg-muted" />
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-lg text-muted-foreground">
                    {searchQuery || selectedCategories.length > 0
                      ? "No products found matching your filters"
                      : "No products available yet. Check back soon!"}
                  </p>
                  {(searchQuery || selectedCategories.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                    <Button onClick={handleResetFilters} className="mt-4">
                      Clear Filters
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="group flex flex-col overflow-hidden border-0 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                      <div className="relative aspect-square overflow-hidden bg-accent/30">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                        <Badge className="absolute left-2 top-2 bg-sale-red text-white border-0 shadow-md">
                          Hot Deal
                        </Badge>
                      </div>
                      
                      <CardHeader className="flex-grow p-3">
                        <CardTitle className="line-clamp-2 text-sm font-medium">{product.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="p-3 pt-0">
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl font-bold text-primary">
                            {product.price_etb.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">ETB</div>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-success">
                          <span className="font-medium">Free Shipping</span>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="flex gap-2 p-3 pt-0">
                        <Button 
                          className="flex-1 h-9 text-xs gap-1" 
                          onClick={() => handleAddToCart(product)}
                          variant="outline"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          Cart
                        </Button>
                        <Button 
                          className="flex-1 h-9 text-xs font-bold" 
                          onClick={() => handleBuyNow(product)}
                        >
                          Buy Now
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
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
