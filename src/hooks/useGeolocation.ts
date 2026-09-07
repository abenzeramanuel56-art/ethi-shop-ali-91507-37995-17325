import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

function inIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return inIframe()
        ? 'The preview window blocks location access. Open the live site in a new tab, or type your address manually — both work the same.'
        : 'Location permission denied. Enable location access for this site in your browser settings, or type your address manually.';
    case error.POSITION_UNAVAILABLE:
      return 'Location unavailable. Turn on your device GPS and try again, or type your address manually.';
    case error.TIMEOUT:
      return 'Location request timed out. Try again, or type your address manually.';
    default:
      return 'Could not read your location. You can still continue by typing your address manually.';
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser. Please type your address manually.';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw new Error(errorMsg);
    }

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      const errorMsg = 'Location needs a secure (HTTPS) connection. Please type your address manually.';
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));
      throw new Error(errorMsg);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const getFix = (enableHighAccuracy: boolean, timeout: number) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy,
          timeout,
          maximumAge: 0, // always a fresh, exact fix
        });
      });

    try {
      let position: GeolocationPosition;
      try {
        // exact GPS fix first
        position = await getFix(true, 20000);
      } catch (err: any) {
        if (err?.code === 1) throw err; // permission denied — retrying is pointless
        // fall back to a faster, coarser fix (network positioning)
        position = await getFix(false, 20000);
      }

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setState({ ...coords, error: null, loading: false });
      return coords;
    } catch (err: any) {
      const message = typeof err?.code === 'number' ? describeError(err) : (err?.message || 'Failed to get location');
      setState(prev => ({ ...prev, error: message, loading: false }));
      throw new Error(message);
    }
  }, []);

  return { ...state, requestLocation };
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const DRIVER_RATE_PER_KM = 25;

export function calculateDriverEarning(distanceKm: number): number {
  return distanceKm * DRIVER_RATE_PER_KM;
}
