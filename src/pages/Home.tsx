import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Package, Shield, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-shopping.jpg";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-5xl font-bold leading-tight text-foreground md:text-6xl">
              Shop AliExpress Products,
              <span className="text-primary"> Pay in Birr</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Your trusted personal shopper for AliExpress in Ethiopia. Browse our curated collection or request any item you find on AliExpress.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="gap-2">
                  Browse Products
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/request-item">
                <Button size="lg" variant="secondary" className="gap-2">
                  Request an Item
                </Button>
              </Link>
              <Link to="/apply-reseller">
                <Button size="lg" variant="outline" className="gap-2">
                  Register as Reseller
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Why Shop With Us?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-8 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">Pay in ETB</h3>
              <p className="text-muted-foreground">
                All prices displayed in Ethiopian Birr. Pay through local bank transfer - simple and secure.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-8 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">Trusted Service</h3>
              <p className="text-muted-foreground">
                We handle all AliExpress ordering and shipping. Track your order every step of the way.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-8 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">Request Anything</h3>
              <p className="text-muted-foreground">
                Found something you like on AliExpress? Request a quote and we'll handle the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to Start Shopping?
          </h2>
          <p className="mb-8 text-xl text-muted-foreground">
            Create your account today and get instant quotes on any AliExpress product.
          </p>
          <Link to="/auth">
            <Button size="lg">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
