import { ee, initGee } from "./client";

export interface SatelliteParams {
  geometry: GeoJSON.Geometry;
  startDate?: string;
  endDate?: string;
  maxCloudCover?: number;
}

export interface GeeTileResult {
  tileUrl: string;
  mapId: string;
  token?: string;
}

/** Converts GeoJSON geometry to an ee.Geometry */
export function toEeGeometry(geoJson: GeoJSON.Geometry): any {
  return ee.Geometry(geoJson);
}

/** Default 3-month date window if not specified */
export function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 4);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/** Sentinel-2 Cloud Masking using SCL (Scene Classification Layer) */
function maskS2Clouds(image: any): any {
  const scl = image.select("SCL");
  // Keep vegetation (4), non-vegetated (5), water (6), unclassified (7)
  // Mask out: clouds (8, 9), cirrus (10), cloud shadows (3), snow/ice (11)
  const mask = scl
    .neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10));
  return image.updateMask(mask);
}

/** Get Sentinel-2 Surface Reflectance Harmonized composite */
export async function getSentinel2Image(params: SatelliteParams): Promise<any> {
  const ok = await initGee();
  if (!ok) throw new Error("GEE not initialized");

  const dates = getDefaultDateRange();
  const startDate = params.startDate || dates.start;
  const endDate = params.endDate || dates.end;
  const maxCloud = params.maxCloudCover ?? 20;

  const aoi = toEeGeometry(params.geometry);

  const collection = ee
    .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(aoi)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", maxCloud))
    .map(maskS2Clouds);

  return collection.median().clip(aoi);
}

/** Compute Sentinel-2 Spectral Indices */
export function computeSpectralIndices(s2Image: any): Record<string, any> {
  // Scale optical bands from 0-10000 to 0-1
  const b2 = s2Image.select("B2").divide(10000); // Blue
  const b3 = s2Image.select("B3").divide(10000); // Green
  const b4 = s2Image.select("B4").divide(10000); // Red
  const b8 = s2Image.select("B8").divide(10000); // NIR
  const b11 = s2Image.select("B11").divide(10000); // SWIR1

  // NDVI: (NIR - Red) / (NIR + Red)
  const ndvi = b8.subtract(b4).divide(b8.add(b4)).rename("ndvi");

  // NDWI: (Green - NIR) / (Green + NIR)
  const ndwi = b3.subtract(b8).divide(b3.add(b8)).rename("ndwi");

  // NDMI: (NIR - SWIR1) / (NIR + SWIR1)
  const ndmi = b8.subtract(b11).divide(b8.add(b11)).rename("ndmi");

  // EVI: 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
  const evi = b8
    .subtract(b4)
    .multiply(2.5)
    .divide(b8.add(b4.multiply(6)).subtract(b2.multiply(7.5)).add(1))
    .rename("evi");

  // SAVI: ((NIR - Red) / (NIR + Red + 0.5)) * 1.5
  const savi = b8
    .subtract(b4)
    .divide(b8.add(b4).add(0.5))
    .multiply(1.5)
    .rename("savi");

  return { ndvi, ndwi, ndmi, evi, savi, raw: s2Image };
}

/** Get High-Resolution Copernicus / SRTM 30m DEM & Terrain Derivatives */
export async function getCopernicusTerrain(geometry: GeoJSON.Geometry): Promise<any> {
  const ok = await initGee();
  if (!ok) throw new Error("GEE not initialized");

  const aoi = toEeGeometry(geometry);
  const dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM").mosaic().clip(aoi);
  const terrain = ee.Terrain.products(dem);

  return {
    dem: terrain.select("elevation").rename("dem"),
    slope: terrain.select("slope").rename("slope"),
    aspect: terrain.select("aspect").rename("aspect"),
    hillshade: terrain.select("hillshade").rename("hillshade"),
  };
}

/** Get Dynamic World 10m Land Use / Land Cover */
export async function getDynamicWorldLulc(params: SatelliteParams): Promise<any> {
  const ok = await initGee();
  if (!ok) throw new Error("GEE not initialized");

  const dates = getDefaultDateRange();
  const startDate = params.startDate || dates.start;
  const endDate = params.endDate || dates.end;
  const aoi = toEeGeometry(params.geometry);

  const dw = ee
    .ImageCollection("GOOGLE/DYNAMICWORLD/V1")
    .filterBounds(aoi)
    .filterDate(startDate, endDate)
    .select("label");

  // Most frequent LULC class across the time window
  return dw.mode().clip(aoi).rename("lulc");
}

/** Get VIIRS Nighttime Average Radiance */
export async function getViirsNightLights(geometry: GeoJSON.Geometry): Promise<any> {
  const ok = await initGee();
  if (!ok) throw new Error("GEE not initialized");

  const aoi = toEeGeometry(geometry);
  const viirs = ee
    .ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG")
    .select("avg_rad")
    .filterBounds(aoi)
    .sort("system:time_start", false)
    .first();

  return viirs.clip(aoi).rename("night_lights");
}

/** Generate a live Leaflet XYZ tile layer URL from an ee.Image */
export async function getTileUrl(image: any, visParams: Record<string, any>): Promise<GeeTileResult> {
  return new Promise((resolve, reject) => {
    image.getMap(visParams, (map: any, err: any) => {
      if (err) {
        reject(err);
        return;
      }
      const tileUrl = `https://earthengine.googleapis.com/v1/${map.mapid}/tiles/{z}/{x}/{y}`;
      resolve({
        tileUrl,
        mapId: map.mapid,
        token: map.token,
      });
    });
  });
}

/** Get direct GeoTIFF download URL for a study area */
export async function getDownloadUrl(
  image: any,
  geometry: GeoJSON.Geometry,
  scaleMeters: number,
  filename: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const region = toEeGeometry(geometry);
    image.getDownloadURL(
      {
        name: filename,
        scale: scaleMeters,
        crs: "EPSG:4326",
        region,
        format: "GEO_TIFF",
      },
      (url: string, err: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(url);
      },
    );
  });
}
