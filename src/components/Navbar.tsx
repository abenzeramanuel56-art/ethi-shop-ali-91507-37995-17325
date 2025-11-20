import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Package, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";
import RotatingBadge from "@/components/RotatingBadge";
import LanguageSelector from "@/components/LanguageSelector";

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReseller, setIsReseller] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkResellerStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdminStatus(session.user.id);
          checkResellerStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setIsReseller(false);
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

  const checkResellerStatus = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "reseller")
      .maybeSingle();
    
    setIsReseller(!!data);
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
            <span className="text-2xl font-bold text-foreground">AliExpress Ethiopia</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/products">
              <Button variant="ghost">Browse Products</Button>
            </Link>
            <Link to="/request-item">
              <Button variant="default">Request Item</Button>
            </Link>
            <Link to="/support">
              <Button variant="ghost" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" />
                Support
              </Button>
            </Link>
            
            {user ? (
              <>
                <div className="hidden sm:block">
                  <LanguageSelector />
                </div>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="secondary">Admin Panel</Button>
                  </Link>
                )}
                {isReseller && (
                  <Link to="/reseller">
                    <Button variant="secondary">Reseller Dashboard</Button>
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
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to={`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`}>
                <Button variant="default">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <RotatingBadge />
    </nav>
  );
};
