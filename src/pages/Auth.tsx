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
import { lovable } from "@/integrations/lovable";
import { z } from "zod";
import { Send } from "lucide-react";

const TELEGRAM_BOT = "Abeniexpress_bot";


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
  const [linkSent, setLinkSent] = useState<null | "signup" | "reset">(null);
  const [showTgCode, setShowTgCode] = useState(false);
  const [tgCode, setTgCode] = useState("");
  const [tgLoading, setTgLoading] = useState(false);

  const handleTelegramLogin = async () => {
    setTgLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-login", {
        body: { code: tgCode },
      });
      if (error) {
        const details = (error as any)?.context ? await (error as any).context.text() : error.message;
        console.error("telegram-login failed:", details);
        toast.error("Code invalid, expired, or this Telegram isn't linked to an account yet.");
        return;
      }
      if (!data?.token_hash) {
        toast.error(data?.error === "telegram_not_linked"
          ? "This Telegram isn't linked yet. Sign in once, then link it from your Account page."
          : "Could not sign you in with Telegram.");
        return;
      }
      sessionStorage.setItem("auth:returnTo", returnTo);
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });
      if (otpError) {
        toast.error(otpError.message);
        return;
      }
      toast.success("Signed in with Telegram");
      setTgCode("");
      setShowTgCode(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Telegram sign-in failed");
    } finally {
      setTgLoading(false);
    }
  };


  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    const targetAfterAuth = sessionStorage.getItem("auth:returnTo") || returnTo;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        sessionStorage.removeItem("auth:returnTo");
        navigate(targetAfterAuth);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          sessionStorage.removeItem("auth:returnTo");
          navigate(targetAfterAuth);
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
          data: { full_name: pendingSignUp.fullName },
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;

      toast.success("Account created! Check your email for the verification link.");
      setLinkSent("signup");
      setResetEmail(pendingSignUp.email);
      setEmail(""); setPassword(""); setFullName("");
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
    if (!resetEmail) { toast.error("Please enter your email address"); return; }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
      if (error) throw error;
      toast.success("We sent a reset link to your email");
      setLinkSent("reset");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a {linkSent === "signup" ? "verification" : "password reset"} link to <strong>{resetEmail}</strong>.
                Open it on this device to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The link expires in 1 hour. If you don't see the email, check spam or resend below.
              </p>
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  if (linkSent === "reset") {
                    await supabase.auth.resetPasswordForEmail(resetEmail, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                  } else {
                    await supabase.auth.resend({ type: "signup", email: resetEmail });
                  }
                  setLoading(false);
                  toast.success("Link resent");
                }}
              >
                Resend link
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setLinkSent(null); setShowForgotPassword(false); }}>
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
                <Button type="button" variant="outline" className="w-full"
                  onClick={() => setShowForgotPassword(false)}>
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
            <div className="space-y-2 mb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  sessionStorage.setItem("auth:returnTo", returnTo);
                  const r = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (r.error) { toast.error(r.error.message || "Google sign-in failed"); setLoading(false); }
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading || tgLoading}
                onClick={() => {
                  window.open(`https://t.me/${TELEGRAM_BOT}?start=login`, "_blank", "noopener");
                  setShowTgCode(true);
                }}
              >
                <Send className="h-4 w-4 mr-1" />
                Continue with Telegram
              </Button>
              {showTgCode && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    Tap “Start” in the bot, then paste the 6-digit code it sends you.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={tgCode}
                      onChange={(e) => setTgCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <Button type="button" onClick={handleTelegramLogin} disabled={tgLoading || tgCode.length !== 6}>
                      {tgLoading ? "..." : "Verify"}
                    </Button>
                  </div>
                </div>
              )}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>
            </div>

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