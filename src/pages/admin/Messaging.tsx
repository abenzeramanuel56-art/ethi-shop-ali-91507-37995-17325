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
    // Fetch all profiles with their roles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    
    if (!profilesData) {
      setProfiles([]);
      return;
    }

    // Fetch roles for each user
    const profilesWithRoles = await Promise.all(
      profilesData.map(async (profile) => {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
          .single();
        
        const role = roleData?.role || "customer";
        return {
          ...profile,
          full_name: `${profile.full_name} (${role})`
        };
      })
    );
    
    setProfiles(profilesWithRoles);
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
      if (sendToAll) {
        // Call function to send to all users
        const { error } = await supabase.rpc("send_notification_to_all", {
          notification_title: title,
          notification_message: message,
          notification_type: messageType
        });

        if (error) throw error;
        toast.success("Message sent to all users!");
      } else {
        // Send to specific user
        const { error } = await supabase
          .from("notifications")
          .insert({
            user_id: selectedUserId,
            title,
            message,
            type: messageType
          });

        if (error) throw error;
        toast.success("Message sent!");
      }

      // Reset form
      setTitle("");
      setMessage("");
      setMessageType("info");
      setSelectedUserId("");
    } catch (error: any) {
      toast.error("Failed to send message");
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
