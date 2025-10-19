import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Ban, DollarSign } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  banned_at: string;
  is_active: boolean;
  profiles: {
    full_name: string;
  };
}

export default function AdminPunishments() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [deductAmount, setDeductAmount] = useState("");
  const [deductReason, setDeductReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchBannedUsers();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    
    setProfiles(data || []);
  };

  const fetchBannedUsers = async () => {
    const { data: bansData } = await supabase
      .from("user_bans")
      .select("*")
      .eq("is_active", true)
      .order("banned_at", { ascending: false });

    if (!bansData) return;

    const bansWithProfiles = await Promise.all(
      bansData.map(async (ban) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", ban.user_id)
          .single();

        return {
          ...ban,
          profiles: profile || { full_name: "Unknown" }
        };
      })
    );

    setBannedUsers(bansWithProfiles as any);
  };

  const handleBanUser = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    if (!banReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("user_bans")
        .insert({
          user_id: selectedUserId,
          banned_by: (await supabase.auth.getUser()).data.user?.id,
          reason: banReason
        });

      if (error) throw error;

      toast.success("User banned successfully");
      setBanReason("");
      setSelectedUserId("");
      fetchBannedUsers();
    } catch (error: any) {
      toast.error("Failed to ban user: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async (banId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("user_bans")
        .update({ is_active: false })
        .eq("id", banId);

      if (error) throw error;

      toast.success("User unbanned successfully");
      fetchBannedUsers();
    } catch (error: any) {
      toast.error("Failed to unban user");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeductFromWallet = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    if (!deductAmount || parseFloat(deductAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!deductReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("deduct_from_wallet", {
        target_user_id: selectedUserId,
        deduction_amount: parseFloat(deductAmount),
        deduction_reason: deductReason
      });

      if (error) throw error;

      toast.success("Amount deducted successfully");
      setDeductAmount("");
      setDeductReason("");
      setSelectedUserId("");
    } catch (error: any) {
      toast.error("Failed to deduct: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-6 w-6" />
        <h2 className="text-2xl font-bold">User Punishments</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Ban User Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="banReason">Reason *</Label>
              <Textarea
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for banning..."
                rows={3}
              />
            </div>

            <Button onClick={handleBanUser} disabled={loading} className="w-full" variant="destructive">
              <Ban className="h-4 w-4 mr-2" />
              Ban User
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Deduct from Reseller Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Reseller</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reseller" />
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

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ETB) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductReason">Reason *</Label>
              <Textarea
                id="deductReason"
                value={deductReason}
                onChange={(e) => setDeductReason(e.target.value)}
                placeholder="Reason for deduction..."
                rows={3}
              />
            </div>

            <Button onClick={handleDeductFromWallet} disabled={loading} className="w-full" variant="destructive">
              <DollarSign className="h-4 w-4 mr-2" />
              Deduct Amount
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currently Banned Users</CardTitle>
        </CardHeader>
        <CardContent>
          {bannedUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No banned users</p>
          ) : (
            <div className="space-y-3">
              {bannedUsers.map((ban) => (
                <div key={ban.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{ban.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">Reason: {ban.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Banned: {new Date(ban.banned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnbanUser(ban.id)}
                    disabled={loading}
                  >
                    Unban
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
