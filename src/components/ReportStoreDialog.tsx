import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flag } from "lucide-react";

interface ReportStoreDialogProps {
  storeId: string;
  storeName: string;
}

export default function ReportStoreDialog({ storeId, storeName }: ReportStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide details");
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Please login to report");
        return;
      }

      const { error } = await supabase
        .from("store_reports")
        .insert({
          store_id: storeId,
          reporter_id: session.session.user.id,
          reason,
          description
        });

      if (error) throw error;

      toast.success("Report submitted successfully");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (error: any) {
      toast.error("Failed to submit report");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="h-4 w-4 mr-2" />
          Report Store
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {storeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scam">Scam / Fraud</SelectItem>
                <SelectItem value="fake_products">Fake Products</SelectItem>
                <SelectItem value="not_delivered">Items Not Delivered</SelectItem>
                <SelectItem value="poor_quality">Poor Quality</SelectItem>
                <SelectItem value="bad_service">Bad Customer Service</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Details *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about your complaint..."
              rows={5}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
