import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  productId: string;
  bucketName?: string;
  onUploaded?: (publicUrl: string) => void;
}

export default function ProductImageUploader({ productId, bucketName = "product-images", onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    setError(null);
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const filename = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      // get public URL (works if bucket is public)
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filename) as any;
      const publicUrl = publicData?.publicUrl || publicData?.public_url || publicData?.publicURL;

      // call callback with publicUrl or storage path
      if (onUploaded) onUploaded(publicUrl || filename);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="text-xs text-muted-foreground">Update image</label>
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
      />
      {uploading && <div className="text-xs text-muted-foreground">Uploading...</div>}
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}
