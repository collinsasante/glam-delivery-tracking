"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface Suggestion {
  name: string;
  fullName: string;
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (value: string, coords?: { lat: number; lon: number }) => void;
  placeholder?: string;
  id?: string;
}

export function LocationAutocomplete({ value, onChange, placeholder, id }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Ghana bounding box for Photon
  const GHANA_BBOX = "-3.26,4.74,1.2,11.17";

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=${GHANA_BBOX}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await res.json();
      const results: Suggestion[] = (data.features ?? []).map(
        (f: { properties: Record<string, string>; geometry: { coordinates: number[] } }) => {
          const p = f.properties;
          const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
          return {
            name: p.name ?? parts[0] ?? q,
            fullName: parts.join(", "),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
          };
        }
      );
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  function selectSuggestion(s: Suggestion) {
    setQuery(s.fullName);
    onChange(s.fullName, { lat: s.lat, lon: s.lon });
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value, undefined);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Search location…"}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                i === activeIndex ? "bg-red-50" : "hover:bg-gray-50"
              }`}
              onMouseDown={() => selectSuggestion(s)}
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.fullName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
