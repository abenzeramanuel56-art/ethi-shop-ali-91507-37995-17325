import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Store, User, Phone, Mail, Calendar, IdCard, Camera, Car } from "lucide-react";
import { SignedImage, openSignedUrl } from "@/components/SignedImage";

interface SellerApplication {
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

interface DriverApplication {
  id: string;
  full_name: string;
  email: string | null;
  age: number;
  phone: string;
  id_front_photo_url: string;
  id_back_photo_url: string;
  vehicle_type: string | null;
  license_plate: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
}

export default function AdminApplications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellerApplications, setSellerApplications] = useState<SellerApplication[]>([]);
  const [driverApplications, setDriverApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    const [sellerRes, driverRes] = await Promise.all([
      supabase
        .from("seller_applications")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("driver_applications")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    setSellerApplications(sellerRes.data || []);
    setDriverApplications(driverRes.data || []);
    setLoading(false);
  };

  const handleApproveSellerApplication = async (appId: string) => {
    setProcessingId(appId);
    try {
      const app = sellerApplications.find((a: any) => a.id === appId);
      const { error } = await supabase.rpc("admin_approve_seller_application", {
        p_application_id: appId,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      if (app?.user_id) {
        await supabase.functions.invoke("send-user-email", {
          body: {
            userId: app.user_id,
            subject: "Your Abeni Express seller application is approved 🎉",
            heading: "Welcome, Seller!",
            message: `<p>Your seller application has been <strong>approved</strong>. You can now access your seller dashboard, set up your store, list products, and start receiving orders.</p>${adminNotes ? `<p><strong>Admin note:</strong> ${adminNotes}</p>` : ""}<p>Sign in and open <strong>Seller Dashboard</strong> to begin.</p>`,
          },
        });
      }

      toast({ title: "Success", description: "Seller approved and notified by email" });

      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSellerApplication = async (appId: string) => {
    setProcessingId(appId);
    try {
      const { error } = await supabase
        .from("seller_applications")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", appId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application rejected"
      });

      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDriverApplication = async (appId: string) => {
    setProcessingId(appId);
    try {
      const { error } = await supabase.rpc("admin_approve_driver_application", {
        p_application_id: appId,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Driver application approved and role assigned"
      });

      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDriverApplication = async (appId: string) => {
    setProcessingId(appId);
    try {
      const { error } = await supabase
        .from("driver_applications")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", appId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application rejected"
      });

      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
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
          Applications
        </h1>

        <Tabs defaultValue="sellers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Seller Applications ({sellerApplications.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Driver Applications ({driverApplications.filter(a => a.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sellers">
            {sellerApplications.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">No seller applications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {sellerApplications.map((app) => (
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

                      <div className="mb-6">
                        <Label className="text-sm font-medium mb-3 block">Verification Photos</Label>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <IdCard className="h-3 w-3" /> ID Front
                            </Label>
                            {app.id_front_photo_url ? (
                              <SignedImage
                                url={app.id_front_photo_url}
                                alt="ID Front"
                                className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => openSignedUrl(app.id_front_photo_url)}
                              />
                            ) : app.id_photo_url ? (
                              <SignedImage
                                url={app.id_photo_url}
                                alt="ID"
                                className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => openSignedUrl(app.id_photo_url)}
                              />
                            ) : (
                              <div className="w-full h-40 bg-muted rounded flex items-center justify-center text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <IdCard className="h-3 w-3" /> ID Back
                            </Label>
                            {app.id_back_photo_url ? (
                              <SignedImage
                                url={app.id_back_photo_url}
                                alt="ID Back"
                                className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => openSignedUrl(app.id_back_photo_url)}
                              />
                            ) : (
                              <div className="w-full h-40 bg-muted rounded flex items-center justify-center text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <Camera className="h-3 w-3" /> Face Verification
                            </Label>
                            {app.face_photo_url ? (
                              <SignedImage
                                url={app.face_photo_url}
                                alt="Face"
                                className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => openSignedUrl(app.face_photo_url)}
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
                                  onClick={() => handleApproveSellerApplication(app.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={processingId === app.id}
                                >
                                  {processingId === app.id ? "Processing..." : "Confirm Approve"}
                                </Button>
                                <Button
                                  onClick={() => handleRejectSellerApplication(app.id)}
                                  variant="destructive"
                                  disabled={processingId === app.id}
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
                              <Button
                                onClick={() => setSelectedApp(app.id)}
                                variant="default"
                              >
                                Review Application
                              </Button>
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
          </TabsContent>

          <TabsContent value="drivers">
            {driverApplications.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">No driver applications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {driverApplications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Car className="h-5 w-5" />
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
                      <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <p className="text-sm">{app.email || 'N/A'}</p>
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
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-xs text-muted-foreground">Vehicle Type</Label>
                            <p className="text-sm">{app.vehicle_type || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <IdCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Label className="text-xs text-muted-foreground">License Plate</Label>
                            <p className="text-sm">{app.license_plate || 'N/A'}</p>
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

                      <div className="mb-6">
                        <Label className="text-sm font-medium mb-3 block">ID Photos</Label>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <IdCard className="h-3 w-3" /> ID Front
                            </Label>
                            <SignedImage
                              url={app.id_front_photo_url}
                              alt="ID Front"
                              className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => openSignedUrl(app.id_front_photo_url)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <IdCard className="h-3 w-3" /> ID Back
                            </Label>
                            <SignedImage
                              url={app.id_back_photo_url}
                              alt="ID Back"
                              className="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => openSignedUrl(app.id_back_photo_url)}
                            />
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
                                  onClick={() => handleApproveDriverApplication(app.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={processingId === app.id}
                                >
                                  {processingId === app.id ? "Processing..." : "Confirm Approve"}
                                </Button>
                                <Button
                                  onClick={() => handleRejectDriverApplication(app.id)}
                                  variant="destructive"
                                  disabled={processingId === app.id}
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
                              <Button
                                onClick={() => setSelectedApp(app.id)}
                                variant="default"
                              >
                                Review Application
                              </Button>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}