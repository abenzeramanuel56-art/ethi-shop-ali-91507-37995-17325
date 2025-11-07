import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function BannedUserCheck({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBanStatus();
  }, []);

  const checkBanStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_bans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      setIsBanned(true);
      setBanReason(data.reason);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Account Banned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your account has been banned from accessing this platform.
            </p>
            {banReason && (
              <div className="p-3 bg-red-500/10 rounded">
                <p className="text-sm font-medium">Reason:</p>
                <p className="text-sm">{banReason}</p>
              </div>
            )}
            <p className="text-sm">
              If you believe this is a mistake, please contact our support team.
            </p>
            <Button 
              onClick={() => navigate("/support")}
              className="w-full"
            >
              Contact Customer Support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
