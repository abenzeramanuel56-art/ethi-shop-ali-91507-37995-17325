import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Store, Camera, Upload, Check, AlertCircle } from "lucide-react";
import { FaceAuthentication } from "@/components/FaceAuthentication";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ApplyReseller() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [facePhoto, setFacePhoto] = useState<Blob | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    checkAuthAndApplication();
  }, []);

  const checkAuthAndApplication = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: t('apply.signInRequired'),
        description: t('apply.signInDesc'),
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Ethiopian phone number format: +251 or 0 followed by 9 digits
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

  const handleFaceAuthComplete = (photo: Blob, descriptor: number[]) => {
    setFacePhoto(photo);
    setFaceDescriptor(descriptor);
    setFaceVerified(true);
    setShowFaceAuth(false);
    toast({
      title: t('face.successTitle'),
      description: t('face.successDesc')
    });
  };

  const checkForDuplicateFace = async (descriptor: number[]): Promise<boolean> => {
    // Check if this face has been used for another application
    const { data: existingApps } = await supabase
      .from("reseller_applications")
      .select("id, face_descriptor")
      .not("face_descriptor", "is", null);

    if (!existingApps) return false;

    for (const app of existingApps) {
      if (app.face_descriptor) {
        const storedDescriptor = app.face_descriptor as number[];
        // Calculate Euclidean distance between face descriptors
        let distance = 0;
        for (let i = 0; i < descriptor.length; i++) {
          distance += Math.pow((descriptor[i] || 0) - (storedDescriptor[i] || 0), 2);
        }
        distance = Math.sqrt(distance);
        
        // If distance is less than 0.6, faces are considered the same
        if (distance < 0.6) {
          return true;
        }
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: t('apply.signInRequired'),
        description: t('apply.signInDesc'),
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    // Validation
    if (!validateEmail(email)) {
      toast({
        title: t('apply.invalidEmail'),
        description: t('apply.invalidEmailDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!validatePhone(phone)) {
      toast({
        title: t('apply.invalidPhone'),
        description: t('apply.invalidPhoneDesc'),
        variant: "destructive"
      });
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      toast({
        title: t('apply.invalidAge'),
        description: t('apply.invalidAgeDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!fullName || !uid || !idFrontPhoto || !idBackPhoto) {
      toast({
        title: t('apply.missingInfo'),
        description: t('apply.missingInfoDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!faceVerified || !facePhoto || !faceDescriptor) {
      toast({
        title: t('face.required'),
        description: t('face.requiredDesc'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate face
      const isDuplicate = await checkForDuplicateFace(faceDescriptor);
      if (isDuplicate) {
        toast({
          title: t('apply.duplicateAccount'),
          description: t('apply.duplicateAccountDesc'),
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Upload ID front photo
      const frontExt = idFrontPhoto.name.split('.').pop();
      const frontFileName = `${user.id}/id-front-${Date.now()}.${frontExt}`;
      
      const { error: frontUploadError } = await supabase.storage
        .from("id-photos")
        .upload(frontFileName, idFrontPhoto);

      if (frontUploadError) throw frontUploadError;

      const { data: { publicUrl: frontUrl } } = supabase.storage
        .from("id-photos")
        .getPublicUrl(frontFileName);

      // Upload ID back photo
      const backExt = idBackPhoto.name.split('.').pop();
      const backFileName = `${user.id}/id-back-${Date.now()}.${backExt}`;
      
      const { error: backUploadError } = await supabase.storage
        .from("id-photos")
        .upload(backFileName, idBackPhoto);

      if (backUploadError) throw backUploadError;

      const { data: { publicUrl: backUrl } } = supabase.storage
        .from("id-photos")
        .getPublicUrl(backFileName);

      // Upload face photo
      const faceFileName = `${user.id}/face-${Date.now()}.jpg`;
      
      const { error: faceUploadError } = await supabase.storage
        .from("id-photos")
        .upload(faceFileName, facePhoto);

      if (faceUploadError) throw faceUploadError;

      const { data: { publicUrl: faceUrl } } = supabase.storage
        .from("id-photos")
        .getPublicUrl(faceFileName);

      // Create application
      const { error: insertError } = await supabase
        .from("reseller_applications")
        .insert({
          user_id: user.id,
          full_name: fullName,
          email,
          uid,
          age: parseInt(age),
          phone,
          id_photo_url: frontUrl,
          id_front_photo_url: frontUrl,
          id_back_photo_url: backUrl,
          face_photo_url: faceUrl,
          face_descriptor: faceDescriptor
        });

      if (insertError) throw insertError;

      toast({
        title: t('apply.submitted'),
        description: t('apply.submittedDesc')
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('apply.submitError'),
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
                  {t('apply.yourApplication')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>{t('apply.status')}</Label>
                    <p className={`text-lg font-medium ${
                      existingApplication.status === 'pending' ? 'text-yellow-600' :
                      existingApplication.status === 'approved' ? 'text-green-600' :
                      'text-red-600'
                    }`}>
                      {existingApplication.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <Label>{t('apply.submittedOn')}</Label>
                    <p>{new Date(existingApplication.created_at).toLocaleDateString()}</p>
                  </div>
                  {existingApplication.admin_notes && (
                    <div>
                      <Label>{t('apply.adminNotes')}</Label>
                      <p className="text-sm">{existingApplication.admin_notes}</p>
                    </div>
                  )}
                  {existingApplication.status === 'approved' && (
                    <Button onClick={() => navigate("/reseller/setup")} className="w-full">
                      {t('apply.setupStore')}
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

  if (showFaceAuth) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <FaceAuthentication
            onComplete={handleFaceAuthComplete}
            onCancel={() => setShowFaceAuth(false)}
          />
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
            {t('apply.title')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('apply.subtitle')}
          </p>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
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
                    <h3 className="font-semibold text-lg mb-4">{t('apply.personalInfo')}</h3>
                    <div>
                      <Label>{t('apply.fullName')}</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('apply.fullNamePlaceholder')}
                        required
                      />
                    </div>

                    <div>
                      <Label>{t('apply.email')}</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('apply.emailPlaceholder')}
                        required
                      />
                    </div>

                    <div>
                      <Label>{t('apply.uid')}</Label>
                      <Input
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        placeholder={t('apply.uidPlaceholder')}
                        required
                      />
                    </div>

                    <div>
                      <Label>{t('apply.age')}</Label>
                      <Input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder={t('apply.agePlaceholder')}
                        min="18"
                        max="100"
                        required
                      />
                    </div>

                    <div>
                      <Label>{t('apply.phone')}</Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('apply.phonePlaceholder')}
                        required
                      />
                    </div>

                    <Button 
                      type="button" 
                      onClick={() => setStep(2)} 
                      className="w-full"
                      disabled={!fullName || !email || !uid || !age || !phone}
                    >
                      {t('common.next')}
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3 className="font-semibold text-lg mb-4">{t('apply.idVerification')}</h3>
                    
                    <div>
                      <Label>{t('apply.idFront')}</Label>
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
                                {t('apply.idFrontDesc')}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>{t('apply.idBack')}</Label>
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
                                {t('apply.idBackDesc')}
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                        {t('common.back')}
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setStep(3)} 
                        className="flex-1"
                        disabled={!idFrontPhoto || !idBackPhoto}
                      >
                        {t('common.next')}
                      </Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h3 className="font-semibold text-lg mb-4">{t('apply.faceVerification')}</h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">{t('face.whyNeeded')}</p>
                            <p className="text-sm text-muted-foreground">{t('face.whyNeededDesc')}</p>
                          </div>
                        </div>
                      </div>

                      {faceVerified ? (
                        <div className="p-6 border-2 border-green-500 rounded-lg text-center">
                          <Check className="h-12 w-12 mx-auto text-green-500 mb-2" />
                          <p className="font-medium text-green-600">{t('face.verified')}</p>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => setShowFaceAuth(true)}
                          variant="outline"
                          className="w-full h-24"
                        >
                          <div className="text-center">
                            <Camera className="h-8 w-8 mx-auto mb-2" />
                            <span>{t('face.startVerification')}</span>
                          </div>
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                        {t('common.back')}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={loading || !faceVerified} 
                        className="flex-1"
                      >
                        {loading ? t('apply.submitting') : t('apply.submit')}
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