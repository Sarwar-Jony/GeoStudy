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

    if (!countryIso3 || !geometry || !bbox || level === undefined || !boundaryName) {
      return Response.json({ error: "Missing required study-area fields." }, { status: 400 });
    }

    const session = await getSession();
    let ownerToken = "";
    try {
      ownerToken = await getOrCreateOwnerToken();
    } catch {
      ownerToken = crypto.randomUUID();
    }

    const [project] = await db
      .insert(projects)
      .values({
        userId: session?.userId ?? null,
        ownerToken,
        shareToken: crypto.randomUUID(),
        name: name?.trim() || `${boundaryName} Study Area`,
        countryIso3,
        countryName: countryName || countryIso3,
        level,
        levelName: levelName || "Country",
        boundaryId: boundaryId || null,
        boundaryName,
        pathLabels: pathLabels || [],
        geometry,
        bbox,
        areaKm2: Number(areaKm2 || 0).toFixed(3),
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
