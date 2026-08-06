import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Apple, Download as DownloadIcon, Phone, ShieldCheck, Bell, Zap } from "lucide-react";

const ANDROID_APK = "https://median.co/share/pwplezk#apk";
const QR = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(ANDROID_APK)}`;
const PHONES = ["+251998265025", "+251941183490", "+251973189807"];

export default function Download() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden grid-3d-bg scene-3d">
        <div className="absolute left-1/4 top-10 h-96 w-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--accent))" }} />

        <div className="container relative mx-auto px-4 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary float-3d">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Abeni Express Mobile</span>
              </div>

              <h1 className="mb-5 text-4xl font-black leading-tight tracking-tight text-foreground md:text-6xl text-3d">
                Get us on <span className="gradient-text">Android &amp; iOS</span>
              </h1>

              <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Install the Abeni Express app and shop, sell, deliver and track orders from your phone — with instant
                push alerts for every order, payment and delivery update.
              </p>

              <div className="flex flex-wrap gap-4">
                <a href={ANDROID_APK} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="btn-glow h-12 gap-2 px-8 text-base font-semibold">
                    <DownloadIcon className="h-5 w-5" />
                    Download for Android
                  </Button>
                </a>
                <Button
                  size="lg"
                  variant="outline"
                  disabled
                  className="h-12 gap-2 border-accent/40 px-8 text-base font-semibold text-accent"
                >
                  <Apple className="h-5 w-5" />
                  iOS — Coming soon
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Bell, title: "Live alerts", desc: "Order & delivery push notifications" },
                  { icon: Zap, title: "Faster", desc: "Native speed, offline-friendly shell" },
                  { icon: ShieldCheck, title: "Secure", desc: "Same protected Abeni account" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="card-3d rounded-xl border border-border/60 bg-card p-4">
                    <Icon className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Card className="card-3d w-full max-w-sm border-primary/30 bg-card/80 backdrop-blur">
                <CardContent className="p-8 text-center">
                  <Badge className="mb-5">Scan to install</Badge>
                  <div className="mx-auto mb-5 w-fit rounded-2xl bg-white p-4 shadow-2xl">
                    <img src={QR} alt="QR code to download the Abeni Express Android app" width={280} height={280} loading="lazy" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Point your phone camera at the code, then tap the link to install the Android app.
                  </p>
                  <p className="mt-3 break-all text-xs text-muted-foreground/70">{ANDROID_APK}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 py-16" style={{ background: "hsl(var(--card))" }}>
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-center text-3xl font-black text-foreground">Need help installing?</h2>
          <p className="mb-8 text-center text-muted-foreground">Call the Abeni Express team any time.</p>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {PHONES.map((p) => (
              <a key={p} href={`tel:${p}`}>
                <div className="card-3d flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background p-5 font-semibold text-foreground transition-colors hover:border-primary/50">
                  <Phone className="h-4 w-4 text-primary" />
                  {p}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
