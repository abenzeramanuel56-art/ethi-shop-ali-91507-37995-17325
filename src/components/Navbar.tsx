import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Package, MessageCircle, Zap, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";

import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkRoles(session.user.id);
        } else {
          setIsAdmin(false);
          setIsSeller(false);
          setIsDriver(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkRoles = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (data) {
      setIsAdmin(data.some((r: any) => r.role === "admin"));
      setIsSeller(data.some((r: any) => r.role === "reseller"));
      setIsDriver(data.some((r: any) => r.role === "driver"));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="Abeni Express Logo">
            <div
              role="img"
              aria-label="Abeni Express Logo"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <Zap className="h-5 w-5 text-white" aria-hidden="true" />
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ boxShadow: 'var(--glow-primary)' }} />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">
              Abeni<span className="text-primary">Express</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/products">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {t('nav.browse')}
              </Button>
            </Link>
            <Link to="/services">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {t('nav.services')}
              </Button>
            </Link>
            <Link to="/digital-market">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Digital
              </Button>
            </Link>
            <Link to="/request-item">
              <Button size="sm" className="ml-1">
                {t('nav.request')}
              </Button>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <Link to="/support">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </Link>
            
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="hidden md:block">
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary text-xs">
                      Admin
                    </Button>
                  </Link>
                )}
                {isSeller && (
                  <Link to="/seller" className="hidden md:block">
                    <Button size="sm" variant="outline" className="border-accent/30 text-accent hover:bg-accent/10 hover:border-accent text-xs">
                      Seller
                    </Button>
                  </Link>
                )}
                {isDriver && (
                  <Link to="/driver" className="hidden md:block">
                    <Button size="sm" variant="outline" className="border-success/30 text-success hover:bg-success/10 text-xs" style={{ borderColor: 'hsl(var(--success) / 0.3)', color: 'hsl(var(--success))' }}>
                      Driver
                    </Button>
                  </Link>
                )}
                {user && (
                  <Link to="/affiliate" className="hidden md:block">
                    <Button size="sm" variant="outline" className="border-accent/30 text-accent hover:bg-accent/10 text-xs">
                      Affiliate
                    </Button>
                  </Link>
                )}
                <Link to="/cart">
                  <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </Link>
                <NotificationBell />
                <Link to="/account">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:flex text-muted-foreground hover:text-foreground text-xs">
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
              <Link to={`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`}>
                <Button size="sm" className="btn-glow">{t('nav.signIn')}</Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-border/50 pt-3 space-y-1">
            <Link to="/products" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">{t('nav.browse')}</Button>
            </Link>
            <Link to="/services" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">{t('nav.services')}</Button>
            </Link>
            <Link to="/digital-market" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">Digital Market</Button>
            </Link>
            <Link to="/request-item" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">{t('nav.request')}</Button>
            </Link>
            {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)}><Button variant="ghost" size="sm" className="w-full justify-start text-primary">Admin Panel</Button></Link>}
            {isSeller && <Link to="/seller" onClick={() => setMobileOpen(false)}><Button variant="ghost" size="sm" className="w-full justify-start text-accent">Seller Dashboard</Button></Link>}
            {isDriver && <Link to="/driver" onClick={() => setMobileOpen(false)}><Button variant="ghost" size="sm" className="w-full justify-start" style={{color:'hsl(var(--success))'}}>Driver Dashboard</Button></Link>}
            {user && <Link to="/affiliate" onClick={() => setMobileOpen(false)}><Button variant="ghost" size="sm" className="w-full justify-start text-accent">Affiliate Market</Button></Link>}
            {user && <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>{t('nav.signOut')}</Button>}
          </div>
        )}
      </div>
      
    </nav>
  );
};
