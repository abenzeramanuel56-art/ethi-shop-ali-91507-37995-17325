import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, FileQuestion, Loader2, RefreshCw } from "lucide-react";

interface AppRow {
  id: string;
  kind: "seller" | "driver";
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const statusMeta = (status: string) => {
  switch (status) {
    case "approved":
      return { icon: CheckCircle2, color: "text-green-500", label: "Approved" };
    case "rejected":
      return { icon: XCircle, color: "text-destructive", label: "Rejected" };
    default:
      return { icon: Clock, color: "text-yellow-500", label: "Pending review" };
  }
};

export default function ApplicationStatus() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?returnTo=/application-status"); return; }

    const [seller, driver] = await Promise.all([
      (supabase as any).from("seller_applications")
        .select("id,status,admin_notes,created_at,reviewed_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("driver_applications")
        .select("id,status,admin_notes,created_at,reviewed_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const rows: AppRow[] = [
      ...((seller.data || []) as any[]).map((r) => ({ ...r, kind: "seller" as const })),
      ...((driver.data || []) as any[]).map((r) => ({ ...r, kind: "driver" as const })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    setApps(rows);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">Application Status</h1>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : apps.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 py-10 text-center">
                <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">You haven't submitted any application yet.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={() => navigate("/apply-seller")}>Apply as Seller</Button>
                  <Button variant="outline" onClick={() => navigate("/apply-driver")}>Apply as Driver</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            apps.map((app) => {
              const meta = statusMeta(app.status);
              const Icon = meta.icon;
              return (
                <Card key={`${app.kind}-${app.id}`} className="card-3d">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg capitalize">{app.kind} Application</CardTitle>
                    <Badge variant="secondary" className="gap-1">
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      {meta.label}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Submitted: {new Date(app.created_at).toLocaleString()}</p>
                    {app.reviewed_at && <p>Reviewed: {new Date(app.reviewed_at).toLocaleString()}</p>}
                    {app.admin_notes && (
                      <p className="rounded-md bg-muted p-3 text-foreground">Admin note: {app.admin_notes}</p>
                    )}
                    {app.status === "approved" && (
                      <Button
                        className="mt-2"
                        onClick={() => navigate(app.kind === "seller" ? "/seller" : "/driver")}
                      >
                        Go to {app.kind === "seller" ? "Seller" : "Driver"} Dashboard
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>Back to home</Button>
        </div>
      </div>
    </div>
  );
}
