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
import { Clock, DollarSign, Briefcase, Upload, Loader2 } from "lucide-react";

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
  
  // Form state
  const [hours, setHours] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

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
    
    // Get user phone from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();
    
    if (profile?.phone) {
      setPhone(profile.phone);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!service || !userId) return;

    if (!phone) {
      toast({
        title: "Phone required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let paymentProofUrl = null;

      // Upload payment proof if provided
      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, paymentProof);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(fileName);
        
        paymentProofUrl = urlData.publicUrl;
      }

      // Create service order
      const { error } = await supabase
        .from("service_orders")
        .insert({
          service_id: service.id,
          customer_id: userId,
          seller_id: service.seller_id,
          quantity: service.price_type === "fixed" ? quantity : 1,
          hours: service.price_type === "hourly" ? hours : null,
          total_etb: calculateTotal(),
          status: paymentProofUrl ? "payment_submitted" : "pending_payment",
          payment_proof_url: paymentProofUrl,
          payment_method: paymentMethod,
          customer_phone: phone,
          notes,
        });

      if (error) throw error;

      toast({
        title: "Order placed!",
        description: paymentProofUrl 
          ? "Your order has been submitted. We'll verify your payment and notify you."
          : "Please complete your payment and upload proof.",
      });

      navigate("/account");
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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

            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cbe">CBE (Commercial Bank of Ethiopia)</SelectItem>
                    <SelectItem value="telebirr">Telebirr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">Payment Instructions:</p>
                  {paymentMethod === "cbe" && (
                    <p className="text-sm">Transfer to CBE Account: 1000XXXXXXXX</p>
                  )}
                  {paymentMethod === "telebirr" && (
                    <p className="text-sm">Send to Telebirr: 09XXXXXXXX</p>
                  )}
                </div>
              )}

              {/* Payment Proof */}
              <div className="space-y-2">
                <Label>Payment Proof (Screenshot)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {paymentProof && (
                    <span className="text-sm text-green-600">✓ Selected</span>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{calculateTotal()} ETB</span>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}