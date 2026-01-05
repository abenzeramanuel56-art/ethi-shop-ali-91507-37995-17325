import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck, Camera, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ApplyDriver() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    checkAuthAndApplication();
  }, []);

  const checkAuthAndApplication = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to apply as a driver",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    const { data } = await (supabase as any)
      .from("driver_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setExistingApplication(data);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^(\+251|0)?[79]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleIdFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdFrontPhoto(e.target.files[0]);
    }
  };

  const handleIdBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdBackPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to apply",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    if (!validatePhone(phone)) {
      toast({
        title: "Invalid phone",
        description: "Please enter a valid Ethiopian phone number",
        variant: "destructive"
      });
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
      toast({
        title: "Invalid age",
        description: "You must be between 18 and 65 years old",
        variant: "destructive"
      });
      return;
    }

    if (!fullName || !idFrontPhoto || !idBackPhoto) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and upload ID photos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Upload ID front photo
      const frontExt = idFrontPhoto.name.split('.').pop();
      const frontFileName = `drivers/${user.id}/id-front-${Date.now()}.${frontExt}`;
      
      const { error: frontUploadError } = await supabase.storage
        .from("id-photos")
        .upload(frontFileName, idFrontPhoto);

      if (frontUploadError) throw frontUploadError;

      const { data: { publicUrl: frontUrl } } = supabase.storage
        .from("id-photos")
        .getPublicUrl(frontFileName);

      // Upload ID back photo
      const backExt = idBackPhoto.name.split('.').pop();
      const backFileName = `drivers/${user.id}/id-back-${Date.now()}.${backExt}`;
      
      const { error: backUploadError } = await supabase.storage
        .from("id-photos")
        .upload(backFileName, idBackPhoto);

      if (backUploadError) throw backUploadError;

      const { data: { publicUrl: backUrl } } = supabase.storage
        .from("id-photos")
        .getPublicUrl(backFileName);

      // Create application
      const { error: insertError } = await (supabase as any)
        .from("driver_applications")
        .insert({
          user_id: user.id,
          full_name: fullName,
          email,
          age: parseInt(age),
          phone,
          vehicle_type: vehicleType || null,
          license_plate: licensePlate || null,
          id_front_photo_url: frontUrl,
          id_back_photo_url: backUrl
        });

      if (insertError) throw insertError;

      toast({
        title: "Application submitted!",
        description: "We will review your application and notify you soon."
      });

      navigate("/application-submitted");
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
                  <Truck className="h-6 w-6" />
                  Your Driver Application
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
                    <Label>Submitted On</Label>
                    <p>{new Date(existingApplication.created_at).toLocaleDateString()}</p>
                  </div>
                  {existingApplication.admin_notes && (
                    <div>
                      <Label>Admin Notes</Label>
                      <p className="text-sm">{existingApplication.admin_notes}</p>
                    </div>
                  )}
                  {existingApplication.status === 'approved' && (
                    <Button onClick={() => navigate("/driver")} className="w-full">
                      Go to Driver Dashboard
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
            <Truck className="h-8 w-8" />
            Become a Driver
          </h1>
          <p className="text-muted-foreground mb-8">
            Join our delivery team and earn 25 ETB per kilometer
          </p>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 2 && (
                  <div className={`w-16 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {step === 1 && (
                  <>
                    <h3 className="font-semibold text-lg mb-4">Personal Information</h3>
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div>
                      <Label>Age *</Label>
                      <Input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Must be 18-65"
                        min="18"
                        max="65"
                        required
                      />
                    </div>

                    <div>
                      <Label>Phone Number *</Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+251..."
                        required
                      />
                    </div>

                    <div>
                      <Label>Vehicle Type (optional)</Label>
                      <Input
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        placeholder="e.g., Motorcycle, Bicycle, Car"
                      />
                    </div>

                    <div>
                      <Label>License Plate (optional)</Label>
                      <Input
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        placeholder="If applicable"
                      />
                    </div>

                    <Button 
                      type="button" 
                      onClick={() => setStep(2)} 
                      className="w-full"
                      disabled={!fullName || !email || !age || !phone}
                    >
                      Next
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3 className="font-semibold text-lg mb-4">ID Verification</h3>
                    
                    <div>
                      <Label>ID Card - Front *</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="id-front"
                          accept="image/*"
                          capture="environment"
                          onChange={handleIdFrontChange}
                          className="hidden"
                        />
                        <label htmlFor="id-front" className="cursor-pointer">
                          {idFrontPhoto ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <Check className="h-5 w-5" />
                              <span>{idFrontPhoto.name}</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Take a photo of the front of your ID
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>ID Card - Back *</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="id-back"
                          accept="image/*"
                          capture="environment"
                          onChange={handleIdBackChange}
                          className="hidden"
                        />
                        <label htmlFor="id-back" className="cursor-pointer">
                          {idBackPhoto ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <Check className="h-5 w-5" />
                              <span>{idBackPhoto.name}</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Take a photo of the back of your ID
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setStep(1)} 
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={loading || !idFrontPhoto || !idBackPhoto}
                      >
                        {loading ? "Submitting..." : "Submit Application"}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
