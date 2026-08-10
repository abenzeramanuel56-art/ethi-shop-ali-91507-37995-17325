import { Send, Instagram } from "lucide-react";

const TELEGRAM_URL = "https://t.me/AbeniExpressOfficial";
const INSTAGRAM_URL =
  "https://www.instagram.com/abeni__express?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

/** Global "Visit us" footer shown under every page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/60 py-8 backdrop-blur">
      <div className="container mx-auto px-4 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Visit us</p>
        <div className="mb-5 flex items-center justify-center gap-4">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abeni Express on Telegram"
            className="card-3d inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          >
            <Send className="h-5 w-5" />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abeni Express on Instagram"
            className="card-3d inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
          >
            <Instagram className="h-5 w-5" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 Abeni Express. Secure local &amp; international trade in Ethiopia.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
