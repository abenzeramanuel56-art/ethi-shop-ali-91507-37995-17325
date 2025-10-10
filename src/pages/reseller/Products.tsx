import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  unique_product_code: string;
  price_etb: number;
  image_url: string;
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
  const { toast } = useToast();
  const [storeId, setStoreId] = useState<string>("");
  const [searchUPC, setSearchUPC] = useState("");
  const [searchedProduct, setSearchedProduct] = useState<Product | null>(null);
  const [resellerPrice, setResellerPrice] = useState("");
  const [myProducts, setMyProducts] = useState<ResellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: store } = await supabase
      .from("reseller_stores")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!store) {
      navigate("/reseller/setup");
      return;
    }

    setStoreId(store.id);
    await fetchMyProducts(store.id);
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

  const handleSearchProduct = async () => {
    if (!searchUPC.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product code",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("unique_product_code", searchUPC.toUpperCase())
      .single();

    if (error || !data) {
      toast({
        title: "Not Found",
        description: "No product found with this code",
        variant: "destructive"
      });
      setSearchedProduct(null);
      return;
    }

    setSearchedProduct(data);
    setResellerPrice(data.price_etb.toString());
  };

  const handleAddProduct = async () => {
    if (!searchedProduct) return;

    const priceNum = parseFloat(resellerPrice);
    if (priceNum < searchedProduct.price_etb) {
      toast({
        title: "Error",
        description: "Your price must be >= admin base price",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("reseller_products")
      .insert({
        store_id: storeId,
        product_id: searchedProduct.id,
        reseller_price_etb: priceNum,
        is_active: true
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Product added to your store"
    });

    setSearchedProduct(null);
    setSearchUPC("");
    setResellerPrice("");
    await fetchMyProducts(storeId);
  };

  const handleRemoveProduct = async (productId: string) => {
    const { error } = await supabase
      .from("reseller_products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Product removed from your store"
    });

    await fetchMyProducts(storeId);
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
        <h1 className="text-3xl font-bold mb-8">Manage Products</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Product by UPC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Product Code (e.g., AX-12345)"
                  value={searchUPC}
                  onChange={(e) => setSearchUPC(e.target.value)}
                />
                <Button onClick={handleSearchProduct}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {searchedProduct && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {searchedProduct.image_url && (
                        <img
                          src={searchedProduct.image_url}
                          alt={searchedProduct.name}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{searchedProduct.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Code: {searchedProduct.unique_product_code}
                        </p>
                        <p className="text-sm">
                          Base Price: {searchedProduct.price_etb} ETB
                        </p>
                        <div className="mt-2">
                          <Label htmlFor="resellerPrice">Your Price (ETB) *</Label>
                          <Input
                            id="resellerPrice"
                            type="number"
                            step="0.01"
                            value={resellerPrice}
                            onChange={(e) => setResellerPrice(e.target.value)}
                            placeholder={searchedProduct.price_etb.toString()}
                          />
                        </div>
                        <Button onClick={handleAddProduct} className="mt-2">
                          Add to My Store
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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