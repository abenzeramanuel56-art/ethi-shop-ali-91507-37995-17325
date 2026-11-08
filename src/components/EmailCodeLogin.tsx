import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail, KeyRound } from "lucide-react";

type Lang = "en" | "am" | "om" | "ti";
const S: Record<string, Record<Lang, string>> = {
  email: { en: "Email", am: "ኢሜይል", om: "Imeelii", ti: "ኢመይል" },
  send: { en: "Send code", am: "ኮድ ላክ", om: "Koodii ergi", ti: "ኮድ ስደድ" },
  sending: { en: "Sending…", am: "በመላክ ላይ…", om: "Ergaa jira…", ti: "ይስደድ ኣሎ…" },
  sent: { en: "We emailed a 6-digit code to", am: "ባለ 6 አሃዝ ኮድ ተልኳል ወደ", om: "Koodiin lakkoofsa 6 ergameera gara", ti: "ናይ 6 ቁጽሪ ኮድ ተሰዲዱ ናብ" },
  code: { en: "6-digit code", am: "ባለ 6 አሃዝ ኮድ", om: "Koodii lakkoofsa 6", ti: "ናይ 6 ቁጽሪ ኮድ" },
  newPw: { en: "New password", am: "አዲስ የይለፍ ቃል", om: "Jecha icciitii haaraa", ti: "ሓድሽ መሕለፊ ቃል" },
  verify: { en: "Verify & sign in", am: "አረጋግጥ እና ግባ", om: "Mirkaneessi seeni", ti: "ኣረጋግጽ እቶ" },
  reset: { en: "Change password & sign in", am: "የይለፍ ቃል ቀይር እና ግባ", om: "Jecha icciitii jijjiiri seeni", ti: "መሕለፊ ቃል ቀይር እቶ" },
  resend: { en: "Send a new code", am: "አዲስ ኮድ ላክ", om: "Koodii haaraa ergi", ti: "ሓድሽ ኮድ ስደድ" },
  change: { en: "Use a different email", am: "ሌላ ኢሜይል ተጠቀም", om: "Imeelii biraa fayyadami", ti: "ካልእ ኢመይል ተጠቐም" },
  ok: { en: "Signed in", am: "ገብተዋል", om: "Seentaniittu", ti: "ኣቲኹም" },
  bad: { en: "Wrong code", am: "የተሳሳተ ኮድ", om: "Koodii dogoggoraa", ti: "ጌጋ ኮድ" },
  expired: { en: "Code expired — send a new one", am: "ኮዱ ጊዜው አልፏል", om: "Koodiin yeroon isaa darbeera", ti: "ኮድ ግዜኡ ሓሊፉ" },
  locked: { en: "Too many tries — send a new code", am: "በጣም ብዙ ሙከራ — አዲስ ኮድ ይጠይቁ", om: "Yaaliin baay'ateera — koodii haaraa gaafadhu", ti: "ብዙሕ ፈተነ — ሓድሽ ኮድ ሕተቱ" },
  wait: { en: "Too many codes requested. Try again in 15 minutes.", am: "እባክዎ ከ15 ደቂቃ በኋላ ይሞክሩ።", om: "Daqiiqaa 15 booda yaali.", ti: "ድሕሪ 15 ደቒቕ ፈትኑ።" },
  pwShort: { en: "Password must be at least 6 characters", am: "የይለፍ ቃል ቢያንስ 6 ቁምፊ", om: "Jecha icciitii yoo xiqqaate qubee 6", ti: "መሕለፊ ቃል እንተወሓደ 6 ፊደላት" },
};

async function readError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try { return (await error.context.json())?.error ?? ""; } catch { return ""; }
  }
  return (error as any)?.message ?? "";
}

export function EmailCodeLogin({ purpose = "login", initialEmail = "" }: { purpose?: "login" | "reset"; initialEmail?: string }) {
  const { language } = useLanguage();
  const L = (k: keyof typeof S) => S[k][(language as Lang) ?? "en"] ?? S[k].en;
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error(L("email"));
    setLoading(true);
    const { error } = await supabase.functions.invoke("email-code-send", { body: { email: email.trim(), purpose } });
    setLoading(false);
    if (error) {
      const e = await readError(error);
      return toast.error(e === "too_many_requests" ? L("wait") : e || "Failed");
    }
    setStep("code");
    setCode("");
    toast.success(`${L("sent")} ${email.trim()}`);
  };

  const verify = async () => {
    if (purpose === "reset" && pw.length < 6) return toast.error(L("pwShort"));
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-code-verify", {
        body: { email: email.trim(), code, purpose, newPassword: purpose === "reset" ? pw : undefined },
      });
      if (error) {
        const e = await readError(error);
        toast.error(e === "code_expired" ? L("expired") : e === "too_many_attempts" ? L("locked") : L("bad"));
        return;
      }
      const tokenHash = (data as any)?.token_hash;
      if (!tokenHash) return toast.error(L("bad"));
      const { error: otpErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (otpErr) return toast.error(otpErr.message);
      toast.success(L("ok"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "email") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`code-email-${purpose}`}>{L("email")}</Label>
          <Input id={`code-email-${purpose}`} type="email" placeholder="your@email.com" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="button" className="w-full" onClick={send} disabled={loading}>
          <Mail className="h-4 w-4 mr-1" />{loading ? L("sending") : L("send")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{L("sent")} <strong>{email}</strong></p>
      <div className="space-y-2">
        <Label htmlFor={`code-input-${purpose}`}>{L("code")}</Label>
        <Input id={`code-input-${purpose}`} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          placeholder="123456" className="text-center text-2xl tracking-[0.5em]" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
      </div>
      {purpose === "reset" && (
        <div className="space-y-2">
          <Label htmlFor="code-new-pw">{L("newPw")}</Label>
          <Input id="code-new-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
      )}
      <Button type="button" className="w-full" onClick={verify} disabled={loading || code.length !== 6}>
        <KeyRound className="h-4 w-4 mr-1" />{loading ? "…" : purpose === "reset" ? L("reset") : L("verify")}
      </Button>
      <div className="flex justify-between text-sm">
        <Button type="button" variant="link" className="px-0" onClick={send} disabled={loading}>{L("resend")}</Button>
        <Button type="button" variant="link" className="px-0" onClick={() => setStep("email")}>{L("change")}</Button>
      </div>
    </div>
  );
}

export default EmailCodeLogin;
