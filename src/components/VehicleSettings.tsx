import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck } from "lucide-react";

const VEHICLES = [
  { value: "motorbike", label: "🏍️ Motorbike" },
  { value: "car", label: "🚗 Car" },
  { value: "van", label: "🚐 Van" },
  { value: "truck", label: "🚛 Truck" },
];

export function VehicleSettings({ userId }: { userId: string | null }) {
  const [vehicleType, setVehicleType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [appId, setAppId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("driver_applications")
        .select("id, vehicle_type, license_plate")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setAppId(data.id);
        setVehicleType(data.vehicle_type || "");
        setLicensePlate(data.license_plate || "");
      }
    })();
  }, [userId]);

  const save = async () => {
    if (!appId) return;
    if (!vehicleType) {
      toast.error("Select a vehicle type");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("driver_applications")
      .update({ vehicle_type: vehicleType, license_plate: licensePlate || null })
      .eq("id", appId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("Vehicle updated. You'll receive orders matching this type.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" /> Your Vehicle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You will only be offered delivery jobs matching this vehicle type.
        </p>
        <div>
          <Label>Vehicle Type *</Label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select your vehicle</option>
            {VEHICLES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>License Plate (optional)</Label>
          <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="e.g. AA-12345" />
        </div>
        <Button onClick={save} disabled={saving || !appId} className="w-full">
          {saving ? "Saving..." : "Save Vehicle"}
        </Button>
      </CardContent>
    </Card>
  );
}
