import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Package, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";
import RotatingBadge from "@/components/RotatingBadge";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkSellerStatus(session.user.id);
        checkDriverStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
          checkSellerStatus(session.user.id);
          checkDriverStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setIsSeller(false);
          setIsDriver(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const checkSellerStatus = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "reseller")
      .maybeSingle();
    
    setIsSeller(!!data);
  };

  const checkDriverStatus = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "driver")
      .maybeSingle();
    
    setIsDriver(!!data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">{t('nav.brand')}</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <LanguageSelector />
            <Link to="/products">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                {t('nav.browse')}
              </Button>
            </Link>
            <Link to="/request-item">
              <Button variant="default" size="sm" className="hidden md:inline-flex">
                {t('nav.request')}
              </Button>
            </Link>
            <Link to="/support">
              <Button variant="ghost" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden md:inline">{t('nav.support')}</span>
              </Button>
            </Link>
            
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="secondary" size="sm" className="hidden md:inline-flex">
                      {t('nav.admin')}
                    </Button>
                  </Link>
                )}
                {isSeller && (
                  <Link to="/seller">
                    <Button variant="secondary" size="sm" className="hidden md:inline-flex">
                      {t('nav.seller')}
                    </Button>
                  </Link>
                )}
                {isDriver && (
                  <Link to="/driver">
                    <Button variant="secondary" size="sm" className="hidden md:inline-flex">
                      {t('nav.driver')}
                    </Button>
                  </Link>
                )}
                <Link to="/cart">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </Link>
                <NotificationBell />
                <Link to="/account">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="hidden md:inline-flex">
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
              <Link to={`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`}>
                <Button variant="default" size="sm">{t('nav.signIn')}</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <RotatingBadge />
    </nav>
  );
};
