import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Check, X } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_etb: number;
  payment_method: string;
  account_detail_1: string;
  account_detail_2: string;
  status: string;
  created_at: string;
  admin_notes: string;
  profiles: {
    full_name: string;
  };
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (withdrawal) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", withdrawal.user_id)
            .single();

          return {
            ...withdrawal,
            profiles: profileData || { full_name: "Unknown User" }
          };
        })
      );

      setWithdrawals(withdrawalsWithProfiles as any);
    } catch (error: any) {
      toast.error("Failed to load withdrawals");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (withdrawalId: string) => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    try {
      const withdrawal = withdrawals.find(w => w.id === withdrawalId);
      
      // Update withdrawal status
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString()
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      // If approved or paid, update wallet balance
      if ((newStatus === 'approved' || newStatus === 'paid') && withdrawal) {
        // Get current balance first
        const { data: walletData } = await (supabase as any)
          .from("seller_wallets")
          .select("current_balance_etb")
          .eq("user_id", withdrawal.user_id)
          .single();

        if (walletData) {
          const { error: walletError } = await (supabase as any)
            .from("seller_wallets")
            .update({
              current_balance_etb: walletData.current_balance_etb - withdrawal.amount_etb
            })
            .eq("user_id", withdrawal.user_id);

          if (walletError) throw walletError;
        }
      }

      // Email the seller about the status change
      if (withdrawal && (newStatus === 'paid' || newStatus === 'approved' || newStatus === 'rejected')) {
        const subject = newStatus === 'paid'
          ? `Payout sent: ${withdrawal.amount_etb} ETB`
          : newStatus === 'approved'
          ? `Payout approved: ${withdrawal.amount_etb} ETB`
          : `Payout request rejected`;
        const message = newStatus === 'paid'
          ? `<p>Your withdrawal of <strong>${withdrawal.amount_etb} ETB</strong> has been <strong>paid</strong> via ${withdrawal.payment_method}.</p>${adminNotes ? `<p><strong>Note:</strong> ${adminNotes}</p>` : ""}<p>Funds should arrive shortly.</p>`
          : newStatus === 'approved'
          ? `<p>Your withdrawal request of <strong>${withdrawal.amount_etb} ETB</strong> has been approved and is queued for payout.</p>`
          : `<p>Your withdrawal request was rejected.</p>${adminNotes ? `<p><strong>Reason:</strong> ${adminNotes}</p>` : ""}`;

        await supabase.functions.invoke("send-user-email", {
          body: { userId: withdrawal.user_id, subject, heading: subject, message },
        });
      }

      toast.success("Withdrawal updated successfully");
      setEditingId(null);
      setNewStatus("");
      setAdminNotes("");
      await fetchWithdrawals();
    } catch (error: any) {
      toast.error("Failed to update withdrawal");
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning text-warning-foreground";
      case "approved": return "bg-info text-info-foreground";
      case "paid": return "bg-success text-success-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading withdrawals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Download className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Withdrawal Requests</h2>
      </div>

      {withdrawals.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No withdrawal requests</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {withdrawal.profiles?.full_name || "Unknown User"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Requested: {new Date(withdrawal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(withdrawal.status)}>
                    {withdrawal.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {withdrawal.amount_etb.toFixed(2)} ETB
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Payment Method: <span className="font-medium">{withdrawal.payment_method.toUpperCase()}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Account Details:</p>
                      <p className="text-sm text-muted-foreground">
                        {withdrawal.payment_method === 'telebirr' ? 'Phone: ' : 'Account Name: '}
                        {withdrawal.account_detail_1}
                      </p>
                      {withdrawal.account_detail_2 && (
                        <p className="text-sm text-muted-foreground">
                          Account Number: {withdrawal.account_detail_2}
                        </p>
                      )}
                    </div>
                  </div>

                  {withdrawal.admin_notes && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm font-semibold">Admin Notes:</p>
                      <p className="text-sm text-muted-foreground">{withdrawal.admin_notes}</p>
                    </div>
                  )}

                  {withdrawal.status === "pending" && editingId === withdrawal.id ? (
                    <div className="space-y-3 border-t pt-4">
                      <div className="space-y-2">
                        <Label>Update Status</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Admin Notes (Optional)</Label>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateStatus(withdrawal.id)} size="sm">
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : withdrawal.status === "pending" ? (
                    <Button onClick={() => setEditingId(withdrawal.id)} size="sm">
                      Process Request
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
