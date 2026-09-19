import { NextRequest } from "next/server";
import { getChildBoundaries, getBoundaryById, getCountryBoundary, getMaxAdmLevel } from "@/lib/geo/geoBoundaries";
import { levelName } from "@/lib/geo/countries";

export const dynamic = "force-dynamic";

// GET /api/geo/boundaries?country=BGD&level=1&parentId=<uuid|none>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "BGD").toUpperCase();
  const levelParam = searchParams.get("level");
  const parentId = searchParams.get("parentId");

  try {
    const CACHE_HEADERS = {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    };

    if (!levelParam || levelParam === "0") {
      const country0 = await getCountryBoundary(country);
      const maxLevel = await getMaxAdmLevel(country);
      return Response.json({ boundary: country0, maxLevel }, { headers: CACHE_HEADERS });
    }

    const level = Number(levelParam);
    let parent = null;
    if (parentId) {
      parent = await getBoundaryById(parentId);
      if (!parent) {
        return Response.json({ error: "Parent boundary not found" }, { status: 404 });
      }
    }

    const children = await getChildBoundaries(country, level, parent);
    const maxLevel = await getMaxAdmLevel(country);
    return Response.json({
      level,
      levelName: levelName(country, level),
      items: children,
      maxLevel,
    }, { headers: CACHE_HEADERS });
  } catch (err: any) {
    console.error("Boundaries API error:", err);
    return Response.json({
      error: String(err?.message || err),
      cause: String(err?.cause?.message || err?.cause || ""),
      detail: err?.detail,
    }, { status: 500 });
  }
}
