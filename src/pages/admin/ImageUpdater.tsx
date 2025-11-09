import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function ImageUpdater() {
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, updated: 0, failed: 0 });

  const updateProductImages = async () => {
    setUpdating(true);
    setProgress(0);
    setStats({ total: 0, updated: 0, failed: 0 });

    try {
      // Fetch products without images but with aliexpress URLs
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, aliexpress_url, image_url")
        .or("image_url.is.null,image_url.eq.https://placeholder.lovable.app/placeholder.svg")
        .not("aliexpress_url", "is", null)
        .limit(100); // Process 100 at a time

      if (error) throw error;
      if (!products || products.length === 0) {
        toast.info("No products need image updates");
        setUpdating(false);
        return;
      }

      setStats({ ...stats, total: products.length });

      let updated = 0;
      let failed = 0;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        try {
          console.log(`Fetching image for: ${product.name}`);
          
          // Call edge function to fetch image
          const { data: imageData, error: fetchError } = await supabase.functions.invoke(
            "fetch-aliexpress-image",
            {
              body: { aliexpressUrl: product.aliexpress_url },
            }
          );

          if (fetchError || !imageData?.imageUrl) {
            console.error(`Failed to fetch image for ${product.name}:`, fetchError);
            failed++;
          } else {
            // Update product with new image URL
            const { error: updateError } = await supabase
              .from("products")
              .update({ image_url: imageData.imageUrl })
              .eq("id", product.id);

            if (updateError) {
              console.error(`Failed to update ${product.name}:`, updateError);
              failed++;
            } else {
              updated++;
              console.log(`Updated image for: ${product.name}`);
            }
          }
        } catch (err) {
          console.error(`Error processing ${product.name}:`, err);
          failed++;
        }

        setProgress(((i + 1) / products.length) * 100);
        setStats({ total: products.length, updated, failed });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`Updated ${updated} products! ${failed} failed.`);
    } catch (error) {
      console.error("Error updating images:", error);
      toast.error("Failed to update product images");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Product Images from AliExpress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will fetch images from AliExpress URLs for products that don't have images yet.
        </p>

        {updating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress: {Math.round(progress)}%</span>
              <span>
                {stats.updated} updated, {stats.failed} failed of {stats.total}
              </span>
            </div>
          </div>
        )}

        <Button
          onClick={updateProductImages}
          disabled={updating}
          className="w-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
          {updating ? "Updating Images..." : "Update Product Images"}
        </Button>
      </CardContent>
    </Card>
  );
}
