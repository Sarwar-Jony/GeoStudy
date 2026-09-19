import { ValueNoise2D, hashSeed, mulberry32 } from "./noise";
import { rasterizeMask, computeGridDimensions, type GridTransform } from "./mask";
import { buildGeoTiff } from "./geotiffWriter";
import { encodePNG } from "./png";
import { LAYER_MAP, type LayerDef } from "./layerCatalog";
import { RAMPS, rampColor, aspectColor, LULC_CLASSES, type RGB } from "./colorize";

export interface Stats {
  min: number;
  max: number;
  mean: number;
  std: number;
  validPixels: number;
}

export interface GeneratedLayerResult {
  key: string;
  label: string;
  category: string;
  unit: string;
  dataType: "float32" | "byte" | "vector" | "climate" | "hazard";
  width: number;

  height: number;
  resolution: number;
  crs: string;
  geotiff: Buffer;
  thumbnailBase64: string;
  stats: Stats;
  legend?: { value: number; name: string; color: RGB }[];
}

const NODATA_FLOAT = -9999;
const NODATA_BYTE_GENERIC = 255;
const NODATA_WATER = 2;
const NODATA_LULC = 0;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function computeStats(values: ArrayLike<number>, nodata: number): Stats {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === nodata) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    count++;
  }
  const mean = count > 0 ? sum / count : 0;
  let sqDiff = 0;
  if (count > 0) {
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v === nodata) continue;
      sqDiff += (v - mean) ** 2;
    }
  }
  const std = count > 0 ? Math.sqrt(sqDiff / count) : 0;
  if (count === 0) {
    min = 0;
    max = 0;
  }
  return {
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    mean: Number(mean.toFixed(3)),
    std: Number(std.toFixed(3)),
    validPixels: count,
  };
}

interface GenContext {
  width: number;
  height: number;
  transform: GridTransform;
  mask: Uint8Array;
  cellSizeXm: number;
  cellSizeYm: number;
  centerU: number;
  centerV: number;
}

interface SharedFields {
  dem: Float32Array;
  ndviField: Float32Array;
  ndbiField: Float32Array;
  ndwiField: Float32Array;
  centerWeight: Float32Array;
}

function buildContext(
  bbox: [number, number, number, number],
  geometry: GeoJSON.Geometry,
  resolutionMeters: number,
  seedStr: string,
): GenContext {
  const dims = computeGridDimensions(bbox, resolutionMeters);
  const transform: GridTransform = {
    originX: bbox[0],
    originY: bbox[3],
    pixelSizeX: dims.pixelSizeX,
    pixelSizeY: dims.pixelSizeY,
    width: dims.width,
    height: dims.height,
  };
  const mask = rasterizeMask(geometry, transform);
  const midLat = (bbox[1] + bbox[3]) / 2;
  const cellSizeYm = dims.pixelSizeY * 111320;
  const cellSizeXm = dims.pixelSizeX * 111320 * Math.max(0.05, Math.cos((midLat * Math.PI) / 180));

  const rand = mulberry32(hashSeed(seedStr + "-core"));
  const centerU = 0.5 + (rand() - 0.5) * 0.3;
  const centerV = 0.5 + (rand() - 0.5) * 0.3;

  return { width: dims.width, height: dims.height, transform, mask, cellSizeXm, cellSizeYm, centerU, centerV };
}

export { computeGridDimensions } from "./mask";

function buildSharedFields(ctx: GenContext, seedStr: string, realDem?: Float32Array): SharedFields {
  const { width, height } = ctx;
  const terrainRand = mulberry32(hashSeed(seedStr + "-terrain-profile"));
  const elevationRange = 15 + terrainRand() * 1800;
  const minElevation = terrainRand() * 40;

  const demNoise = new ValueNoise2D(hashSeed(seedStr + "-dem"), 48);
  const ndviNoise = new ValueNoise2D(hashSeed(seedStr + "-ndvi"), 40);
  const ndbiNoise = new ValueNoise2D(hashSeed(seedStr + "-ndbi"), 36);
  const ndwiNoise = new ValueNoise2D(hashSeed(seedStr + "-ndwi"), 32);

  const dem = new Float32Array(width * height);
  const ndviField = new Float32Array(width * height);
  const ndbiField = new Float32Array(width * height);
  const ndwiField = new Float32Array(width * height);
  const centerWeight = new Float32Array(width * height);

  const hasRealDem = realDem && realDem.length === width * height;
  if (hasRealDem) {
    dem.set(realDem);
  }

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1 || 1);
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1 || 1);
      const i = y * width + x;

      if (!hasRealDem) {
        const demRaw = (demNoise.fbm(u, v, 3.2, 5, 0.55) + 1) / 2;
        dem[i] = minElevation + demRaw * elevationRange;
      }

      ndviField[i] = clamp(ndviNoise.fbm(u, v, 5.5, 4, 0.5) * 0.55 + 0.25, -0.2, 0.95);
      ndbiField[i] = clamp(ndbiNoise.fbm(u + 5.1, v + 2.3, 5, 4, 0.5) * 0.5, -0.5, 0.6);
      ndwiField[i] = clamp(ndwiNoise.fbm(u + 8.7, v + 1.1, 4.5, 4, 0.5) * 0.55 - 0.05, -0.7, 0.7);

      const d = Math.sqrt((u - ctx.centerU) ** 2 + (v - ctx.centerV) ** 2) / 0.65;
      centerWeight[i] = smoothstep(1 - d);
    }
  }

  return { dem, ndviField, ndbiField, ndwiField, centerWeight };
}


