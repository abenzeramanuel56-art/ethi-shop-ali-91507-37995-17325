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
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-5xl font-bold text-foreground">Browse Products</h1>
          <p className="text-xl text-muted-foreground">
            Curated selection of popular AliExpress products
          </p>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 text-lg shadow-soft focus:shadow-glow transition-all"
            />
          </div>
        </div>

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
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group flex flex-col overflow-hidden shadow-soft hover:shadow-glow transition-all hover:-translate-y-1">
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  <Badge className="absolute right-3 top-3 shadow-lg" variant="secondary">
                    {product.category}
                  </Badge>
                </div>
                
                <CardHeader className="flex-grow">
                  <CardTitle className="line-clamp-2 text-lg">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-3 text-sm">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {product.price_etb.toLocaleString()} ETB
                  </div>
                </CardContent>
                
                <CardFooter className="flex gap-2">
                  <Button 
                    className="w-1/2 gap-2 shadow-sm hover:shadow-md transition-all" 
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add
                  </Button>
                  <Button 
                    className="w-1/2 shadow-sm hover:shadow-md transition-all" 
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
