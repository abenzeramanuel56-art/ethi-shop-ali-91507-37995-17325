import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { enablePushNotifications, disablePushNotifications, pushSupported } from "@/lib/push";

export function PushNotificationCard({
  title = "Background alerts",
  description = "Get notified on this device even when Abeni Express is closed.",
}: {
  title?: string;
  description?: string;
}) {
  const [status, setStatus] = useState<"unknown" | "on" | "off" | "unsupported">("unknown");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker
      .getRegistration("/push-sw.js")
      .then((r) => r?.pushManager.getSubscription())
      .then((sub) => setStatus(sub && Notification.permission === "granted" ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  if (status === "unsupported") return null;

  const enable = async () => {
    setLoading(true);
    const res = await enablePushNotifications();
    setLoading(false);
    if (res.ok) {
      setStatus("on");
      toast.success("Background alerts enabled on this device");
    } else {
      toast.error(res.error ?? "Could not enable alerts");
    }
  };

  const disable = async () => {
    setLoading(true);
    await disablePushNotifications();
    setLoading(false);
    setStatus("off");
    toast.success("Background alerts turned off");
  };

  return (
    <Card className="card-3d mb-6 border-primary/30 bg-primary/5">
      <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          {status === "on" ? (
            <BellRing className="h-5 w-5 text-primary mt-0.5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {status === "on" ? (
          <Button variant="outline" size="sm" disabled={loading} onClick={disable}>
            Turn off
          </Button>
        ) : (
          <Button size="sm" disabled={loading} onClick={enable}>
            {loading ? "Enabling…" : "Enable alerts"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
