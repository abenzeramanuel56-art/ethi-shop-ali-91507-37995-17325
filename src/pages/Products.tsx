import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";

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
  const navigate = useNavigate();

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
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

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
    <div className="min-h-screen">
      <Navbar />
      
      {/* Header with gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-16 mb-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_hsl(173_80%_40%_/_0.1),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_hsl(280_65%_55%_/_0.1),_transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-8">
            <h1 className="mb-4 text-6xl font-bold">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Browse</span>
              {" "}Products
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover curated AliExpress products with Ethiopian Birr pricing
            </p>
          </div>

          {/* Enhanced search bar */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-2xl">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-full" />
              <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl shadow-glow border-2 border-primary/20">
                <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-primary" />
                <Input
                  type="text"
                  placeholder="Search for anything... (name, description, category)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 pr-6 py-7 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 animate-pulse bg-muted" />
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
              {searchQuery 
                ? `No products found matching "${searchQuery}"`
                : "No products available yet. Check back soon or request an item!"}
            </p>
          </Card>
        ) : (
           <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id} 
                className="group relative flex flex-col overflow-hidden border-2 shadow-soft hover:shadow-hover transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative h-64 overflow-hidden">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
                  
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="relative h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="relative flex h-full items-center justify-center text-muted-foreground">
                      <ShoppingCart className="h-16 w-16 opacity-20" />
                    </div>
                  )}
                  
                  {/* Category badge with gradient */}
                  <div className="absolute right-4 top-4">
                    <Badge className="gradient-accent shadow-lg border-0 text-white px-4 py-1.5 text-sm font-semibold">
                      {product.category}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="flex-grow relative z-10 pb-4">
                  <CardTitle className="line-clamp-2 text-xl mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-base leading-relaxed">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 pb-4">
                  <div className="inline-block">
                    <div className="text-4xl font-extrabold bg-gradient-primary bg-clip-text text-transparent mb-1">
                      {product.price_etb.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Ethiopian Birr</div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex gap-3 relative z-10 pt-0">
                  <Button 
                    className="flex-1 gap-2 shadow-glow hover:shadow-hover transition-all duration-300 font-semibold" 
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button 
                    className="flex-1 shadow-soft hover:shadow-glow transition-all duration-300 border-2 font-semibold" 
                    variant="outline"
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
    </div>
  );
};

export default Products;
