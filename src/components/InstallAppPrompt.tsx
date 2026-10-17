import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa:install-dismissed";

function isPreviewContext() {
  const h = window.location.hostname;
  return (
    window.self !== window.top ||
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "localhost" ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    h.endsWith(".beta.lovable.dev")
  );
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    // A registered service worker is required for installability.
    if (!("serviceWorker" in navigator) || isPreviewContext()) return;
    navigator.serviceWorker.register("/push-sw.js").catch(() => {});
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex-1">
          <p className="text-sm font-semibold">Install Abeni Express</p>
          <p className="text-xs text-muted-foreground">Add it to your home screen for a full app experience.</p>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setVisible(false);
          }}
        >
          <Download className="mr-1 h-4 w-4" />
          Install
        </Button>
        <button
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default InstallAppPrompt;
