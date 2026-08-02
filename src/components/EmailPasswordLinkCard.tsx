import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Lets an account that only has Telegram sign-in (or an unverified/placeholder email)
 * attach a real email + password so they can also sign in the normal way.
 */
export default function EmailPasswordLinkCard() {
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        const isPlaceholder = !user.email || user.email.endsWith("@telegram.abeni");
        setCurrentEmail(isPlaceholder ? null : user.email ?? null);
        const identities = user.identities ?? [];
        setHasPassword(identities.some((i) => i.provider === "email") && !isPlaceholder);
      }
      setChecking(false);
    });
  }, []);

  if (checking) return null;

  if (currentEmail && hasPassword) {
    return (
      <Card className="card-3d">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Email sign-in ready
          </CardTitle>
          <CardDescription>
            You can sign in with <strong>{currentEmail}</strong> or with Telegram.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email, password },
        { emailRedirectTo: `${window.location.origin}/account` }
      );
      if (error) throw error;
      toast.success("Check your inbox to confirm the email. Your password is set.");
      setPassword("");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not link your email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-3d border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" /> Add email sign-in
        </CardTitle>
        <CardDescription>
          You signed in with Telegram. Add an email and password so you can also sign in the normal way.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-email">Email</Label>
            <Input
              id="link-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-password">Password</Label>
            <Input
              id="link-password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Link email & password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
