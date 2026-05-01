import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flag, ExternalLink } from "lucide-react";

interface StoreReport {
  id: string;
  store_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reseller_stores: {
    store_name: string;
    store_slug: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function AdminReports() {
  const [reports, setReports] = useState<StoreReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: reportsData, error } = await (supabase as any)
        .from("store_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reportsWithDetails = await Promise.all(
        (reportsData || []).map(async (report: any) => {
          const [storeData, profileData, productData, digitalData] = await Promise.all([
            report.store_id ? (supabase as any).from("seller_stores").select("store_name, store_slug").eq("id", report.store_id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from("profiles").select("full_name").eq("id", report.reporter_id).maybeSingle(),
            report.product_id ? (supabase as any).from("products").select("name").eq("id", report.product_id).maybeSingle() : Promise.resolve({ data: null }),
            report.digital_product_id ? (supabase as any).from("digital_products").select("title").eq("id", report.digital_product_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);

          return {
            ...report,
            reseller_stores: storeData.data || { store_name: report.product_id ? "(Product report)" : report.digital_product_id ? "(Digital product report)" : "Unknown", store_slug: "" },
            profiles: profileData.data || { full_name: "Unknown" },
            product_name: productData?.data?.name || null,
            digital_product_title: digitalData?.data?.title || null,
          };
        })
      );

      setReports(reportsWithDetails as any);
    } catch (error: any) {
      toast.error("Failed to load reports");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string, adminNotes?: string) => {
    setUpdatingId(reportId);
    try {
      const { error } = await supabase
        .from("store_reports")
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Report updated");
      fetchReports();
    } catch (error: any) {
      toast.error("Failed to update report");
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Flag className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Store Reports</h2>
      </div>

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No reports submitted yet</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {report.reseller_stores?.store_name}
                      <Badge variant={
                        report.status === 'resolved' ? 'default' :
                        report.status === 'reviewed' ? 'secondary' : 'outline'
                      }>
                        {report.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reported by: {report.profiles?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/store/${report.reseller_stores?.store_slug}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Store
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold">Reason</Label>
                  <p className="text-sm">{report.reason}</p>
                </div>

                <div>
                  <Label className="font-semibold">Details</Label>
                  <p className="text-sm">{report.description}</p>
                </div>

                {report.admin_notes && (
                  <div>
                    <Label className="font-semibold">Admin Notes</Label>
                    <p className="text-sm text-muted-foreground">{report.admin_notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Select
                    value={report.status}
                    onValueChange={(status) => updateReportStatus(report.id, status)}
                    disabled={updatingId === report.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
