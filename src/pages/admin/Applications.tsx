import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Store } from "lucide-react";

interface Application {
  id: string;
  full_name: string;
  uid: string;
  age: number;
  phone: string;
  id_photo_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
}

export default function AdminApplications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    checkAdmin();
    fetchApplications();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      navigate("/");
      return;
    }
  };

  const fetchApplications = async () => {
    const { data } = await supabase
      .from("reseller_applications")
      .select("*")
      .order("created_at", { ascending: false });

    setApplications(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from("reseller_applications")
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", appId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `Application ${status}`
    });

    setSelectedApp(null);
    setAdminNotes("");
    fetchApplications();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Store className="h-8 w-8" />
          Reseller Applications
        </h1>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No applications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {applications.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{app.full_name}</span>
                    <span className={`text-sm px-3 py-1 rounded ${
                      app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                      app.status === 'approved' ? 'bg-green-500/20 text-green-700' :
                      'bg-red-500/20 text-red-700'
                    }`}>
                      {app.status.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>UID</Label>
                      <p>{app.uid}</p>
                    </div>
                    <div>
                      <Label>Age</Label>
                      <p>{app.age}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p>{app.phone}</p>
                    </div>
                    <div>
                      <Label>Applied</Label>
                      <p>{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label>ID Photo</Label>
                    <img 
                      src={app.id_photo_url} 
                      alt="ID" 
                      className="max-w-sm rounded border mt-2"
                    />
                  </div>

                  {app.status === 'pending' && (
                    <>
                      {selectedApp === app.id && (
                        <div className="mb-4">
                          <Label>Admin Notes</Label>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add notes (optional)"
                            rows={3}
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {selectedApp === app.id ? (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(app.id, "approved")}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Confirm Approve
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(app.id, "rejected")}
                              variant="destructive"
                            >
                              Confirm Reject
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedApp(null);
                                setAdminNotes("");
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => setSelectedApp(app.id)}
                              variant="default"
                            >
                              Review Application
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {app.admin_notes && (
                    <div className="mt-4 p-3 bg-muted rounded">
                      <Label>Admin Notes</Label>
                      <p className="text-sm">{app.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
