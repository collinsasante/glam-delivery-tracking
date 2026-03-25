import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input");

  if (!input || input.length < 2) return Response.json({ predictions: [] });

  // Try Google Maps Places Autocomplete (requires billing enabled)
  if (GOOGLE_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_API_KEY}&components=country:gh&language=en&types=geocode|establishment`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" || data.status === "ZERO_RESULTS") {
          const predictions = (data.predictions ?? []).map(
            (p: { description: string; structured_formatting?: { main_text?: string } }) => ({
              description: p.description,
              mainText: p.structured_formatting?.main_text ?? p.description,
              // coordinates will be null — fetched on selection if needed
              lat: null,
              lon: null,
            })
          );
          return Response.json({ predictions, source: "google" });
        }
        // If billing not enabled (REQUEST_DENIED), fall through to Photon
        console.warn("[places] Google returned:", data.status, "— falling back to Photon");
      }
    } catch (err) {
      console.warn("[places] Google request failed, falling back to Photon:", err);
    }
  }

  // Fallback: Photon (OpenStreetMap-based, free)
  const GHANA_BBOX = "-3.26,4.74,1.2,11.17";
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(input)}&limit=8&lang=en&bbox=${GHANA_BBOX}`,
    { signal: AbortSignal.timeout(5000) }
  );
  const data = await res.json();

  const predictions = (data.features ?? []).map(
    (f: { properties: Record<string, string>; geometry: { coordinates: number[] } }) => {
      const p = f.properties;
      const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
      return {
        description: parts.join(", "),
        mainText: p.name ?? parts[0] ?? input,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
    }
  );

  return Response.json({ predictions, source: "photon" });
}
