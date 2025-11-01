import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Plus, Trash2, Store } from "lucide-react";

interface Product {
  id: string;
  name: string;
  unique_product_code: string;
  price_etb: number;
  image_url: string;
  category: string;
}

interface ResellerProduct {
  id: string;
  product_id: string;
  reseller_price_etb: number;
  is_active: boolean;
  products: Product;
}

export default function ResellerProducts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [resellerPrice, setResellerPrice] = useState("");
  const [myProducts, setMyProducts] = useState<ResellerProduct[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate("/auth");
      return;
    }

    const { data: store } = await supabase
      .from("reseller_stores")
      .select("id")
      .eq("user_id", session.session.user.id)
      .maybeSingle();

    if (!store) {
      navigate("/reseller/setup");
      return;
    }

    setStoreId(store.id);
    fetchMyProducts(store.id);
    setLoading(false);
  };

  const fetchMyProducts = async (storeId: string) => {
    const { data } = await supabase
      .from("reseller_products")
      .select(`
        *,
        products (*)
      `)
      .eq("store_id", storeId);

    setMyProducts(data || []);
  };

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);
    setSelectedProduct(null);
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", category as any)
        .eq("stock_status", true);

      if (error) throw error;
      setCategoryProducts(data || []);
      
      if (data && data.length === 0) {
        toast.info("No products found in this category");
      }
    } catch (error) {
      toast.error("Failed to load products");
      setCategoryProducts([]);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product first");
      return;
    }

    if (!resellerPrice || parseFloat(resellerPrice) <= 0) {
      toast.error("Please enter a valid reseller price");
      return;
    }

    const resellerPriceNum = parseFloat(resellerPrice);
    if (resellerPriceNum <= selectedProduct.price_etb) {
      toast.error("Reseller price must be higher than the base price");
      return;
    }

    try {
      // Check if already added
      const { data: existing } = await supabase
        .from("reseller_products")
        .select("id")
        .eq("store_id", storeId)
        .eq("product_id", selectedProduct.id)
        .maybeSingle();

      if (existing) {
        toast.error("Product already added to your store");
        return;
      }

      // Add product
      const { error } = await supabase
        .from("reseller_products")
        .insert({
          store_id: storeId,
          product_id: selectedProduct.id,
          reseller_price_etb: resellerPriceNum
        });

      if (error) throw error;

      toast.success("Product added to your store!");
      setSelectedProduct(null);
      setSelectedCategory("");
      setCategoryProducts([]);
      setResellerPrice("");
      fetchMyProducts(storeId);
    } catch (error) {
      toast.error("Failed to add product");
      console.error(error);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from("reseller_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product removed from your store");
      fetchMyProducts(storeId);
    } catch (error) {
      toast.error("Failed to remove product");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Store className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Manage Products</h1>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Product by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Select Category</Label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="home">Home & Garden</SelectItem>
                    <SelectItem value="beauty">Beauty & Health</SelectItem>
                    <SelectItem value="sports">Sports & Outdoors</SelectItem>
                    <SelectItem value="toys">Toys & Games</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {categoryProducts.length > 0 && (
                <div>
                  <Label>Select Product</Label>
                  <Select 
                    value={selectedProduct?.id || ""} 
                    onValueChange={(id) => {
                      const product = categoryProducts.find(p => p.id === id);
                      setSelectedProduct(product || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {product.price_etb.toFixed(2)} ETB
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProduct && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    {selectedProduct.image_url && (
                      <img
                        src={selectedProduct.image_url}
                        alt={selectedProduct.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedProduct.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Base Price: {selectedProduct.price_etb.toFixed(2)} ETB
                      </p>
                      <Badge>{selectedProduct.category}</Badge>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="resellerPrice">Your Selling Price (ETB) *</Label>
                    <Input
                      id="resellerPrice"
                      type="number"
                      step="0.01"
                      value={resellerPrice}
                      onChange={(e) => setResellerPrice(e.target.value)}
                      placeholder="Enter your price"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must be higher than base price
                    </p>
                  </div>

                  <Button onClick={handleAddProduct} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to My Store
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Products ({myProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {myProducts.length === 0 ? (
              <p className="text-muted-foreground">No products added yet</p>
            ) : (
              <div className="space-y-4">
                {myProducts.map((rp) => (
                  <Card key={rp.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4 items-start">
                        {rp.products.image_url && (
                          <img
                            src={rp.products.image_url}
                            alt={rp.products.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{rp.products.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code: {rp.products.unique_product_code}
                          </p>
                          <p className="text-sm">
                            Base: {rp.products.price_etb} ETB | 
                            Your Price: {rp.reseller_price_etb} ETB | 
                            Profit: {(rp.reseller_price_etb - rp.products.price_etb).toFixed(2)} ETB
                          </p>
                          <Badge variant={rp.is_active ? "default" : "secondary"} className="mt-2">
                            {rp.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveProduct(rp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
