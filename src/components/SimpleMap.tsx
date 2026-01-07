import { MapPin, Navigation } from "lucide-react";

interface Location {
  latitude: number;
  longitude: number;
  label?: string;
  type?: "seller" | "customer" | "driver";
}

interface SimpleMapProps {
  locations: Location[];
  className?: string;
}

export function SimpleMap({ locations, className = "" }: SimpleMapProps) {
  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const openDirections = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const url = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
    window.open(url, "_blank");
  };

  if (locations.length === 0) {
    return (
      <div className={`bg-muted rounded-lg p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">No locations available</p>
      </div>
    );
  }

  const getMarkerColor = (type?: string) => {
    switch (type) {
      case "seller": return "bg-blue-500";
      case "customer": return "bg-green-500";
      case "driver": return "bg-orange-500";
      default: return "bg-primary";
    }
  };

  return (
    <div className={`bg-muted rounded-lg p-4 ${className}`}>
      <div className="space-y-3">
        {locations.map((loc, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 bg-background rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getMarkerColor(loc.type)}`} />
              <div>
                <p className="font-medium">{loc.label || `Location ${index + 1}`}</p>
                <p className="text-xs text-muted-foreground">
                  {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            <button
              onClick={() => openInMaps(loc.latitude, loc.longitude)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Open in Google Maps"
            >
              <Navigation className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {locations.length >= 2 && (
        <button
          onClick={() => {
            const seller = locations.find(l => l.type === "seller") || locations[0];
            const customer = locations.find(l => l.type === "customer") || locations[1];
            openDirections(seller.latitude, seller.longitude, customer.latitude, customer.longitude);
          }}
          className="w-full mt-3 p-3 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Navigation className="h-4 w-4" />
          Get Directions in Google Maps
        </button>
      )}
    </div>
  );
}
