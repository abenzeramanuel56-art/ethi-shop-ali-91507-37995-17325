import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageOff, Loader2 } from "lucide-react";

interface SignedImageProps {
  // Either pass a stored "public" Supabase URL (we'll auto-detect bucket+path)
  // or pass bucket+path explicitly.
  url?: string | null;
  bucket?: string;
  path?: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  expiresIn?: number;
}

// Parse a Supabase storage URL like
//   https://xxx.supabase.co/storage/v1/object/public/<bucket>/<path...>
// or .../object/sign/<bucket>/<path...>?token=...
function parseStorageUrl(u: string): { bucket: string; path: string } | null {
  try {
    const m = u.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch { return null; }
}

export function SignedImage({ url, bucket, path, alt = "image", className, onClick, expiresIn = 300 }: SignedImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setLoading(true);
      setError(false);
      let b = bucket;
      let p = path;
      if ((!b || !p) && url) {
        const parsed = parseStorageUrl(url);
        if (parsed) { b = parsed.bucket; p = parsed.path; }
      }
      if (!b || !p) {
        // Fall back to raw URL (e.g. external)
        if (url) { setSrc(url); setLoading(false); return; }
        setError(true); setLoading(false); return;
      }
      const { data, error: e } = await supabase.storage.from(b).createSignedUrl(p, expiresIn);
      if (cancelled) return;
      if (e || !data?.signedUrl) {
        // Try plain public URL as last resort
        const pub = supabase.storage.from(b).getPublicUrl(p);
        setSrc(pub.data.publicUrl || null);
        setError(!pub.data.publicUrl);
      } else {
        setSrc(data.signedUrl);
      }
      setLoading(false);
    }
    resolve();
    return () => { cancelled = true; };
  }, [url, bucket, path, expiresIn]);

  if (loading) return <div className={`flex items-center justify-center bg-muted ${className || ""}`}><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (error || !src) return <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className || ""}`}><ImageOff className="h-6 w-6" /></div>;
  return <img src={src} alt={alt} className={className} onClick={onClick} />;
}

// Helper: open a stored URL in a new tab using a fresh signed URL.
export async function openSignedUrl(url: string | null | undefined) {
  if (!url) return;
  const parsed = parseStorageUrl(url);
  if (!parsed) { window.open(url, "_blank"); return; }
  const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 300);
  window.open(data?.signedUrl || url, "_blank");
}
