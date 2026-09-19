import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getOrCreateOwnerToken } from "@/lib/auth";
import { canAccessProject } from "@/lib/projectAccess";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  if (!canAccessProject(project, session, ownerToken)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: project.boundaryName,
          level: project.levelName,
          country: project.countryName,
          areaKm2: project.areaKm2,
          bbox: project.bbox,
        },
        geometry: project.geometry,
      },
    ],
  };

  const safeName = project.boundaryName.replace(/[^a-z0-9]+/gi, "_");
  return new Response(JSON.stringify(geojson, null, 2), {
    headers: {
      "Content-Type": "application/geo+json",
      "Content-Disposition": `attachment; filename="${safeName}_boundary.geojson"`,
    },
  });
}
