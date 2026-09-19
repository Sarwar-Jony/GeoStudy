import { NextRequest } from "next/server";
import { db } from "@/db";
import { generatedLayers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getOrCreateOwnerToken } from "@/lib/auth";
import { canAccessProject } from "@/lib/projectAccess";
import { readLayerFile, fileExists } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ layerId: string }> }) {
  const { layerId } = await ctx.params;
  const [layer] = await db.select().from(generatedLayers).where(eq(generatedLayers.id, layerId)).limit(1);
  if (!layer) return Response.json({ error: "Layer not found" }, { status: 404 });

  const [project] = await db.select().from(projects).where(eq(projects.id, layer.projectId)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  if (!canAccessProject(project, session, ownerToken)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fileExists(layer.filePath)) {
    return Response.json({ error: "File no longer available. Please regenerate this layer." }, { status: 410 });
  }

  const buffer = readLayerFile(layer.filePath);
  const safeName = project.boundaryName.replace(/[^a-z0-9]+/gi, "_");
  
  let contentType = "image/tiff";
  let filename = `${safeName}_${layer.layerKey}_${layer.resolution}m.tif`;

  if (layer.filePath.endsWith(".geojson")) {
    contentType = "application/geo+json";
    filename = `${safeName}_${layer.layerKey}.geojson`;
  } else if (layer.filePath.endsWith(".json")) {
    contentType = "application/json";
    filename = `${safeName}_${layer.layerKey}.json`;
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });

}
