import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTabLocks, type TabLocks } from "@/hooks/useTabLocks";

interface Props {
  tab: keyof TabLocks;
  children: React.ReactNode;
  label?: string;
}

export function TabLockGate({ tab, children, label }: Props) {
  const { locks, isAdmin, loading } = useTabLocks();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (locks[tab] && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-2xl text-center">
          <div className="tech-card p-8 md:p-12 space-y-6">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30 mx-auto">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-primary uppercase mb-2">Coming Soon</p>
              <h1 className="text-3xl md:text-4xl font-black">{label || tab} is launching soon</h1>
              <p className="text-muted-foreground mt-3">
                We're putting the final polish on this section of Abeni Express. Check back shortly — it will be worth the wait.
              </p>
            </div>
            <Link to="/">
              <Button className="btn-glow"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
