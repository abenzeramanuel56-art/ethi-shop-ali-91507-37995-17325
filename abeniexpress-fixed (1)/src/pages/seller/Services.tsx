import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const SERVICE_CATEGORIES = [
  "Maintenance",
  "Tutoring",
  "Tech Support",
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Gardening",
  "Moving",
  "Photography",
  "Catering",
  "Beauty",
  "Fitness",
  "Music Lessons",
  "Language Lessons",
  "Consulting",
  "Design",
  "Writing",
  "Other"
];

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  custom_category: string | null;
  price_etb: number;
  price_type: string;
  is_active: boolean;
  created_at: string;
}

export default function SellerServices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Other",
    custom_category: "",
    price_etb: "",
    price_type: "fixed"
  });

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is a reseller
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "reseller")
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You need to be a seller to access this page",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    // Get store
    const { data: storeData } = await supabase
      .from("seller_stores")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!storeData) {
      toast({
        title: "Setup Required",
        description: "Please set up your store first",
        variant: "destructive"
      });
      navigate("/seller/setup");
      return;
    }

    setStoreId(storeData.id);
    await fetchServices(storeData.id);
  };

  const fetchServices = async (sellerId: string) => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive"
      });
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!storeId || !formData.title || !formData.description || !formData.price_etb) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const serviceData = {
      seller_id: storeId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      custom_category: formData.category === "Other" ? formData.custom_category : null,
      price_etb: parseFloat(formData.price_etb),
      price_type: formData.price_type,
      is_active: true
    };

    if (editingService) {
      const { error } = await supabase
        .from("services")
        .update(serviceData)
        .eq("id", editingService.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update service",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service updated successfully"
      });
    } else {
      const { error } = await supabase
        .from("services")
        .insert(serviceData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add service",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service added successfully"
      });
    }

    resetForm();
    fetchServices(storeId);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "Other",
      custom_category: "",
      price_etb: "",
      price_type: "fixed"
    });
    setEditingService(null);
    setShowForm(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      custom_category: service.custom_category || "",
      price_etb: service.price_etb.toString(),
      price_type: service.price_type
    });
    setShowForm(true);
  };

  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: isActive })
      .eq("id", serviceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive"
      });
      return;
    }

    fetchServices(storeId!);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Service deleted"
    });
    fetchServices(storeId!);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            My Services
          </h1>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? "Edit Service" : "Add New Service"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Service Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Home Tutoring for Math"
                  />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your service in detail..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.category === "Other" && (
                  <div>
                    <Label>Custom Category</Label>
                    <Input
                      value={formData.custom_category}
                      onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                      placeholder="Specify your category"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (ETB) *</Label>
                    <Input
                      type="number"
                      value={formData.price_etb}
                      onChange={(e) => setFormData({ ...formData, price_etb: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Price Type</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(value) => setFormData({ ...formData, price_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="hourly">Per Hour</SelectItem>
                        <SelectItem value="per_unit">Per Unit/Session</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} className="flex-1">
                    {editingService ? "Update Service" : "Add Service"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No services yet. Add your first service!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className={!service.is_active ? "opacity-60" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-lg">{service.title}</span>
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mb-2">
                    {service.category === "Other" && service.custom_category 
                      ? service.custom_category 
                      : service.category}
                  </Badge>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-1 text-lg font-bold text-primary mb-4">
                    <DollarSign className="h-4 w-4" />
                    {service.price_etb.toLocaleString()} ETB
                    <span className="text-sm font-normal text-muted-foreground">
                      / {service.price_type === "hourly" ? "hour" : 
                         service.price_type === "per_unit" ? "unit" : "service"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={(checked) => handleToggleActive(service.id, checked)}
                      />
                      <span className="text-sm">{service.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(service)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
