import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SignedImage, openSignedUrl } from "@/components/SignedImage";
import { Download, CheckCircle, XCircle, Package } from "lucide-react";

interface DigitalOrder {
  id: string;
  buyer_id: string;
  seller_id: string;
  digital_product_id: string;
  price_etb: number;
  status: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  download_code: string | null;
  admin_notes: string | null;
  created_at: string;
  product_title?: string;
  buyer_name?: string;
}

export default function AdminDigitalOrders() {
  const [orders, setOrders] = useState<DigitalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("digital_product_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load digital orders");
      setLoading(false);
      return;
    }

    // Enrich with product title + buyer name
    const enriched = await Promise.all(
      (data || []).map(async (o: any) => {
        const [{ data: prod }, { data: prof }] = await Promise.all([
          (supabase as any).from("digital_products").select("title").eq("id", o.digital_product_id).maybeSingle(),
          (supabase as any).from("profiles").select("full_name").eq("id", o.buyer_id).maybeSingle(),
        ]);
        return { ...o, product_title: prod?.title, buyer_name: prof?.full_name };
      })
    );

    setOrders(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const verifyPayment = async (orderId: string) => {
    setProcessingId(orderId);
    // Setting status to 'payment_verified' triggers handle_digital_order_payment_verified
    // which generates the download code, marks completed, and pays the seller.
    const { error } = await (supabase as any)
      .from("digital_product_orders")
      .update({ status: "payment_verified", admin_notes: notes[orderId] || null })
      .eq("id", orderId);
    setProcessingId(null);

    if (error) {
      toast.error("Failed to verify: " + error.message);
      return;
    }
    const order = orders.find((o: any) => o.id === orderId);
    if (order?.buyer_id) {
      supabase.functions.invoke("send-user-email", {
        body: {
          userId: order.buyer_id,
          subject: "Your Digital Purchase is Ready",
          heading: "Download Ready 🎉",
          message: "Your payment has been verified. Your download code is now available in your account notifications — use it on the digital marketplace page to access your purchase.",
        },
      }).catch((e: any) => console.error("email error", e));
    }
    toast.success("Payment verified! Buyer notified with download code.");
    fetchOrders();
  };

  const rejectPayment = async (orderId: string) => {
    setProcessingId(orderId);
    const { error } = await (supabase as any)
      .from("digital_product_orders")
      .update({ status: "rejected", admin_notes: notes[orderId] || "Payment rejected" })
      .eq("id", orderId);
    setProcessingId(null);

    if (error) {
      toast.error("Failed: " + error.message);
      return;
    }
    toast.success("Order rejected");
    fetchOrders();
  };

  const getStatusColor = (s: string) => {
    if (s === "completed") return "bg-green-500";
    if (s === "payment_verified") return "bg-blue-500";
    if (s === "pending_payment") return "bg-yellow-500";
    if (s === "rejected") return "bg-red-500";
    return "bg-muted";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" /> Digital Product Orders
        </CardTitle>
        <CardDescription>Verify payment proofs to release download codes to buyers</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground">No digital orders yet</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {order.product_title || "Digital Product"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Buyer: {order.buyer_name || order.buyer_id.slice(0, 8)} ·{" "}
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm">
                        Payment: {order.payment_method || "—"} · {order.price_etb} ETB
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  {order.payment_proof_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Proof</Label>
                      <SignedImage
                        url={order.payment_proof_url}
                        alt="Payment proof"
                        className="mt-1 max-h-48 rounded border cursor-pointer"
                        onClick={() => openSignedUrl(order.payment_proof_url)}
                      />
                    </div>
                  )}

                  {order.download_code && (
                    <div className="p-2 bg-muted rounded text-sm">
                      <span className="text-muted-foreground">Download code: </span>
                      <span className="font-mono font-bold">{order.download_code}</span>
                    </div>
                  )}

                  {order.admin_notes && (
                    <p className="text-sm text-muted-foreground">Notes: {order.admin_notes}</p>
                  )}

                  {(order.status === "pending_payment" || order.status === "payment_submitted") && (
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={notes[order.id] || ""}
                        onChange={(e) => setNotes({ ...notes, [order.id]: e.target.value })}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => verifyPayment(order.id)}
                          disabled={processingId === order.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Payment
                        </Button>
                        <Button
                          onClick={() => rejectPayment(order.id)}
                          disabled={processingId === order.id}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
