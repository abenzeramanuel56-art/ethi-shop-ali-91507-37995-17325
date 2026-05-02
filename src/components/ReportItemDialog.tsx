import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flag } from "lucide-react";

interface ReportItemDialogProps {
  itemId: string;
  itemName: string;
  reportType: "product" | "digital_product";
  storeId?: string;
  triggerLabel?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost";
}

export default function ReportItemDialog({ itemId, itemName, reportType, storeId, triggerLabel = "Report", size = "sm", variant = "outline" }: ReportItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason) { toast.error("Please select a reason"); return; }
    if (!description.trim()) { toast.error("Please provide details"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please login to report"); return; }
      const payload: any = {
        reporter_id: session.user.id,
        reason,
        description,
        report_type: reportType,
        store_id: storeId || null,
      };
      if (reportType === "product") payload.product_id = itemId;
      else payload.digital_product_id = itemId;

      const { error } = await (supabase as any).from("store_reports").insert(payload);
      if (error) throw error;
      toast.success("Report submitted. An admin will review it.");
      setOpen(false); setReason(""); setDescription("");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit report");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} title={`Report ${itemName}`} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Flag className="h-4 w-4" /> {triggerLabel ? <span className="ml-1">{triggerLabel}</span> : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report {itemName}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scam">Scam / Fraud</SelectItem>
                <SelectItem value="fake">Fake or Misleading</SelectItem>
                <SelectItem value="copyright">Copyright Violation</SelectItem>
                <SelectItem value="malicious">Malicious / Virus</SelectItem>
                <SelectItem value="not_as_described">Not as described</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Details *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Tell admins what's wrong..." />
          </div>
          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
