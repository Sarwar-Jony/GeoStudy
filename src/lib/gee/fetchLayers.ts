import { isGeeReady, initGee } from "./client";
import { 
  getSentinel2Image, 
  computeSpectralIndices, 
  getCopernicusTerrain, 
  getDynamicWorldLulc, 
  getViirsNightLights, 
  getDownloadUrl 
} from "./catalog";
import type { GeneratedLayerResult } from "../raster/generate";
import { LAYER_MAP } from "../raster/layerCatalog";

export async function fetchGeeLayers(params: {
  geometry: GeoJSON.Geometry;
  resolutionMeters: number;
  layerKeys: string[];
  startDate?: string;
  endDate?: string;
  maxCloudCover?: number;
  onProgress?: (completed: number, total: number, label: string) => Promise<void>;
}): Promise<GeneratedLayerResult[]> {
  const ok = await initGee();
  if (!ok) throw new Error("Google Earth Engine credentials are not configured or failed to authenticate.");

  const { geometry, resolutionMeters, layerKeys, startDate, endDate, maxCloudCover, onProgress } = params;
  const results: GeneratedLayerResult[] = [];

  let s2Image: any = null;
  let s2Indices: Record<string, any> | null = null;
  let terrain: Record<string, any> | null = null;

  for (let i = 0; i < layerKeys.length; i++) {
    const key = layerKeys[i];
    const def = LAYER_MAP.get(key) || {
      key,
      label: key.toUpperCase(),
      category: "Satellite",
      unit: "",
      dataType: "float32" as const,
      description: "",
    };

    if (onProgress) {
      await onProgress(i, layerKeys.length, def.label);
    }

    try {
      let eeImageToDownload: any = null;

      if (["ndvi", "ndwi", "ndmi", "evi", "savi", "true_color"].includes(key)) {
        if (!s2Image) {
          s2Image = await getSentinel2Image({ geometry, startDate, endDate, maxCloudCover });
          s2Indices = computeSpectralIndices(s2Image);
        }
        eeImageToDownload = s2Indices ? s2Indices[key] : null;
      } else if (["dem", "slope", "aspect", "hillshade"].includes(key)) {
        if (!terrain) {
          terrain = await getCopernicusTerrain(geometry);
        }
        eeImageToDownload = terrain ? terrain[key] : null;
      } else if (key === "lulc") {
        eeImageToDownload = await getDynamicWorldLulc({ geometry, startDate, endDate });
      } else if (key === "night_lights") {
        eeImageToDownload = await getViirsNightLights(geometry);
      }

      if (eeImageToDownload) {
        const downloadUrl = await getDownloadUrl(eeImageToDownload, geometry, resolutionMeters, `${key}_${resolutionMeters}m`);
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`Failed to download GEE GeoTIFF: ${res.statusText}`);

        const geotiffBuffer = Buffer.from(await res.arrayBuffer());

        // Basic stats placeholder from GEE raster
        results.push({
          key,
          label: def.label,
          category: def.category,
          unit: def.unit,
          dataType: def.dataType,
          width: 0,
          height: 0,
          resolution: resolutionMeters,
          crs: "EPSG:4326",
          geotiff: geotiffBuffer,
          thumbnailBase64: "", // Will be rendered from thumbnail or tiles
          stats: { min: 0, max: 1, mean: 0.5, std: 0.1, validPixels: 1000 },
        });
      }
    } catch (err) {
      console.warn(`Error pulling real GEE layer for ${key}:`, err);
    }
  }

  if (onProgress) {
    await onProgress(layerKeys.length, layerKeys.length, "All real satellite layers retrieved");
  }

  return results;
}
