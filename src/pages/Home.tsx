import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Package, Shield, TrendingUp, Truck, Wrench, Zap, Star, Globe, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThreeDHero } from "@/components/ThreeDHero";


const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden grid-3d-bg scene-3d">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'hsl(var(--primary))' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl" style={{ background: 'hsl(var(--accent))' }} />

        {/* WebGL delivery-network globe */}
        <ThreeDHero className="absolute right-[-10%] top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 opacity-80 lg:block" />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary float-3d">
              <Zap className="h-3.5 w-3.5" />
              <span>Ethiopia's Premier Marketplace</span>
            </div>

            <h1 className="mb-6 text-5xl font-black leading-tight text-foreground md:text-6xl lg:text-7xl tracking-tight text-3d">
              <span className="sr-only">Abeni Express — </span>
              {t('home.hero.title').split(' ').slice(0, 2).join(' ')}
              <span className="block gradient-text">{t('home.hero.title').split(' ').slice(2).join(' ')}</span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="gap-2 btn-glow font-semibold text-base px-8 h-12">
                  {t('home.hero.browse')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="gap-2 font-semibold text-base px-8 h-12 border-accent/40 text-accent hover:bg-accent/10 hover:border-accent">
                  <Wrench className="h-5 w-5" />
                  {t('home.services.browse')}
                </Button>
              </Link>
              <Link to="/digital-market">
                <Button size="lg" variant="outline" className="gap-2 font-semibold text-base px-8 h-12 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary">
                  <Smartphone className="h-5 w-5" />
                  Browse Digital
                </Button>
              </Link>
              <Link to="/download">
                <Button size="lg" variant="ghost" className="gap-2 font-semibold text-base px-8 h-12 text-muted-foreground hover:text-foreground">
                  Get us on Android &amp; iOS
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-16 flex flex-wrap gap-8">
              {[
                { value: "100%", label: "Ethiopian Owned" },
                { value: "25 ETB/km", label: "Driver Earnings" },
                { value: "24/7", label: "Driver Network" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-black gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
