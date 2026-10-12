import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { getSession, getOrCreateOwnerToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();

  const rows = await db
    .select()
    .from(projects)
    .where(
      session
        ? or(eq(projects.userId, session.userId), eq(projects.ownerToken, ownerToken))
        : eq(projects.ownerToken, ownerToken),
    )
    .orderBy(desc(projects.updatedAt));

  return Response.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });

    const {
      name,
      countryIso3,
      countryName,
      level,
      levelName,
      boundaryId,
      boundaryName,
      pathLabels,
      geometry,
      bbox,
      areaKm2,
      isCustomGeometry,
    } = body;

    const effectiveBoundaryName = (boundaryName || name || countryName || "Study Area").toString().trim();
    const effectiveProjectName = (name || effectiveBoundaryName || `${countryName || countryIso3} Study Area`).toString().trim();

    if (!countryIso3 || !geometry || !bbox || level === undefined) {
      return Response.json({ error: "Missing required study-area fields (country, geometry, or bbox)." }, { status: 400 });
    }

    const session = await getSession();
    let ownerToken = "";
    try {
      ownerToken = await getOrCreateOwnerToken();
    } catch {
      ownerToken = crypto.randomUUID();
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const safeBoundaryId = typeof boundaryId === "string" && UUID_REGEX.test(boundaryId) ? boundaryId : null;

    let parsedArea = 0;
    if (typeof areaKm2 === "number" && !isNaN(areaKm2)) {
      parsedArea = areaKm2;
    } else if (typeof areaKm2 === "string") {
      const cleaned = parseFloat(areaKm2.replace(/,/g, ""));
      if (!isNaN(cleaned)) parsedArea = cleaned;
    }
    const safeAreaKm2Str = Math.max(0, parsedArea).toFixed(3);

    const [project] = await db
      .insert(projects)
      .values({
        userId: session?.userId ?? null,
        ownerToken,
        shareToken: crypto.randomUUID(),
        name: effectiveProjectName,
        countryIso3,
        countryName: countryName || countryIso3,
        level,
        levelName: levelName || "Country",
        boundaryId: safeBoundaryId,
        boundaryName: effectiveBoundaryName,
        pathLabels: Array.isArray(pathLabels) && pathLabels.length > 0 ? pathLabels : [{ level, levelName: levelName || "Country", name: effectiveBoundaryName }],
        geometry,
        bbox,
        areaKm2: safeAreaKm2Str,
        isCustomGeometry: Boolean(isCustomGeometry),
        selectedLayers: Array.isArray(body.selectedLayers) ? body.selectedLayers : [],
        resolution: typeof body.resolution === "number" ? body.resolution : 100,
        status: "draft",
      })
      .returning();

    if (!project) {
      return Response.json({ error: "Database failed to create project row" }, { status: 500 });
    }

    return Response.json({ project });
  } catch (err: any) {
    console.error("Error creating project:", err);
    return Response.json(
      {
        error: err?.message || "Failed to create project",
        detail: String(err?.cause || err),
      },
      { status: 500 }
    );
  }
}
