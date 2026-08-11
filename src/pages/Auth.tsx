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

  const returnTo = searchParams.get("returnTo") || "/";

  const handleTelegramLogin = async () => {
    if (!tgCode || tgCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    
    setTgLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-login", {
        body: { code: tgCode.trim() },
      });

      if (error || !data?.token_hash) {
        if (data?.error === "telegram_not_linked") {
          toast.error("This Telegram account is not linked to any profile. Sign in with email first, then link Telegram from your account settings.");
        } else {
          toast.error(data?.error || "Code invalid, expired, or this Telegram isn't linked to an account yet.");
        }
        return;
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });

      if (otpError) {
        toast.error(otpError.message);
        return;
      }

      toast.success("Signed in with Telegram!");
      setTgCode("");
      setShowTgCode(false);

      const targetUrl = returnTo && !returnTo.includes("/auth") ? returnTo : "/";
      window.location.href = targetUrl;
    } catch (e: any) {
      toast.error(e?.message ?? "Telegram sign-in failed");
    } finally {
      setTgLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const targetUrl = returnTo && !returnTo.includes("/auth") ? returnTo : "/";
        window.location.href = targetUrl;
      }
    });
  }, [returnTo]);

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
      const redirectUrl = 'https://abeniexpress.online/';
      const { error } = await supabase.auth.signUp({
        email: pendingSignUp.email,
        password: pendingSignUp.password,
        options: {
          data: { full_name: pendingSignUp.fullName },
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;

      await supabase.functions.invoke("send-signup-link", {
        body: { email: pendingSignUp.email, redirectTo: redirectUrl },
      }).catch(() => {});

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

      const { data, error } = await supabase.auth.signInWithPassword({
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

      if (data?.session) {
        toast.success(t('auth.signedIn'));
        const targetUrl = returnTo && !returnTo.includes("/auth") ? returnTo : "/";
        window.location.href = targetUrl;
      }
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
      const redirectTo = 'https://abeniexpress.online/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo,
      });
      
      if (error) {
        if (error.message.includes("rate limit") || error.message.includes("security purposes") || error.status === 429) {
          throw new Error("For security purposes, you can only request a password reset once every 60 seconds for this account.");
        }
        throw error;
      }

      toast.success("We sent a password reset link to your email");
      setLinkSent("reset");

    } catch (error: any) {
      console.error("Forgot password error:", error);
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
              {linkSent === "signup" && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
                  <p className="text-sm font-medium">Get instant updates on Telegram</p>
                  <p className="text-xs text-muted-foreground">
                    New here? Link our bot now and receive every order, delivery and wallet update straight to Telegram.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`https://t.me/${TELEGRAM_BOT}?start=login`, "_blank", "noopener")}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Continue with Telegram
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  if (linkSent === "reset") {
                    await supabase.auth.resetPasswordForEmail(resetEmail, {
                      redirectTo: 'https://abeniexpress.online/reset-password',
                    });
                  } else {
                    await supabase.auth.signUp({
                      email: resetEmail,
                      password: "TemporaryPassword123!",
                      options: { emailRedirectTo: 'https://abeniexpress.online/' },
                    });
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
