import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, DollarSign, User, Briefcase, Phone } from "lucide-react";
import { TabLockGate } from "@/components/TabLockGate";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  custom_category: string | null;
  price_etb: number;
  price_type: string;
  seller_id: string;
  seller_stores?: {
    store_name: string;
    contact_phone: string | null;
  };
}

const SERVICE_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "maintenance", label: "Maintenance & Repair" },
  { value: "tutoring", label: "Tutoring & Education" },
  { value: "tech_support", label: "Tech Support" },
  { value: "cleaning", label: "Cleaning" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "beauty", label: "Beauty & Wellness" },
  { value: "fitness", label: "Fitness & Training" },
  { value: "photography", label: "Photography & Video" },
  { value: "catering", label: "Catering & Food" },
  { value: "moving", label: "Moving & Transport" },
  { value: "gardening", label: "Gardening & Landscaping" },
  { value: "pet_care", label: "Pet Care" },
  { value: "tailoring", label: "Tailoring & Fashion" },
  { value: "consulting", label: "Consulting & Business" },
  { value: "other", label: "Other" },
];

function ServicesInner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkAuth(isMounted);
    fetchServices(isMounted);
    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  const checkAuth = async (isMounted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (isMounted) {
      setUserId(user?.id || null);
    }
  };

  const fetchServices = async (isMounted: boolean) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Services fetch timeout")), 6000)
      );

      const fetchPromise = (async () => {
        let query = (supabase as any)
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (selectedCategory !== "all") {
          query = query.eq("category", selectedCategory);
        }

        const { data, error } = await query;

        if (!isMounted) return;
        if (error) throw error;

        // Fetch seller stores separately
        const servicesWithStores = await Promise.all(
          (data || []).map(async (service: Service) => {
            const { data: store } = await (supabase as any)
              .from("seller_stores")
              .select("store_name, contact_phone")
              .eq("id", service.seller_id)
              .single();
            return { ...service, seller_stores: store || undefined };
          })
        );

        if (isMounted) {
          setServices(servicesWithStores as Service[]);
        }
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      console.error("Error fetching services or timed out:", error);
      toast({
        title: "Error",
        description: "Failed to load services. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOrderService = (service: Service) => {
    if (!userId) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to order a service",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    navigate(`/order-service/${service.id}`);
  };

  const getCategoryLabel = (category: string) => {
    return SERVICE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 animate-pulse rounded bg-muted mb-2" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="tech-card overflow-hidden">
                <CardHeader>
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-16 animate-pulse rounded bg-muted" />
                  <div className="h-8 animate-pulse rounded bg-muted w-1/2" />
                  <div className="h-10 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2 flex items-center gap-2 text-foreground">
            <Briefcase className="h-8 w-8 text-primary" />
            Browse Services
          </h1>
          <p className="text-sm text-muted-foreground">Find professionals for all your needs</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-64 bg-muted/50 border-border/50">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <Card className="tech-card p-12 text-center">
            <CardContent className="pt-6">
              <p className="text-lg text-muted-foreground">
                {searchQuery || selectedCategory !== "all"
                  ? "No services found matching your criteria"
                  : "No services available yet. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <Card key={service.id} className="tech-card flex flex-col hover:border-primary/40 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2 text-foreground">{service.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {getCategoryLabel(service.category)}
                    </Badge>
                  </div>
                  {service.custom_category && (
                    <Badge variant="outline" className="w-fit text-xs">
                      {service.custom_category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {service.description}
                  </p>
                  
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">{service.price_etb.toLocaleString()} ETB</span>
                        {service.price_type === "hourly" && (
                          <span className="text-xs text-muted-foreground">/hour</span>
                        )}
                      </div>
                      {service.price_type === "hourly" && (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Hourly</span>
                        </div>
                      )}
                    </div>
                    
                    {service.seller_stores && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{service.seller_stores.store_name}</span>
                      </div>
                    )}
                    
                    <Button
                      className="w-full font-bold btn-glow h-9 text-xs"
                      onClick={() => handleOrderService(service)}
                    >
                      Order Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <TabLockGate tab="services" label="Services marketplace">
      <ServicesInner />
    </TabLockGate>
  );
}
