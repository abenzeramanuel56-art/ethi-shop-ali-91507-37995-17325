import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, DollarSign, Briefcase, Upload, Loader2, MapPin } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CommercePayment } from "@/components/CommercePayment";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_etb: number;
  price_type: string;
  seller_id: string;
  seller_stores?: {
    store_name: string;
    contact_phone: string | null;
  };
}

export default function OrderService() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const { loading: locationLoading, requestLocation } = useGeolocation();
  const [customerLatitude, setCustomerLatitude] = useState<number | null>(null);
  const [customerLongitude, setCustomerLongitude] = useState<number | null>(null);
  
  // Form state
  const [hours, setHours] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [savedOrder, setSavedOrder] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to order a service",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    
    // Get user phone and name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, full_name, latitude, longitude")
      .eq("id", user.id)
      .single();
    
    if (profile?.phone) {
      setPhone(profile.phone);
    }
    if (profile?.full_name) {
      setCustomerName(profile.full_name);
    }
    if (profile?.latitude && profile?.longitude) {
      setCustomerLatitude(profile.latitude);
      setCustomerLongitude(profile.longitude);
    }
  };

  const handleGetLocation = async () => {
    try {
      const coords = await requestLocation();
      if (
        !coords ||
        typeof coords.latitude !== "number" ||
        typeof coords.longitude !== "number" ||
        Number.isNaN(coords.latitude) ||
        Number.isNaN(coords.longitude)
      ) {
        throw new Error("Could not read your coordinates. Please type your address instead.");
      }
      setCustomerLatitude(coords.latitude);
      setCustomerLongitude(coords.longitude);
      toast({
        title: "Location Captured",
        description: "Your location has been saved for this order.",
      });
    } catch (err: any) {
      const description =
        typeof err === "string"
          ? err
          : err?.message || "Failed to get your location. Please enable location access.";
      toast({
        title: "Location Error",
        description,
        variant: "destructive",
      });
    }
  };

  const fetchService = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .single();

    if (error || !data) {
      toast({
        title: "Service not found",
        description: "This service no longer exists",
        variant: "destructive",
      });
      navigate("/services");
      return;
    }

    // Fetch seller store separately
    const { data: store } = await supabase
      .from("seller_stores")
      .select("store_name, contact_phone")
      .eq("id", data.seller_id)
      .single();
    
    setService({ ...data, seller_stores: store } as Service);
    setLoading(false);
  };

  const calculateTotal = () => {
    if (!service) return 0;
    if (service.price_type === "hourly") {
      return service.price_etb * hours;
    }
    return service.price_etb * quantity;
  };

  const prepareOrder = async () => {
    if (!service || !userId || !phone.trim()) throw new Error("Phone required");
    const { data, error } = await supabase.from("service_orders").insert({
      service_id: service.id, customer_id: userId, seller_id: service.seller_id,
      quantity: service.price_type === "fixed" ? quantity : 1,
      hours: service.price_type === "hourly" ? hours : null,
      total_etb: calculateTotal(), status: "pending_payment", customer_phone: phone,
      customer_name: customerName, customer_latitude: customerLatitude,
      customer_longitude: customerLongitude, notes,
    }).select("id,total_etb").single();
    if (error || !data) throw error ?? new Error("Order unavailable");
    setSavedOrder(true);
    return { id: data.id, total: Number(data.total_etb) };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading service...</p>
      </div>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Order Service
            </CardTitle>
            <CardDescription>Complete your service order</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Service Info */}
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{service.price_etb} ETB</span>
                  {service.price_type === "hourly" && <span>/hour</span>}
                </div>
                {service.seller_stores && (
                  <span className="text-sm text-muted-foreground">
                    by {service.seller_stores.store_name}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <fieldset disabled={savedOrder} className="space-y-6">
              {/* Quantity/Hours */}
              {service.price_type === "hourly" ? (
                <div className="space-y-2">
                  <Label>Number of Hours</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={hours}
                      onChange={(e) => setHours(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                </div>
              )}

              {/* Phone */}
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  required
                />
              </div>

              {/* Your Location */}
              <div className="space-y-2">
                <Label>Your Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="w-full"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      {customerLatitude ? "Location Captured ✓" : "Share My Location"}
                    </>
                  )}
                </Button>
                {customerLatitude && customerLongitude && (
                  <p className="text-xs text-muted-foreground text-center">
                    📍 Location saved for the service provider
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements or details..."
                  rows={3}
                />
              </div>

              </fieldset>

              {/* Total */}
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{calculateTotal()} ETB</span>
                </div>
              </div>

              <CommercePayment kind="service" prepare={prepareOrder} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}