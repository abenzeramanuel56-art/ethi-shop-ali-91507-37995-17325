import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Ban, DollarSign, Clock, AlertTriangle } from "lucide-react";

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
}

interface SuspendedUser {
  id: string;
  user_id: string;
  reason: string;
  suspended_at: string;
  expires_at: string;
  is_active: boolean;
}

interface Warning {
  id: string;
  user_id: string;
  reason: string;
  warning_number: number;
  created_at: string;
  is_active: boolean;
}

export default function AdminPunishments() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUser[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");
  const [warningReason, setWarningReason] = useState("");
  const [deductAmount, setDeductAmount] = useState("");
  const [deductReason, setDeductReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchBannedUsers();
    fetchSuspendedUsers();
    fetchWarnings();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    
    setProfiles(data || []);
  };

  const fetchBannedUsers = async () => {
    const { data } = await supabase
      .from("user_bans")
      .select("*")
      .eq("is_active", true)
      .order("banned_at", { ascending: false });

    setBannedUsers(data || []);
  };

  const fetchSuspendedUsers = async () => {
    const { data } = await supabase
      .from("user_suspensions")
      .select("*")
      .eq("is_active", true)
      .order("suspended_at", { ascending: false });

    setSuspendedUsers(data || []);
  };

  const fetchWarnings = async () => {
    const { data } = await supabase
      .from("user_warnings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setWarnings(data || []);
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || "Unknown";
  };

  const handleBanUser = async () => {
    if (!selectedUserId || !banReason.trim()) {
      toast.error("Please select a user and provide a reason");
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
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUserId || !suspendReason.trim()) {
      toast.error("Please select a user and provide a reason");
      return;
    }

    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(suspendDays));

      const { error } = await supabase
        .from("user_suspensions")
        .insert({
          user_id: selectedUserId,
          suspended_by: (await supabase.auth.getUser()).data.user?.id,
          reason: suspendReason,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast.success("User suspended successfully");
      setSuspendReason("");
      setSuspendDays("7");
      setSelectedUserId("");
      fetchSuspendedUsers();
    } catch (error: any) {
      toast.error("Failed to suspend user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsuspendUser = async (suspensionId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_suspensions")
        .update({ is_active: false })
        .eq("id", suspensionId);

      if (error) throw error;

      toast.success("User unsuspended successfully");
      fetchSuspendedUsers();
    } catch (error: any) {
      toast.error("Failed to unsuspend user");
    } finally {
      setLoading(false);
    }
  };

  const handleWarnUser = async () => {
    if (!selectedUserId || !warningReason.trim()) {
      toast.error("Please select a user and provide a reason");
      return;
    }

    setLoading(true);
    try {
      // Get current warning count for user
      const { data: existingWarnings } = await supabase
        .from("user_warnings")
        .select("warning_number")
        .eq("user_id", selectedUserId)
        .eq("is_active", true)
        .order("warning_number", { ascending: false })
        .limit(1);

      const nextWarningNumber = (existingWarnings?.[0]?.warning_number || 0) + 1;

      const { error } = await supabase
        .from("user_warnings")
        .insert({
          user_id: selectedUserId,
          warned_by: (await supabase.auth.getUser()).data.user?.id,
          reason: warningReason,
          warning_number: nextWarningNumber
        });

      if (error) throw error;

      toast.success(`Warning #${nextWarningNumber} issued successfully`);
      setWarningReason("");
      setSelectedUserId("");
      fetchWarnings();
    } catch (error: any) {
      toast.error("Failed to warn user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWarning = async (warningId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_warnings")
        .update({ is_active: false })
        .eq("id", warningId);

      if (error) throw error;

      toast.success("Warning removed successfully");
      fetchWarnings();
    } catch (error: any) {
      toast.error("Failed to remove warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDeductFromWallet = async () => {
    if (!selectedUserId || !deductAmount || parseFloat(deductAmount) <= 0 || !deductReason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("deduct_from_wallet", {
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

      <Tabs defaultValue="ban" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ban">Ban</TabsTrigger>
          <TabsTrigger value="suspend">Suspend</TabsTrigger>
          <TabsTrigger value="warn">Warn</TabsTrigger>
          <TabsTrigger value="deduct">Deduct</TabsTrigger>
        </TabsList>

        <TabsContent value="ban" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Permanent Ban
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
                <Label>Reason *</Label>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason for banning..."
                  rows={3}
                />
              </div>

              <Button onClick={handleBanUser} disabled={loading} className="w-full" variant="destructive">
                <Ban className="h-4 w-4 mr-2" />
                Permanently Ban User
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currently Banned Users ({bannedUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {bannedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No banned users</p>
              ) : (
                <div className="space-y-3">
                  {bannedUsers.map((ban) => (
                    <div key={ban.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{getProfileName(ban.user_id)}</p>
                        <p className="text-sm text-muted-foreground">Reason: {ban.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Banned: {new Date(ban.banned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUnbanUser(ban.id)} disabled={loading}>
                        Unban
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Temporary Suspension
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
                <Label>Suspension Duration (days)</Label>
                <Select value={suspendDays} onValueChange={setSuspendDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSuspendUser} disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-700">
                <Clock className="h-4 w-4 mr-2" />
                Suspend User
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currently Suspended Users ({suspendedUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {suspendedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No suspended users</p>
              ) : (
                <div className="space-y-3">
                  {suspendedUsers.map((suspension) => (
                    <div key={suspension.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{getProfileName(suspension.user_id)}</p>
                        <p className="text-sm text-muted-foreground">Reason: {suspension.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(suspension.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUnsuspendUser(suspension.id)} disabled={loading}>
                        Unsuspend
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Issue Warning
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
                <Label>Reason *</Label>
                <Textarea
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Reason for warning..."
                  rows={3}
                />
              </div>

              <Button onClick={handleWarnUser} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Issue Warning
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Warnings ({warnings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {warnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No active warnings</p>
              ) : (
                <div className="space-y-3">
                  {warnings.map((warning) => (
                    <div key={warning.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{getProfileName(warning.user_id)}</p>
                          <Badge variant="outline">Warning #{warning.warning_number}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Reason: {warning.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued: {new Date(warning.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveWarning(warning.id)} disabled={loading}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deduct" className="space-y-4">
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
                <Label>Amount (ETB) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
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
        </TabsContent>
      </Tabs>
    </div>
  );
}