"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface Suggestion {
  description: string;
  mainText: string;
  lat: number | null;
  lon: number | null;
  placeId?: string;
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
  // Prevent re-search immediately after a suggestion is selected
  const justSelectedRef = useRef(false);

  const search = useCallback(async (q: string) => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/places?input=${encodeURIComponent(q)}`);
      const data = await res.json();
      const results: Suggestion[] = data.predictions ?? [];
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

  async function selectSuggestion(s: Suggestion) {
    justSelectedRef.current = true;
    clearTimeout(debounceRef.current);
    setQuery(s.description);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);

    // If coords are already available (Photon), use them directly
    if (s.lat != null && s.lon != null) {
      onChange(s.description, { lat: s.lat, lon: s.lon });
      return;
    }

    // Google Maps result — fetch coordinates via place_id
    if (s.placeId) {
      try {
        const res = await fetch(`/api/places/coords?place_id=${encodeURIComponent(s.placeId)}`);
        const data = await res.json();
        if (data.lat != null && data.lon != null) {
          onChange(s.description, { lat: data.lat, lon: data.lon });
          return;
        }
      } catch {
        // fall through
      }
    }

    // No coords available — still call onChange without coords
    onChange(s.description, undefined);
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
                <p className="text-sm font-medium text-gray-900 truncate">{s.mainText}</p>
                <p className="text-xs text-gray-400 truncate">{s.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
