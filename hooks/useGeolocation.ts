"use client";

import { useState, useCallback } from "react";

interface GpsCoords {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback((): Promise<GpsCoords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("Geolocation not supported");
        resolve(null);
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const result = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCoords(result);
          setLoading(false);
          resolve(result);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          resolve(null);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  return { coords, error, loading, capture };
}
