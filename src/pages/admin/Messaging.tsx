import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, Users } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
}

export default function AdminMessaging() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "warning" | "success">("info");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    // Fetch all profiles and roles in parallel to avoid N+1 queries
    const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase.from("user_roles").select("user_id, role")
    ]);

    if (!profilesData) {
      setProfiles([]);
      return;
    }

    const roleMap = new Map<string, string[]>();
    (rolesData || []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) || [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    const pickRole = (roles: string[] | undefined) => {
      if (!roles || roles.length === 0) return "customer";
      if (roles.includes("admin")) return "admin";
      if (roles.includes("moderator")) return "moderator";
      if (roles.includes("reseller")) return "reseller";
      return roles[0] || "customer";
    };

    const withRoles = profilesData.map((p: any) => {
      const role = pickRole(roleMap.get(p.id));
      return { ...p, full_name: `${p.full_name} (${role})` } as Profile;
    });

    setProfiles(withRoles);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `broadcast/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, imageFile);
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSendMessage = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    if (!sendToAll && !selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setLoading(true);

    try {
      const image_url = await uploadImage();

      const { data, error } = await supabase.functions.invoke("dispatch-notification", {
        body: sendToAll
          ? { broadcast: true, title, body: message, type: messageType, image_url }
          : { user_id: selectedUserId, title, body: message, type: messageType, image_url },
      });
      if (error) throw error;
      toast.success(sendToAll ? `Message sent to ${(data as any)?.sent ?? "all"} users!` : "Message sent!");

      // Reset form
      setTitle("");
      setMessage("");
      setMessageType("info");
      setSelectedUserId("");
      setImageFile(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to send message");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Send Messages</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Send To</Label>
              <div className="flex gap-4">
                <Button
                  variant={sendToAll ? "default" : "outline"}
                  onClick={() => setSendToAll(true)}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Everyone
                </Button>
                <Button
                  variant={!sendToAll ? "default" : "outline"}
                  onClick={() => setSendToAll(false)}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Individual User
                </Button>
              </div>
            </div>

            {!sendToAll && (
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Message title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
              />
            </div>

            <Button onClick={handleSendMessage} disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
