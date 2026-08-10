import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function BannedUserCheck({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkBanStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from("user_bans")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (data && !cancelled) {
          setIsBanned(true);
          setBanReason(data.reason);
        }
      } catch (e) {
        console.error("ban check failed", e);
      }
    };

    // Never block rendering on the network — the app must load on the first try.
    checkBanStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleContactSupport = () => {
    navigate("/support");
  };



  if (isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              {t('banned.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('banned.message')}
            </p>
            {banReason && (
              <div className="p-3 bg-red-500/10 rounded">
                <p className="text-sm font-medium">{t('banned.reason')}</p>
                <p className="text-sm">{banReason}</p>
              </div>
            )}
            <p className="text-sm">
              {t('banned.contactSupport')}
            </p>
            <Button 
              onClick={handleContactSupport}
              className="w-full"
            >
              {t('banned.contactButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
