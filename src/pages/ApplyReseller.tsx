import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Store, Camera, Upload } from "lucide-react";

export default function ApplyReseller() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [uid, setUid] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);

  useEffect(() => {
    checkAuthAndApplication();
  }, []);

  const checkAuthAndApplication = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to apply as a reseller",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    // Check if user already has an application
    const { data } = await supabase
      .from("reseller_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setExistingApplication(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to apply",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!fullName || !uid || !age || !phone || !idPhoto) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and upload your ID photo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Upload ID photo
      const fileExt = idPhoto.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("id-photos")
        .upload(fileName, idPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("id-photos")
        .getPublicUrl(fileName);

      // Create application
      const { error: insertError } = await supabase
        .from("reseller_applications")
        .insert({
          user_id: user.id,
          full_name: fullName,
          uid,
          age: parseInt(age),
          phone,
          id_photo_url: publicUrl
        });

      if (insertError) throw insertError;

      toast({
        title: "Application submitted",
        description: "Your reseller application has been submitted for review"
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-6 w-6" />
                  Your Reseller Application
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <p className={`text-lg font-medium ${
                      existingApplication.status === 'pending' ? 'text-yellow-600' :
                      existingApplication.status === 'approved' ? 'text-green-600' :
                      'text-red-600'
                    }`}>
                      {existingApplication.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <Label>Submitted</Label>
                    <p>{new Date(existingApplication.created_at).toLocaleDateString()}</p>
                  </div>
                  {existingApplication.admin_notes && (
                    <div>
                      <Label>Admin Notes</Label>
                      <p className="text-sm">{existingApplication.admin_notes}</p>
                    </div>
                  )}
                  {existingApplication.status === 'approved' && (
                    <Button onClick={() => navigate("/reseller/setup")} className="w-full">
                      Setup Your Store
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Store className="h-8 w-8" />
            Apply to Become a Reseller
          </h1>
          <p className="text-muted-foreground mb-8">
            Fill in your details to apply as a reseller on our platform
          </p>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label>UID (National ID)</Label>
                  <Input
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    placeholder="Enter your national ID number"
                    required
                  />
                </div>

                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    min="18"
                    required
                  />
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div>
                  <Label>ID Photo</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="id-photo"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="id-photo" className="cursor-pointer">
                      {idPhoto ? (
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="h-5 w-5" />
                          <span>{idPhoto.name}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to take a photo or select from gallery
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
