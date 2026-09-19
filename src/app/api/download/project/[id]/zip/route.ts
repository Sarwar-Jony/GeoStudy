import { NextRequest } from "next/server";
import JSZip from "jszip";
import { db } from "@/db";
import { generatedLayers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getOrCreateOwnerToken } from "@/lib/auth";
import { canAccessProject } from "@/lib/projectAccess";
import { readLayerFile, fileExists } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const session = await getSession();
  const ownerToken = await getOrCreateOwnerToken();
  if (!canAccessProject(project, session, ownerToken)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const layers = await db.select().from(generatedLayers).where(eq(generatedLayers.projectId, id));
  if (layers.length === 0) {
    return Response.json({ error: "No generated layers found for this project." }, { status: 404 });
  }

  const zip = new JSZip();
  const safeName = project.boundaryName.replace(/[^a-z0-9]+/gi, "_");
  const folder = zip.folder(safeName)!;

  for (const layer of layers) {
    if (!fileExists(layer.filePath)) continue;
    if (layer.filePath.endsWith(".geojson")) {
      folder.file(`${layer.layerKey}.geojson`, readLayerFile(layer.filePath));
    } else if (layer.filePath.endsWith(".json")) {
      folder.file(`${layer.layerKey}.json`, readLayerFile(layer.filePath));
    } else {
      folder.file(`${layer.layerKey}_${layer.resolution}m.tif`, readLayerFile(layer.filePath));
    }
  }


  const boundaryGeoJson = {
    type: "Feature",
    properties: { name: project.boundaryName, level: project.levelName, areaKm2: project.areaKm2 },
    geometry: project.geometry,
  };
  folder.file("study_area_boundary.geojson", JSON.stringify(boundaryGeoJson, null, 2));

  const statsSummary = layers.map((l: any) => ({
    layer: l.layerKey,
    label: l.layerLabel,
    unit: l.unit,
    resolution: l.resolution,
    stats: l.stats,
  }));
  folder.file("layer_statistics.json", JSON.stringify(statsSummary, null, 2));

  const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return new Response(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}_GeoStudy_layers.zip"`,
      "Content-Length": String(content.length),
    },
  });
}
