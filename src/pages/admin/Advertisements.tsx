import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";

interface Advertisement {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  quiz_difficulty: string;
  display_duration_seconds: number;
  time_gap_minutes: number;
  is_active: boolean;
  display_order: number;
  trigger_type?: string;
  trigger_path?: string | null;
}

export default function AdminAdvertisements() {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [quizDifficulty, setQuizDifficulty] = useState("simple");
  const [displayDuration, setDisplayDuration] = useState("15");
  const [timeGap, setTimeGap] = useState("30");
  const [triggerType, setTriggerType] = useState("on_interval");
  const [triggerPath, setTriggerPath] = useState("/digital-market");


  useEffect(() => {
    fetchAdvertisements();
  }, []);

  const fetchAdvertisements = async () => {
    const { data } = await supabase
      .from("advertisements")
      .select("*")
      .order("display_order", { ascending: true });
    
    setAdvertisements(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error("Please upload an image or video file");
        return;
      }
      
      setMediaType(isVideo ? 'video' : 'image');
      setMediaFile(file);
    }
  };

  const handleCreateAd = async () => {
    if (!title.trim() || !mediaFile) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload media file
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `ad-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      // Get next display order
      const maxOrder = advertisements.length > 0 
        ? Math.max(...advertisements.map(a => a.display_order)) + 1 
        : 0;

      // Create advertisement
      const { error } = await supabase
        .from("advertisements")
        .insert({
          title,
          media_url: publicUrl,
          media_type: mediaType,
          quiz_difficulty: quizDifficulty,
          display_duration_seconds: parseInt(displayDuration),
          time_gap_minutes: parseInt(timeGap),
          display_order: maxOrder,
          created_by: user.id
        });

      if (error) throw error;

      toast.success("Advertisement created successfully");
      setTitle("");
      setMediaFile(null);
      setQuizDifficulty("simple");
      setDisplayDuration("15");
      setTimeGap("30");
      fetchAdvertisements();
    } catch (error: any) {
      toast.error("Failed to create advertisement: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("advertisements")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update advertisement");
      return;
    }

    fetchAdvertisements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;

    const { error } = await supabase
      .from("advertisements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete advertisement");
      return;
    }

    toast.success("Advertisement deleted");
    fetchAdvertisements();
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = advertisements.findIndex(a => a.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= advertisements.length) return;

    const current = advertisements[currentIndex];
    const target = advertisements[newIndex];

    await Promise.all([
      supabase.from("advertisements").update({ display_order: target.display_order }).eq("id", current.id),
      supabase.from("advertisements").update({ display_order: current.display_order }).eq("id", target.id)
    ]);

    fetchAdvertisements();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Advertisements</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Advertisement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Advertisement title"
              />
            </div>

            <div className="space-y-2">
              <Label>Media (Image/Video) *</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  id="ad-media"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="ad-media" className="cursor-pointer flex items-center gap-2 justify-center">
                  <Upload className="h-5 w-5" />
                  {mediaFile ? mediaFile.name : "Choose image or video"}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quiz Difficulty (to close ad)</Label>
              <Select value={quizDifficulty} onValueChange={setQuizDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Quiz</SelectItem>
                  <SelectItem value="simple">Simple (e.g., 2+3)</SelectItem>
                  <SelectItem value="medium">Medium (e.g., 12+15)</SelectItem>
                  <SelectItem value="hard">Hard (e.g., 23×4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Display Duration (seconds)</Label>
              <Input
                type="number"
                value={displayDuration}
                onChange={(e) => setDisplayDuration(e.target.value)}
                min="5"
                max="120"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Gap Between Shows (minutes)</Label>
              <Input
                type="number"
                value={timeGap}
                onChange={(e) => setTimeGap(e.target.value)}
                min="1"
                max="1440"
              />
            </div>
          </div>

          <Button onClick={handleCreateAd} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Advertisement
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Advertisements</CardTitle>
        </CardHeader>
        <CardContent>
          {advertisements.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No advertisements yet</p>
          ) : (
            <div className="space-y-4">
              {advertisements.map((ad, index) => (
                <div key={ad.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(ad.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(ad.id, 'down')}
                      disabled={index === advertisements.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    {ad.media_type === 'video' ? (
                      <video src={ad.media_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">{ad.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ad.media_type === 'video' ? 'Video' : 'Image'} • {ad.display_duration_seconds}s • Every {ad.time_gap_minutes}min • Quiz: {ad.quiz_difficulty}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${ad.id}`} className="text-sm">Active</Label>
                      <Switch
                        id={`active-${ad.id}`}
                        checked={ad.is_active}
                        onCheckedChange={(checked) => handleToggleActive(ad.id, checked)}
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(ad.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}