import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input");
  const placeId = searchParams.get("placeId");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) return Response.json({ error: "Maps API key not configured" }, { status: 500 });

  if (placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return Response.json(data);
  }

  if (!input || input.length < 2) return Response.json({ predictions: [] });

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:gh&language=en&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  return Response.json(data);
}
