import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { TermsAgreementDialog } from "@/components/TermsAgreementDialog";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState<{email: string; password: string; fullName: string} | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(returnTo);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          navigate(returnTo);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, returnTo]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signUpSchema.parse({ email, password, fullName });
      setPendingSignUp({ email: validated.email, password: validated.password, fullName: validated.fullName });
      setShowTerms(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const handleTermsAccepted = async () => {
    if (!pendingSignUp) return;
    
    setLoading(true);
    setShowTerms(false);

    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: pendingSignUp.email,
        password: pendingSignUp.password,
        options: {
          data: {
            full_name: pendingSignUp.fullName,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      toast.success(t('auth.accountCreated'));
      setEmail("");
      setPassword("");
      setFullName("");
      setPendingSignUp(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signInSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error(t('auth.verifyEmail'));
        } else {
          throw error;
        }
        return;
      }

      toast.success(t('auth.signedIn'));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success(t('auth.resetEmailSent'));
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">{t('auth.forgotPassword')}</CardTitle>
              <CardDescription>{t('auth.forgotPasswordDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t('auth.email')}</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  {t('auth.backToLogin')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{t('auth.welcome')}</CardTitle>
            <CardDescription>
              {t('auth.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="w-full text-sm"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <TermsAgreementDialog 
        open={showTerms} 
        onAccept={handleTermsAccepted} 
      />
    </div>
  );
};

export default Auth;