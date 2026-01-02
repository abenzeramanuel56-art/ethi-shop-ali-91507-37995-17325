import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Store, User, Phone, Mail, Calendar, IdCard, Camera } from "lucide-react";

interface Application {
  id: string;
  full_name: string;
  email: string | null;
  uid: string;
  age: number;
  phone: string;
  id_photo_url: string;
  id_front_photo_url: string | null;
  id_back_photo_url: string | null;
  face_photo_url: string | null;
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
      .from("seller_applications")
      .select("*")
      .order("created_at", { ascending: false });

    setApplications(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from("seller_applications")
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
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {app.full_name}
                    </span>
                    <Badge variant={
                      app.status === 'pending' ? 'secondary' :
                      app.status === 'approved' ? 'default' : 'destructive'
                    }>
                      {app.status.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Personal Information */}
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm">{app.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-xs text-muted-foreground">UID</Label>
                        <p className="text-sm">{app.uid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Age</Label>
                        <p className="text-sm">{app.age} years</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="text-sm">{app.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Applied</Label>
                        <p className="text-sm">{new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Verification Photos</Label>
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* ID Front */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                          <IdCard className="h-3 w-3" /> ID Front
                        </Label>
                        {app.id_front_photo_url ? (
                          <img 
                            src={app.id_front_photo_url} 
                            alt="ID Front" 
                            className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(app.id_front_photo_url!, '_blank')}
                          />
                        ) : app.id_photo_url ? (
                          <img 
                            src={app.id_photo_url} 
                            alt="ID" 
                            className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(app.id_photo_url, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted rounded flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>

                      {/* ID Back */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                          <IdCard className="h-3 w-3" /> ID Back
                        </Label>
                        {app.id_back_photo_url ? (
                          <img 
                            src={app.id_back_photo_url} 
                            alt="ID Back" 
                            className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(app.id_back_photo_url!, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted rounded flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Face Photo */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                          <Camera className="h-3 w-3" /> Face Verification
                        </Label>
                        {app.face_photo_url ? (
                          <img 
                            src={app.face_photo_url} 
                            alt="Face" 
                            className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(app.face_photo_url!, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted rounded flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                    </div>
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