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
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-5"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container relative mx-auto px-4 py-32">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-6xl font-bold leading-tight text-foreground md:text-7xl">
              Shop AliExpress Products,
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Pay in Birr</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground leading-relaxed">
              Your trusted personal shopper for AliExpress in Ethiopia. Browse our curated collection or request any item you find on AliExpress.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="gap-2 shadow-glow hover:shadow-lg transition-all">
                  Browse Products
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/request-item">
                <Button size="lg" variant="outline" className="gap-2 border-2 hover:bg-secondary hover:text-secondary-foreground transition-all">
                  Request an Item
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-gradient-to-b from-muted/30 to-background py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-16 text-center text-4xl font-bold text-foreground">
            Why Shop With Us?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border bg-card/80 backdrop-blur-sm p-8 text-center shadow-soft transition-all hover:shadow-glow hover:-translate-y-1">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-gradient-primary p-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">Pay in ETB</h3>
              <p className="text-muted-foreground leading-relaxed">
                All prices displayed in Ethiopian Birr. Pay through local bank transfer - simple and secure.
              </p>
            </div>

            <div className="group rounded-2xl border bg-card/80 backdrop-blur-sm p-8 text-center shadow-soft transition-all hover:shadow-glow hover:-translate-y-1">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-gradient-secondary p-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">Trusted Service</h3>
              <p className="text-muted-foreground leading-relaxed">
                We handle all AliExpress ordering and shipping. Track your order every step of the way.
              </p>
            </div>

            <div className="group rounded-2xl border bg-card/80 backdrop-blur-sm p-8 text-center shadow-soft transition-all hover:shadow-glow hover:-translate-y-1">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-gradient-accent p-4 shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">Request Anything</h3>
              <p className="text-muted-foreground leading-relaxed">
                Found something you like on AliExpress? Request a quote and we'll handle the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="mb-6 text-4xl font-bold text-foreground">
              Ready to Start Shopping?
            </h2>
            <p className="mb-10 text-xl text-muted-foreground leading-relaxed">
              Create your account today and get instant quotes on any AliExpress product.
            </p>
            <Link to="/auth">
              <Button size="lg" className="shadow-glow hover:shadow-xl transition-all px-8 py-6 text-lg">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
