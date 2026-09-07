import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState(latitude?.toString() || "");
  const [manualLng, setManualLng] = useState(longitude?.toString() || "");
  const [manualAddress, setManualAddress] = useState(address || "");

  // Live-sync manual inputs to parent when both are valid numbers
  useEffect(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      if (lat !== latitude || lng !== longitude) {
        onLocationChange(lat, lng, manualAddress || undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualLat, manualLng, manualAddress]);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  // Check permission status on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      }).catch(() => {
        // Some browsers don't support this
      });
    }
  }, []);

  const handleGetLocation = async () => {
    setError(null);
    setLoading(true);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter location manually.");
      setLoading(false);
      return;
    }

    // Check if we're on HTTPS (required for geolocation in most browsers)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      setError("Location access requires a secure connection (HTTPS). Please enter your location manually below.");
      setLoading(false);
      return;
    }

    try {
      // Ask for the most precise GPS fix available; fall back to a fast/coarse fix.
      const getFix = (highAccuracy: boolean, timeout: number) =>
        new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout,
            maximumAge: 0, // always a fresh, exact fix — never a cached one
          });
        });

      let position: GeolocationPosition;
      try {
        position = await getFix(true, 20000);
      } catch (highAccErr: any) {
        if (highAccErr?.code === 1) throw highAccErr; // permission denied — don't retry
        position = await getFix(false, 20000);
      }

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      // Reverse-geocode lat/lng → real street address (no key needed)
      let detected = manualAddress;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`, {
          headers: { "Accept-Language": "en" },
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.display_name) detected = j.display_name as string;
        }
      } catch (e) { console.warn("Reverse geocode failed", e); }
      onLocationChange(coords.latitude, coords.longitude, detected || undefined);
      setManualLat(coords.latitude.toString());
      setManualLng(coords.longitude.toString());
      if (detected) setManualAddress(detected);
      setError(null);
    } catch (err: any) {
      const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
      let errorMessage = "Failed to get location. Please pick a city or enter coordinates manually below.";

      if (err.code === 1) { // PERMISSION_DENIED
        if (inIframe) {
          errorMessage = "The preview window blocks location access. Open the live site in a new tab to grant location, or just pick your city / type coordinates below — both work the same.";
        } else {
          errorMessage = "Location permission denied. Enable location access in your browser settings, or pick your city / type coordinates below.";
        }
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        errorMessage = "Location unavailable. Check your device GPS, or pick your city / type coordinates below.";
      } else if (err.code === 3) { // TIMEOUT
        errorMessage = "Location request timed out. Try again, or pick your city below.";
      }

      console.error("Geolocation error:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onLocationChange(lat, lng, manualAddress || undefined);
      setError(null);
    }
  };

  // Common Ethiopian city coordinates for quick selection
  const quickLocations = [
    { name: "Addis Ababa", lat: 9.0192, lng: 38.7525 },
    { name: "Dire Dawa", lat: 9.6, lng: 41.85 },
    { name: "Mekelle", lat: 13.4967, lng: 39.4767 },
    { name: "Bahir Dar", lat: 11.5936, lng: 37.3908 },
    { name: "Hawassa", lat: 7.0622, lng: 38.4769 },
  ];

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

      {permissionStatus === 'denied' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Location access is blocked. Please enable it in your browser settings or enter location manually.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
          <p className="text-sm text-muted-foreground">Or enter manually / select a city:</p>
          
          {/* Quick city selection */}
          <div className="flex flex-wrap gap-2">
            {quickLocations.map((loc) => (
              <Button
                key={loc.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setManualLat(loc.lat.toString());
                  setManualLng(loc.lng.toString());
                  setManualAddress(loc.name);
                  onLocationChange(loc.lat, loc.lng, loc.name);
                }}
              >
                {loc.name}
              </Button>
            ))}
          </div>
          
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
