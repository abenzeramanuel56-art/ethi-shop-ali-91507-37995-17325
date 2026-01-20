import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Package, Shield, TrendingUp, Truck, Wrench } from "lucide-react";
import heroImage from "@/assets/hero-shopping.jpg";
import { useLanguage } from "@/contexts/LanguageContext";

const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container relative mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl">
              {t('home.hero.title')}
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="gap-2">
                  {t('home.hero.browse')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Wrench className="h-5 w-5" />
                  {t('home.services.browse')}
                </Button>
              </Link>
              <Link to="/request-item">
                <Button size="lg" variant="outline" className="gap-2">
                  {t('home.hero.request')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-foreground">
            {t('home.features.title')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{t('home.features.delivery')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.features.deliveryDesc')}</p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{t('home.features.payment')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.features.paymentDesc')}</p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{t('home.features.secure')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.features.secureDesc')}</p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{t('home.features.support')}</h3>
              <p className="text-sm text-muted-foreground">{t('home.features.supportDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Seller CTA */}
      <section className="border-t py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            {t('home.seller.title')}
          </h2>
          <p className="mb-6 text-muted-foreground">
            {t('home.seller.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/apply-seller">
              <Button size="lg">{t('home.seller.become')}</Button>
            </Link>
            <Link to="/apply-driver">
              <Button size="lg" variant="secondary">{t('home.driver.become')}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