function idxClamp(v: number, max: number): number {
  return v < 0 ? 0 : v >= max ? max - 1 : v;
}

function terrainDerivatives(ctx: GenContext, dem: Float32Array) {
  const { width, height, cellSizeXm, cellSizeYm } = ctx;
  const slope = new Float32Array(width * height);
  const aspect = new Float32Array(width * height);
  const hillshade = new Uint8Array(width * height);
  const curvature = new Float32Array(width * height);

  const zenithRad = ((90 - 45) * Math.PI) / 180;
  let azimuthMath = 360 - 315 + 90;
  if (azimuthMath >= 360) azimuthMath -= 360;
  const azimuthRad = (azimuthMath * Math.PI) / 180;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const xl = idxClamp(x - 1, width);
      const xr = idxClamp(x + 1, width);
      const yu = idxClamp(y - 1, height);
      const yd = idxClamp(y + 1, height);
      const z = dem[i];
      const zLeft = dem[y * width + xl];
      const zRight = dem[y * width + xr];
      const zUp = dem[yu * width + x];
      const zDown = dem[yd * width + x];

      const dzdx = (zRight - zLeft) / (2 * cellSizeXm);
      const dzdy = (zUp - zDown) / (2 * cellSizeYm);

      const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      slope[i] = (slopeRad * 180) / Math.PI;

      let aspectDeg = (Math.atan2(dzdy, -dzdx) * 180) / Math.PI;
      aspectDeg = 90 - aspectDeg;
      if (aspectDeg < 0) aspectDeg += 360;
      if (aspectDeg >= 360) aspectDeg -= 360;
      aspect[i] = aspectDeg;

      const aspectRad = (aspectDeg * Math.PI) / 180;
      let hs = 255 * (Math.cos(zenithRad) * Math.cos(slopeRad) + Math.sin(zenithRad) * Math.sin(slopeRad) * Math.cos(azimuthRad - aspectRad));
      hs = clamp(hs, 0, 254);
      hillshade[i] = Math.round(hs);

      const curv =
        (zLeft + zRight - 2 * z) / (cellSizeXm * cellSizeXm) +
        (zUp + zDown - 2 * z) / (cellSizeYm * cellSizeYm);
      curvature[i] = curv * 100;
    }
  }

  return { slope, aspect, hillshade, curvature };
}

function applyFloatMask(raw: Float32Array, mask: Uint8Array): Float32Array {
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = mask[i] ? raw[i] : NODATA_FLOAT;
  return out;
}

function applyByteMask(raw: Uint8Array, mask: Uint8Array, nodata: number): Uint8Array {
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = mask[i] ? raw[i] : nodata;
  return out;
}

function colorFor(key: string, value: number, stats: Stats, nodata: number): RGB {
  if (value === nodata) return [0, 0, 0];
  const span = stats.max - stats.min || 1;
  const t = (value - stats.min) / span;
  switch (key) {
    case "dem":
    case "dsm":
    case "elevation":
      return rampColor(RAMPS.terrain, t);
    case "slope":
      return rampColor(RAMPS.slope, t);
    case "aspect":
      return aspectColor(value);
    case "hillshade":
      return rampColor(RAMPS.grayscale, value / 255);
    case "curvature":
      return rampColor(RAMPS.diverging, t);
    case "ndvi":
    case "savi":
    case "evi":
      return rampColor(RAMPS.ndvi, (value + 0.3) / 1.2);
    case "ndwi":
    case "ndmi":
      return rampColor(RAMPS.water, (value + 0.6) / 1.2);
    case "ndbi":
    case "built_up_intensity":
      return rampColor(RAMPS.builtup, t);
    case "twi":
      return rampColor(RAMPS.water, t);
    case "lulc": {
      const cls = LULC_CLASSES.find((c) => c.value === value);
      return cls ? cls.color : [0, 0, 0];
    }
    case "population_density":
    case "night_lights":
      return rampColor(RAMPS.viridis, t);
    case "tree_cover":
      return rampColor(RAMPS.greens, t);
    case "water_bodies":
      return value === 1 ? [40, 100, 220] : [235, 235, 230];
    default:
      return rampColor(RAMPS.viridis, t);
  }
}

