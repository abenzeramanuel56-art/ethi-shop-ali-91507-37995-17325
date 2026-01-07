import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  label?: string;
  showManualInput?: boolean;
}

export function LocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  label = "Location",
  showManualInput = true,
}: LocationPickerProps) {
  const { loading, error, requestLocation } = useGeolocation();
  const [manualLat, setManualLat] = useState(latitude?.toString() || "");
  const [manualLng, setManualLng] = useState(longitude?.toString() || "");
  const [manualAddress, setManualAddress] = useState(address || "");

  const handleGetLocation = async () => {
    try {
      const coords = await requestLocation();
      onLocationChange(coords.latitude, coords.longitude);
    } catch (err) {
      console.error("Failed to get location:", err);
    }
  };

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onLocationChange(lat, lng, manualAddress || undefined);
    }
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleGetLocation}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Getting Location...
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4 mr-2" />
            Use Current Location
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {latitude && longitude && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
      )}

      {showManualInput && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm text-muted-foreground">Or enter manually:</p>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g., 9.0192"
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="e.g., 38.7525"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs">Address (optional)</Label>
            <Input
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Enter store address"
            />
          </div>
          
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleManualSubmit}
            disabled={!manualLat || !manualLng}
          >
            Set Location
          </Button>
        </div>
      )}
    </div>
  );
}
