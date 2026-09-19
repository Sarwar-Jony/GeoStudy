import { NextRequest } from "next/server";
import { isGeeReady, initGee } from "@/lib/gee/client";
import { 
  getSentinel2Image, 
  computeSpectralIndices, 
  getCopernicusTerrain, 
  getDynamicWorldLulc,
  getTileUrl,
  getViirsNightLights
} from "@/lib/gee/catalog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ok = await initGee();
    if (!ok) {
      return Response.json(
        { error: "Google Earth Engine is not configured or authenticated." },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { layerKey, geometry, startDate, endDate, maxCloudCover } = body;

    if (!layerKey || !geometry) {
      return Response.json({ error: "layerKey and geometry are required." }, { status: 400 });
    }

    let tileResult: { tileUrl: string };

    if (["ndvi", "ndwi", "ndmi", "evi", "savi", "true_color"].includes(layerKey)) {
      const s2 = await getSentinel2Image({ geometry, startDate, endDate, maxCloudCover });
      const indices = computeSpectralIndices(s2);

      if (layerKey === "true_color") {
        tileResult = await getTileUrl(indices.raw, {
          bands: ["B4", "B3", "B2"],
          min: 0,
          max: 3000,
        });
      } else if (layerKey === "ndvi") {
        tileResult = await getTileUrl(indices.ndvi, {
          min: -0.2,
          max: 0.85,
          palette: ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
        });
      } else if (layerKey === "ndwi") {
        tileResult = await getTileUrl(indices.ndwi, {
          min: -0.5,
          max: 0.5,
          palette: ["#8c510a", "#d8b365", "#f6e8c3", "#c7eae5", "#5ab4ac", "#01665e"],
        });
      } else {
        tileResult = await getTileUrl(indices[layerKey], {
          min: -0.2,
          max: 0.8,
          palette: ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"],
        });
      }
    } else if (["dem", "slope", "aspect", "hillshade"].includes(layerKey)) {
      const terrain = await getCopernicusTerrain(geometry);
      if (layerKey === "dem") {
        tileResult = await getTileUrl(terrain.dem, {
          min: 0,
          max: 1500,
          palette: ["#006600", "#ffff66", "#996633", "#ffffff"],
        });
      } else if (layerKey === "slope") {
        tileResult = await getTileUrl(terrain.slope, {
          min: 0,
          max: 45,
          palette: ["#2c7bb6", "#abd9e9", "#ffffbf", "#fdae61", "#d7191c"],
        });
      } else {
        tileResult = await getTileUrl(terrain[layerKey], {
          min: 0,
          max: 255,
        });
      }
    } else if (layerKey === "lulc") {
      const lulc = await getDynamicWorldLulc({ geometry, startDate, endDate });
      tileResult = await getTileUrl(lulc, {
        min: 0,
        max: 8,
        palette: [
          "#419BDF", // Water
          "#397D49", // Trees
          "#88B053", // Grass
          "#7A87C6", // Flooded Vegetation
          "#E49635", // Crops
          "#DFC35A", // Shrub & Scrub
          "#C4281B", // Built Area
          "#A59B8F", // Bare Ground
          "#B39FE1", // Snow & Ice
        ],
      });
    } else if (layerKey === "night_lights") {
      const viirs = await getViirsNightLights(geometry);
      tileResult = await getTileUrl(viirs, {
        min: 0,
        max: 60,
        palette: ["#000000", "#18143a", "#4b1b6d", "#a8326d", "#f1605d", "#feb078", "#fcfdbf"],
      });
    } else {
      return Response.json({ error: `Unsupported GEE layer key: ${layerKey}` }, { status: 400 });
    }

    return Response.json(tileResult);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message || "Failed to generate GEE tile layer." },
      { status: 500 },
    );
  }
}
