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
    checkAuth();
    fetchServices();
  }, [selectedCategory]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchServices = async () => {
    let query = supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category", selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching services:", error);
      setLoading(false);
      return;
    }

    // Fetch seller stores separately
    const servicesWithStores = await Promise.all(
      (data || []).map(async (service) => {
        const { data: store } = await supabase
          .from("seller_stores")
          .select("store_name, contact_phone")
          .eq("id", service.seller_id)
          .single();
        return { ...service, seller_stores: store };
      })
    );

    setServices(servicesWithStores as Service[]);
    setLoading(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading services...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Briefcase className="h-8 w-8" />
            Browse Services
          </h1>
          <p className="text-muted-foreground">Find professionals for all your needs</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-64">
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
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "all"
                  ? "No services found matching your criteria"
                  : "No services available yet. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <Card key={service.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{service.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {getCategoryLabel(service.category)}
                    </Badge>
                  </div>
                  {service.custom_category && (
                    <Badge variant="outline" className="w-fit">
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
                        <span className="font-semibold">{service.price_etb} ETB</span>
                        {service.price_type === "hourly" && (
                          <span className="text-muted-foreground">/hour</span>
                        )}
                      </div>
                      {service.price_type === "hourly" && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Hourly</span>
                        </div>
                      )}
                    </div>
                    
                    {service.seller_stores && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{service.seller_stores.store_name}</span>
                      </div>
                    )}
                    
                    <Button
                      className="w-full"
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
import { TabLockGate as _TabLockGateSvc } from "@/components/TabLockGate";
export default function ServicesPage() {
  return <_TabLockGateSvc tab="services" label="Services marketplace"><ServicesInner /></_TabLockGateSvc>;
}
