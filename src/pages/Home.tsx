import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Package, Shield, TrendingUp, Truck, Wrench, Zap, Star, Globe, ChevronRight, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeroSection } from "@/components/home/HeroSection";


const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <HeroSection />

      {/* Features Section */}
      <section className="border-t border-border/50 py-20" style={{ background: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="mb-3 inline-flex items-center gap-2 text-sm text-primary font-medium">
              <span className="h-px w-8 bg-primary" />
              <span>PLATFORM FEATURES</span>
              <span className="h-px w-8 bg-primary" />
            </div>
            <h2 className="text-3xl font-black text-foreground md:text-4xl">
              {t('home.features.title')}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Truck, title: t('home.features.delivery'), desc: t('home.features.deliveryDesc'), color: 'var(--primary)' },
              { icon: Package, title: t('home.features.payment'), desc: t('home.features.paymentDesc'), color: 'var(--accent)' },
              { icon: Shield, title: t('home.features.secure'), desc: t('home.features.secureDesc'), color: 'var(--success)' },
              { icon: TrendingUp, title: t('home.features.support'), desc: t('home.features.supportDesc'), color: 'var(--warning)' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="tech-card group p-6 hover:scale-[1.02] transition-all duration-300">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl" 
                     style={{ background: `hsl(${color} / 0.15)` }}>
                  <Icon className="h-6 w-6" style={{ color: `hsl(${color})` }} />
                </div>
                <h3 className="mb-2 text-base font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories section */}
      <section className="border-t border-border/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="mb-3 inline-flex items-center gap-2 text-sm text-accent font-medium">
              <span className="h-px w-8 bg-accent" />
              <span>BROWSE BY CATEGORY</span>
              <span className="h-px w-8 bg-accent" />
            </div>
            <h2 className="text-3xl font-black text-foreground md:text-4xl">Shop Everything</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "📱", name: "Electronics", link: "/products?category=electronics" },
              { emoji: "👗", name: "Fashion", link: "/products?category=fashion" },
              { emoji: "🏠", name: "Home & Garden", link: "/products?category=home" },
              { emoji: "💄", name: "Beauty", link: "/products?category=beauty" },
              { emoji: "⚽", name: "Sports", link: "/products?category=sports" },
              { emoji: "🎮", name: "Toys & Games", link: "/products?category=toys" },
              { emoji: "🔧", name: "Services", link: "/services" },
              { emoji: "📦", name: "All Products", link: "/products" },
            ].map((cat) => (
              <Link key={cat.name} to={cat.link}>
                <div className="tech-card group flex flex-col items-center justify-center p-6 text-center hover:scale-[1.03] hover:border-primary/40 transition-all duration-300 cursor-pointer">
                  <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{cat.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Seller/Driver CTA */}
      <section className="border-t border-border/50 py-20" style={{ background: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="tech-card p-8 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'hsl(var(--primary))' }} />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'hsl(var(--primary) / 0.15)' }}>
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-foreground">{t('home.seller.title')}</h3>
                <p className="mb-6 text-muted-foreground">{t('home.seller.subtitle')}</p>
                <Link to="/apply-seller">
                  <Button className="btn-glow gap-2">
                    {t('home.seller.become')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="tech-card p-8 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'hsl(var(--accent))' }} />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'hsl(var(--accent) / 0.15)' }}>
                  <Globe className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-foreground">{t('home.driver.become')}</h3>
                <p className="mb-6 text-muted-foreground">Join our driver network and earn 25 ETB per km delivering orders across Ethiopia.</p>
                <Link to="/apply-driver">
                  <Button variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10 hover:border-accent">
                    {t('home.driver.become')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8" style={{ background: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Abeni Express. Secure local &amp; international trade in Ethiopia.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
