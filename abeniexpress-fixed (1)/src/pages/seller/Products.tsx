import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Plus, Trash2, Store, Upload } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_etb: number;
  image_url: string | null;
  category: string;
  stock_status: boolean;
  seller_id: string;
}

export default function SellerProducts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [storeHasLocation, setStoreHasLocation] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price_etb: "",
    category: "other"
  });

  const PLATFORM_FEE_PERCENT = 10;

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate("/auth");
      return;
    }

    const { data: store } = await (supabase as any)
      .from("seller_stores")
      .select("id, latitude, longitude")
      .eq("user_id", session.session.user.id)
      .maybeSingle();

    if (!store) {
      navigate("/seller/setup");
      return;
    }

    setStoreId(store.id);
    setStoreHasLocation(store.latitude != null && store.longitude != null);
    fetchMyProducts(store.id);
    setLoading(false);
  };

  const calculateProfit = (price: number) => {
    const platformFee = price * (PLATFORM_FEE_PERCENT / 100);
    return price - platformFee;
  };

  const fetchMyProducts = async (storeId: string) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", storeId)
      .order("created_at", { ascending: false });

    setMyProducts((data as Product[]) || []);
  };

  const handleAddProduct = async () => {
    if (!storeHasLocation) {
      toast.error("Please set your store location first in Store Settings");
      navigate("/seller/setup");
      return;
    }
    
    if (!newProduct.name || !newProduct.price_etb) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      let imageUrl = null;

      if (productImage) {
        const fileExt = productImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, productImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("products")
        .insert({
          name: newProduct.name,
          description: newProduct.description || null,
          price_etb: parseFloat(newProduct.price_etb),
          category: newProduct.category as any,
          stock_status: true,
          image_url: imageUrl,
          seller_id: storeId
        });

      if (error) throw error;

      toast.success("Product added successfully!");
      setShowAddForm(false);
      setNewProduct({ name: "", description: "", price_etb: "", category: "other" });
      setProductImage(null);
      fetchMyProducts(storeId);
    } catch (error) {
      toast.error("Failed to add product");
      console.error(error);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product removed");
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6" />
            <h1 className="text-3xl font-bold">My Products</h1>
          </div>
          <div className="flex items-center gap-2">
            {!storeHasLocation && (
              <Button variant="outline" onClick={() => navigate("/seller/setup")}>
                Set Store Location
              </Button>
            )}
            <Button onClick={() => setShowAddForm(true)} disabled={!storeHasLocation}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {!storeHasLocation && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">
                ⚠️ Store location is required before you can add products.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Please go to Store Settings and set your location for delivery pickup.
              </p>
              <Button className="mt-4" onClick={() => navigate("/seller/setup")}>
                Go to Store Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Product Name *</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Product description"
                  />
                </div>

                <div>
                  <Label>Price (ETB) *</Label>
                  <Input
                    type="number"
                    value={newProduct.price_etb}
                    onChange={(e) => setNewProduct({ ...newProduct, price_etb: e.target.value })}
                    placeholder="0.00"
                  />
                  {newProduct.price_etb && parseFloat(newProduct.price_etb) > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="text-muted-foreground">
                        Customer pays: <span className="font-bold text-foreground">{parseFloat(newProduct.price_etb).toFixed(2)} ETB</span>
                      </p>
                      <p className="text-muted-foreground">
                        Platform fee (10%): <span className="text-destructive">-{(parseFloat(newProduct.price_etb) * 0.1).toFixed(2)} ETB</span>
                      </p>
                      <p className="text-green-600 font-medium">
                        Your profit: {calculateProfit(parseFloat(newProduct.price_etb)).toFixed(2)} ETB
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={newProduct.category} onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
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

                <div>
                  <Label>Product Image</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    <input
                      type="file"
                      id="product-image"
                      accept="image/*"
                      onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="product-image" className="cursor-pointer flex items-center justify-center gap-2">
                      <Upload className="h-5 w-5" />
                      {productImage ? productImage.name : "Upload image"}
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddProduct}>Add Product</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Products ({myProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {myProducts.length === 0 ? (
              <p className="text-muted-foreground">No products added yet. Click "Add Product" to get started.</p>
            ) : (
              <div className="space-y-4">
                {myProducts.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4 items-start">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                          <div className="mt-1">
                            <p className="text-lg font-bold text-primary">
                              {product.price_etb} ETB
                            </p>
                            <p className="text-sm text-green-600">
                              Your profit: {calculateProfit(product.price_etb).toFixed(2)} ETB
                            </p>
                          </div>
                          <Badge className="mt-2">{product.category}</Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveProduct(product.id)}
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
