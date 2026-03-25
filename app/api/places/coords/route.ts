import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const placeId = new URL(req.url).searchParams.get("place_id");
  if (!placeId || !GOOGLE_API_KEY) return Response.json({ lat: null, lon: null });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return Response.json({ lat: null, lon: null });
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (loc) return Response.json({ lat: loc.lat, lon: loc.lng });
  } catch {
    // fall through
  }

  return Response.json({ lat: null, lon: null });
}
