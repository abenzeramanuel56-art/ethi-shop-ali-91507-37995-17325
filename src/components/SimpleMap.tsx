import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  height?: number;
}

const COLORS: Record<string, string> = {
  seller: "#3b82f6",
  customer: "#22c55e",
  driver: "#f97316",
  default: "#8b5cf6",
};

function pinIcon(type?: string) {
  const color = COLORS[type ?? "default"] ?? COLORS.default;
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 6px 14px rgba(0,0,0,.45);border:2px solid #fff"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

const isValidCoord = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) > 0.0001;

export function SimpleMap({ locations: rawLocations, className = "", height = 260 }: SimpleMapProps) {
  const locations = (rawLocations ?? []).filter(
    (l) => isValidCoord(l?.latitude) && isValidCoord(l?.longitude) && Math.abs(l.latitude) <= 90 && Math.abs(l.longitude) <= 180,
  );
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!nodeRef.current || locations.length === 0) return;

    if (!mapRef.current) {
      mapRef.current = L.map(nodeRef.current, { scrollWheelZoom: false, attributionControl: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
      layerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    const layer = layerRef.current!;
    layer.clearLayers();

    const points: [number, number][] = locations.map((l) => [l.latitude, l.longitude]);
    locations.forEach((l) => {
      L.marker([l.latitude, l.longitude], { icon: pinIcon(l.type) })
        .bindTooltip(l.label ?? "Location", { direction: "top", offset: [0, -18] })
        .addTo(layer);
    });

    if (points.length >= 2) {
      L.polyline(points, { color: "#8b5cf6", weight: 3, dashArray: "6 8", opacity: 0.9 }).addTo(layer);
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
    } else {
      map.setView(points[0], 14);
    }

    setTimeout(() => map.invalidateSize(), 120);
  }, [locations]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const openDirections = () => {
    if (locations.length === 0) return;
    const seller = locations.find((l) => l.type === "seller") || locations[0];
    const customer = locations.find((l) => l.type === "customer") || locations[1] || locations[0];
    const url = `https://www.google.com/maps/dir/?api=1&origin=${seller.latitude},${seller.longitude}&destination=${customer.latitude},${customer.longitude}&travelmode=driving`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  };

  if (locations.length === 0) {
    return (
      <div className={`bg-muted rounded-lg p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Location not shared yet</p>
      </div>
    );
  }

  return (
    <div className={`card-3d overflow-hidden rounded-lg border border-border/60 bg-card ${className}`}>
      <div ref={nodeRef} style={{ height }} className="w-full z-0" />

      <div className="space-y-1.5 p-3">
        {locations.map((loc, i) => (
          <div key={i} className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2">
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: COLORS[loc.type ?? "default"] ?? COLORS.default }}
              />
              <div>
                <p className="text-sm font-medium">{loc.label || `Location ${i + 1}`}</p>
                <p className="text-xs text-muted-foreground">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                {
                  const url = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
                  const win = window.open(url, "_blank", "noopener,noreferrer");
                  if (!win) window.location.href = url;
                }
              }
              className="rounded-md p-2 transition-colors hover:bg-muted"
              title="Open in Google Maps"
            >
              <Navigation className="h-4 w-4" />
            </button>
          </div>
        ))}

        {locations.length >= 2 && (
          <button
            onClick={openDirections}
            className="btn-3d mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-3 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Navigation className="h-4 w-4" />
            Navigate with Google Maps
          </button>
        )}
      </div>
    </div>
  );
}