function makeThumbnail(
  key: string,
  raw: Float32Array | Uint8Array,
  width: number,
  height: number,
  stats: Stats,
  nodata: number,
): string {
  const maxDim = 320;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const tw = Math.max(1, Math.round(width * scale));
  const th = Math.max(1, Math.round(height * scale));
  const rgba = new Uint8Array(tw * th * 4);

  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const sx = Math.min(width - 1, Math.floor((tx / tw) * width));
      const sy = Math.min(height - 1, Math.floor((ty / th) * height));
      const v = raw[sy * width + sx];
      const o = (ty * tw + tx) * 4;
      if (v === nodata) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else {
        const [r, g, b] = colorFor(key, v, stats, nodata);
        rgba[o] = r;
        rgba[o + 1] = g;
        rgba[o + 2] = b;
        rgba[o + 3] = 255;
      }
    }
  }
  const png = encodePNG(tw, th, rgba);
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function generateStudyAreaLayers(params: {
  seed: string;
  bbox: [number, number, number, number];
  geometry: GeoJSON.Geometry;
  resolutionMeters: number;
  layerKeys: string[];
  realDem?: Float32Array;
  onProgress?: (completed: number, total: number, currentLabel: string) => Promise<void> | void;
}): Promise<{ results: GeneratedLayerResult[]; resolutionUsed: number; width: number; height: number }> {
  const { seed, bbox, geometry, resolutionMeters, layerKeys, realDem, onProgress } = params;
  const ctx = buildContext(bbox, geometry, resolutionMeters, seed);
  const shared = buildSharedFields(ctx, seed, realDem);
  const derived = terrainDerivatives(ctx, shared.dem);
  const results: GeneratedLayerResult[] = [];


  const rand = mulberry32(hashSeed(seed + "-others"));
  const dsmNoise = new ValueNoise2D(hashSeed(seed + "-dsm"), 44);
  const popNoise = new ValueNoise2D(hashSeed(seed + "-pop"), 30);
  const lightsNoise = new ValueNoise2D(hashSeed(seed + "-lights"), 30);
  const treeNoise = new ValueNoise2D(hashSeed(seed + "-tree"), 40);
  const moistureNoise = new ValueNoise2D(hashSeed(seed + "-moist"), 38);
  const savi = seedShift(shared.ndviField, 0.92, -0.02);
  const evi = seedShift(shared.ndviField, 1.05, 0.03);
  void rand;

  const { width, height } = ctx;
  const total = layerKeys.length;
  let completed = 0;

  for (const key of layerKeys) {
    const def = LAYER_MAP.get(key);
    if (!def) continue;
    let raw: Float32Array | Uint8Array;
    let nodata: number;

    switch (key) {
      case "dem":
      case "elevation":
        raw = applyFloatMask(shared.dem, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "dsm": {
        const dsm = new Float32Array(width * height);
        for (let i = 0; i < dsm.length; i++) {
          const u = (i % width) / (width - 1 || 1);
          const v = Math.floor(i / width) / (height - 1 || 1);
          const bump = Math.max(0, dsmNoise.fbm(u, v, 8, 3, 0.5)) * 22;
          dsm[i] = shared.dem[i] + bump;
        }
        raw = applyFloatMask(dsm, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "slope":
        raw = applyFloatMask(derived.slope, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "aspect":
        raw = applyFloatMask(derived.aspect, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "hillshade":
        raw = applyByteMask(derived.hillshade, ctx.mask, NODATA_BYTE_GENERIC);
        nodata = NODATA_BYTE_GENERIC;
        break;
      case "curvature":
        raw = applyFloatMask(derived.curvature, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "twi": {
        const twi = new Float32Array(width * height);
        for (let i = 0; i < twi.length; i++) {
          const slopeRad = Math.max(0.015, (derived.slope[i] * Math.PI) / 180);
          const area = 150 + (1 - shared.centerWeight[i]) * 850;
          twi[i] = Math.log(area / Math.tan(slopeRad));
        }
        raw = applyFloatMask(twi, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "ndvi":
        raw = applyFloatMask(shared.ndviField, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "ndwi":
        raw = applyFloatMask(shared.ndwiField, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "ndbi":
        raw = applyFloatMask(shared.ndbiField, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "ndmi": {
        const ndmi = new Float32Array(width * height);
        for (let i = 0; i < ndmi.length; i++) {
          const u = (i % width) / (width - 1 || 1);
          const v = Math.floor(i / width) / (height - 1 || 1);
          ndmi[i] = clamp(moistureNoise.fbm(u + 3, v + 6, 5, 4, 0.5) * 0.5 + shared.ndviField[i] * 0.2, -0.6, 0.6);
        }
        raw = applyFloatMask(ndmi, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "savi":
        raw = applyFloatMask(savi, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "evi":
        raw = applyFloatMask(evi, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      case "lulc": {
        const lulc = new Uint8Array(width * height);
        for (let i = 0; i < lulc.length; i++) {
          lulc[i] = classifyLulc(shared.ndviField[i], shared.ndbiField[i], shared.ndwiField[i], shared.centerWeight[i]);
        }
        raw = applyByteMask(lulc, ctx.mask, NODATA_LULC);
        nodata = NODATA_LULC;
        break;
      }
      case "population_density": {
        const pop = new Float32Array(width * height);
        for (let i = 0; i < pop.length; i++) {
          const u = (i % width) / (width - 1 || 1);
          const v = Math.floor(i / width) / (height - 1 || 1);
          const base = Math.max(0, popNoise.fbm(u, v, 6, 3, 0.5)) * 300;
          pop[i] = base + shared.centerWeight[i] ** 2 * 18000;
        }
        raw = applyFloatMask(pop, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "night_lights": {
        const lights = new Float32Array(width * height);
        for (let i = 0; i < lights.length; i++) {
          const u = (i % width) / (width - 1 || 1);
          const v = Math.floor(i / width) / (height - 1 || 1);
          const base = Math.max(0, lightsNoise.fbm(u, v, 7, 3, 0.5)) * 4;
          lights[i] = base + shared.centerWeight[i] * 58;
        }
        raw = applyFloatMask(lights, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "built_up_intensity": {
        const bi = new Float32Array(width * height);
        for (let i = 0; i < bi.length; i++) {
          bi[i] = clamp(shared.centerWeight[i] * 0.75 + Math.max(0, shared.ndbiField[i]) * 0.7, 0, 1);
        }
        raw = applyFloatMask(bi, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "tree_cover": {
        const tc = new Float32Array(width * height);
        for (let i = 0; i < tc.length; i++) {
          const u = (i % width) / (width - 1 || 1);
          const v = Math.floor(i / width) / (height - 1 || 1);
          const detail = treeNoise.fbm(u, v, 6, 4, 0.5);
          const base = clamp((shared.ndviField[i] + 0.2) * 70 + detail * 15, 0, 100);
          tc[i] = clamp(base * (1 - shared.centerWeight[i] * 0.6), 0, 100);
        }
        raw = applyFloatMask(tc, ctx.mask);
        nodata = NODATA_FLOAT;
        break;
      }
      case "water_bodies": {
        const wb = new Uint8Array(width * height);
        for (let i = 0; i < wb.length; i++) wb[i] = shared.ndwiField[i] > 0.22 ? 1 : 0;
        raw = applyByteMask(wb, ctx.mask, NODATA_WATER);
        nodata = NODATA_WATER;
        break;
      }
      default:
        continue;
    }

    const stats = computeStats(raw, nodata);
    const thumbnailBase64 = makeThumbnail(key, raw, width, height, stats, nodata);
    const geotiff = await buildGeoTiff(raw, {
      transform: ctx.transform,
      nodata,
      dataType: (def.dataType === "byte" ? "byte" : "float32"),
    });


    results.push({
      key,
      label: def.label,
      category: def.category,
      unit: def.unit,
      dataType: def.dataType,
      width,
      height,
      resolution: resolutionMeters,
      crs: "EPSG:4326",
      geotiff,
      thumbnailBase64,
      stats,
      legend: key === "lulc" ? LULC_CLASSES : key === "water_bodies" ? [
        { value: 0, name: "No water", color: [235, 235, 230] },
        { value: 1, name: "Water", color: [40, 100, 220] },
      ] : undefined,
    });

    completed++;
    if (onProgress) await onProgress(completed, total, def.label);
  }

  return { results, resolutionUsed: resolutionMeters, width, height };
}

function seedShift(field: Float32Array, mul: number, add: number): Float32Array {
  const out = new Float32Array(field.length);
  for (let i = 0; i < field.length; i++) out[i] = clamp(field[i] * mul + add, -1, 1);
  return out;
}

function classifyLulc(ndvi: number, ndbi: number, ndwi: number, centerWeight: number): number {
  if (ndwi > 0.28) return 8; // water
  if (ndwi > 0.18 && ndvi > 0.2) return 9; // wetland
  if (ndbi > 0.12 || centerWeight > 0.55) return 5; // built-up
  if (ndvi > 0.55) return 1; // tree cover
  if (ndvi > 0.35) return 4; // cropland
  if (ndvi > 0.2) return 3; // grassland
  if (ndvi > 0.05) return 2; // shrubland
  return 6; // bare/sparse
}
