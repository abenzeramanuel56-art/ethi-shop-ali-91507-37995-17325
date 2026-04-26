import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import comingSoonHero from "@/assets/coming-soon-hero.jpg";
import comingSoonExport from "@/assets/coming-soon-export.jpg";
import comingSoonDelivery from "@/assets/coming-soon-delivery.jpg";

interface MaintenanceContextValue {
  enabled: boolean;
  message: string;
  loading: boolean;
}

export function useMaintenance(): MaintenanceContextValue {
  const [state, setState] = useState<MaintenanceContextValue>({ enabled: false, message: "", loading: true });

  useEffect(() => {
    let mounted = true;
    const fetchSetting = async () => {
      const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "maintenance_mode").maybeSingle();
      if (mounted) {
        setState({
          enabled: data?.value?.enabled === true,
          message: data?.value?.message || "We'll be back shortly.",
          loading: false,
        });
      }
    };
    fetchSetting();

    const channel = supabase
      .channel("app-settings-maintenance")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => fetchSetting())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

export function ComingSoonScreen({ message }: { message: string }) {
  const [page, setPage] = useState(0);
  const totalPages = 3;

  useEffect(() => {
    const t = setInterval(() => setPage((p) => (p + 1) % totalPages), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Coming Soon</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3">
            AbeniExpress
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {message}
          </p>
        </div>

        {/* Page indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${i === page ? "w-12 bg-primary" : "w-6 bg-muted"}`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>

        {page === 0 && (
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-4xl font-black">The Future of Ethiopian Commerce</h2>
              <p className="text-muted-foreground leading-relaxed">
                AbeniExpress is Ethiopia's premium tech-driven marketplace connecting customers, sellers, drivers and service providers in one secure platform.
              </p>
              <ul className="space-y-2">
                {[
                  "🛍️ Buy authentic products in ETB with TeleBirr & CBE",
                  "🚚 Real-time GPS delivery tracking by local drivers",
                  "🛠️ Hire skilled professionals for any service",
                  "💼 Sellers earn instantly with secure wallet payouts",
                  "💻 Buy & sell digital products (apps, code, files)",
                  "🔒 AI-verified listings & encrypted transactions",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
              <img src={comingSoonHero} alt="AbeniExpress vision" className="w-full h-auto" loading="lazy" width={1920} height={1080} />
            </div>
          </div>
        )}

        {page === 1 && (
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl order-2 lg:order-1">
              <img src={comingSoonExport} alt="Global trade" className="w-full h-auto" loading="lazy" width={1920} height={1080} />
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <div className="inline-block px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-xs font-bold text-accent uppercase">Upcoming Feature</div>
              <h2 className="text-2xl md:text-4xl font-black">Connect Ethiopia to the World 🌍</h2>
              <p className="text-muted-foreground leading-relaxed">
                In the upcoming AbeniExpress, you'll be able to <span className="text-primary font-bold">export Ethiopian products</span> like coffee, spices, textiles, and leather to international buyers in the USA, Europe and beyond.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Equally, <span className="text-primary font-bold">import authentic foreign products</span> directly from international countries to your doorstep in Addis Ababa, Adama, Bahir Dar, Hawassa and more.
              </p>
              <ul className="grid grid-cols-2 gap-2 mt-4">
                {["🇺🇸 USA Marketplace", "🇪🇺 Europe Direct", "🇨🇳 China Imports", "🇦🇪 Dubai Deals", "✈️ Airfreight tracking", "📦 Customs handled"].map((x) => (
                  <li key={x} className="text-sm bg-muted/50 border border-border/40 rounded-lg px-3 py-2">{x}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {page === 2 && (
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-xs font-bold text-primary uppercase">Local Delivery Network</div>
              <h2 className="text-2xl md:text-4xl font-black">Drivers Earn. Customers Track. Sellers Win.</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our verified driver network delivers across Ethiopia with live GPS tracking. Drivers earn <span className="text-primary font-bold">25 ETB per kilometer</span>, sellers receive instant wallet payouts, and customers see exactly where their order is.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                  { v: "25 ETB", l: "Per KM" },
                  { v: "10%", l: "Commission" },
                  { v: "24/7", l: "Live tracking" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-muted/40 border border-border/40 p-3 text-center">
                    <div className="text-xl md:text-2xl font-black text-primary">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic mt-4">
                Built with ❤️ in Ethiopia · Powered by tech, secured by trust.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
              <img src={comingSoonDelivery} alt="AbeniExpress delivery" className="w-full h-auto" loading="lazy" width={1920} height={1080} />
            </div>
          </div>
        )}

        <div className="text-center mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} AbeniExpress · Ethiopia
        </div>
      </div>
    </div>
  );
}

export function MaintenanceGate({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  const { enabled, message, loading } = useMaintenance();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (enabled && !isAdmin) {
    return <ComingSoonScreen message={message} />;
  }

  return <>{children}</>;
}
