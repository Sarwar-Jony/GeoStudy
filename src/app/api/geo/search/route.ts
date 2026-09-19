import { NextRequest } from "next/server";
import { geocodePlace } from "@/lib/geo/geocoding";

export const dynamic = "force-dynamic";

// GET /api/geo/search?q=dhanmondi&country=BGD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const country = searchParams.get("country") || undefined;
    const limit = parseInt(searchParams.get("limit") || "8", 10);

    if (q.trim().length < 2) {
      return Response.json({ items: [] });
    }

    const items = await geocodePlace(q, { country, limit });
    return Response.json({ items });
  } catch (error: any) {
    console.error("Geocoding search route error:", error);
    return Response.json({ items: [], error: error.message }, { status: 500 });
  }
}
