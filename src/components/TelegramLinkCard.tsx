import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BOT_USERNAME = "Abeniexpress_bot";

export default function TelegramLinkCard() {
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("telegram_id")
      .eq("id", user.id)
      .maybeSingle();
    setTelegramId((data as any)?.telegram_id ?? null);
  };

  useEffect(() => { refresh(); }, []);

  // Poll briefly after opening the bot so the "Linked" badge appears automatically.
  useEffect(() => {
    if (telegramId) return;
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, [telegramId]);

  const openBot = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("create_telegram_link_token");
      if (error || !data) throw error ?? new Error("Could not start linking");
      window.open(`https://t.me/${BOT_USERNAME}?start=${data}`, "_blank", "noopener");
      toast.info("Tap “Start” in Telegram — your account links automatically.");
    } catch (e: any) {
      toast.error(e.message || "Could not start Telegram linking");
    } finally {
      setLoading(false);
    }
  };


  const verify = async () => {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code from the bot");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("verify_telegram_code", { p_code: code });
      if (error) throw error;
      if (data === true) {
        toast.success("Telegram linked! You'll now receive notifications there.");
        setCode("");
        await refresh();
      } else {
        toast.error("Invalid or expired code");
      }
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ telegram_id: null })
      .eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Telegram unlinked");
    await refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-primary" />
          Telegram Notifications
          {telegramId && (
            <Badge variant="secondary" className="ml-auto gap-1">
              <CheckCircle2 className="h-3 w-3" /> Linked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {telegramId ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your account is linked to Telegram ID <code className="rounded bg-muted px-1">{telegramId}</code>. You'll receive every notification on Telegram too.
            </p>
            <Button variant="outline" size="sm" onClick={unlink} disabled={loading}>
              Unlink Telegram
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Get every order & wallet update instantly on Telegram. One-way notifications only.
            </p>
            <Button className="w-full" onClick={openBot} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              Continue with Telegram
            </Button>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Didn't link automatically? Paste the 6-digit code the bot sends you:
              </label>

              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <Button onClick={verify} disabled={loading || code.length !== 6}>
                  Verify
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
