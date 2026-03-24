import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Ghana bounding box for Photon geocoder
const GHANA_BBOX = "-3.26,4.74,1.2,11.17";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input");

  if (!input || input.length < 2) return Response.json({ predictions: [] });

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

  return Response.json({ predictions });
}
