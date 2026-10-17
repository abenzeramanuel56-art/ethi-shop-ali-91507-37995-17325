import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, FileCode, FileText, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function SellerDigitalProducts() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<"code" | "file">("code");
  const [category, setCategory] = useState<string>("apps");
  const [price, setPrice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setUser(session.user);
    await loadProducts(session.user.id);
    setLoading(false);
  };

  const loadProducts = async (uid: string) => {
    const { data } = await (supabase as any).from("digital_products").select("*").eq("seller_id", uid).order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose a file"); return; }
    if (file.size > MAX_SIZE) { toast.error("File too large (max 50MB)"); return; }
    if (!title.trim() || !description.trim() || !price) { toast.error("Fill all fields"); return; }
    if (description.trim().length < 30) { toast.error("Description must be at least 30 characters"); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("digital-products").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("digital-products").getPublicUrl(path);

      const { data: inserted, error: insErr } = await (supabase as any).from("digital_products").insert({
        seller_id: user.id,
        title: title.trim(),
        description: description.trim(),
        product_type: productType,
        category,
        file_url: pub.publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        price_etb: parseFloat(price),
        preview_url: previewUrl.trim() || null,
      }).select().single();

      if (insErr) throw insErr;

      // Trigger AI verification (fire & forget — toast on completion)
      toast.success("Uploaded! Abeni Express AI is verifying your product...");
      const { error: fnErr } = await supabase.functions.invoke("verify-digital-product", { body: { productId: inserted.id } });
      if (fnErr) {
        console.error("verify error", fnErr);
        toast.warning("Uploaded but verification is pending review.");
      }

      setTitle(""); setDescription(""); setPrice(""); setPreviewUrl(""); setFile(null); setShowForm(false);
      await loadProducts(user.id);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this digital product?")) return;
    await (supabase as any).from("digital_products").delete().eq("id", id);
    await loadProducts(user.id);
    toast.success("Deleted");
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">Digital Products</h1>
            <p className="text-sm text-muted-foreground mt-1">Sell apps, code, files. Abeni Express AI deeply inspects every upload.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="btn-glow">
            <Upload className="h-4 w-4 mr-2" /> {showForm ? "Cancel" : "Upload New"}
          </Button>
        </div>

        {showForm && (
          <Card className="tech-card mb-6">
            <CardHeader><CardTitle>New Digital Product</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
                </div>
                <div>
                  <Label>Description (min 30 chars) *</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} required placeholder="Describe what your code/file does. Abeni Express AI reads the file in detail and compares it with this description." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="apps">📱 Apps</option>
                      <option value="websites">🌐 Websites</option>
                      <option value="courses">🎓 Courses</option>
                      <option value="videos">🎬 Videos</option>
                      <option value="documents">📄 Documents</option>
                    </select>
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={productType} onChange={(e) => setProductType(e.target.value as any)}>
                      <option value="code">Code (.js, .py, .html, .zip etc.)</option>
                      <option value="file">File (PDF, doc, image, video, etc.)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Price (ETB) *</Label>
                    <Input type="number" min="1" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label>App / Website preview link (optional)</Label>
                  <Input type="url" placeholder="https://your-demo.com or Play Store link" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} maxLength={500} />
                  <p className="text-xs text-muted-foreground mt-1">Buyers can open this to try your app or site before buying.</p>
                </div>
                <div>
                  <Label>File (max 50MB) *</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                  {file && <p className="text-xs text-muted-foreground mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                </div>
                <Button type="submit" disabled={uploading} className="w-full btn-glow">
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : "Upload & Verify with Abeni Express AI"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No digital products yet.</div>
          ) : products.map((p) => (
            <Card key={p.id} className="tech-card">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {p.product_type === "code" ? <FileCode className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{p.title}</h3>
                    {p.ai_verification_status === "approved" && <Badge variant="outline" className="text-success border-success/50"><CheckCircle2 className="h-3 w-3 mr-1" />Live</Badge>}
                    {p.ai_verification_status === "pending" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Verifying</Badge>}
                    {p.ai_verification_status === "rejected" && <Badge variant="outline" className="text-destructive border-destructive/50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                  {p.preview_url && <a href={p.preview_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block mt-1">Preview link</a>}
                  {p.ai_verification_notes && <p className="text-xs italic text-muted-foreground mt-1">{p.ai_verification_notes}</p>}
                  <div className="text-sm font-bold text-primary mt-2">{Number(p.price_etb).toLocaleString()} ETB</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
