export interface GridTransform {
  originX: number; // top-left lon
  originY: number; // top-left lat
  pixelSizeX: number; // degrees per pixel (positive)
  pixelSizeY: number; // degrees per pixel (positive, applied downward)
  width: number;
  height: number;
}

type Ring = [number, number][];

function collectRings(geometry: GeoJSON.Geometry): Ring[] {
  const rings: Ring[] = [];
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) rings.push(ring as Ring);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) rings.push(ring as Ring);
    }
  }
  return rings;
}

/**
 * Rasterize a Polygon/MultiPolygon (with holes) into a boolean mask using a
 * scanline even-odd fill algorithm. Returns Uint8Array where 1 = inside.
 */
export function rasterizeMask(geometry: GeoJSON.Geometry, transform: GridTransform): Uint8Array {
  const { originX, originY, pixelSizeX, pixelSizeY, width, height } = transform;
  const mask = new Uint8Array(width * height);
  const rings = collectRings(geometry);
  if (rings.length === 0) return mask;

  // Pre-extract edges for speed.
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      if (y1 === y2) continue;
      edges.push({ x1, y1, x2, y2 });
    }
  }

  const xs: number[] = [];
  for (let row = 0; row < height; row++) {
    const lat = originY - (row + 0.5) * pixelSizeY;
    xs.length = 0;
    for (const e of edges) {
      const { x1, y1, x2, y2 } = e;
      if ((y1 <= lat && y2 > lat) || (y2 <= lat && y1 > lat)) {
        const t = (lat - y1) / (y2 - y1);
        xs.push(x1 + t * (x2 - x1));
      }
    }
    if (xs.length === 0) continue;
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const lonStart = xs[i];
      const lonEnd = xs[i + 1];
      let colStart = Math.ceil((lonStart - originX) / pixelSizeX - 0.5);
      let colEnd = Math.floor((lonEnd - originX) / pixelSizeX - 0.5);
      if (colStart < 0) colStart = 0;
      if (colEnd > width - 1) colEnd = width - 1;
      const rowOffset = row * width;
      for (let col = colStart; col <= colEnd; col++) {
        mask[rowOffset + col] = 1;
      }
    }
  }
  return mask;
}

export function computeGridDimensions(
  bbox: [number, number, number, number],
  resolutionMeters: number,
  maxDimension = 1200,
): { width: number; height: number; pixelSizeX: number; pixelSizeY: number; effectiveResolution: number } {
  const [minX, minY, maxX, maxY] = bbox;
  const midLat = (minY + maxY) / 2;
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.max(0.05, Math.cos((midLat * Math.PI) / 180));

  let pixelSizeY = resolutionMeters / metersPerDegLat;
  let pixelSizeX = resolutionMeters / metersPerDegLon;

  let width = Math.max(4, Math.round((maxX - minX) / pixelSizeX));
  let height = Math.max(4, Math.round((maxY - minY) / pixelSizeY));

  const scaleFactor = Math.max(width / maxDimension, height / maxDimension, 1);
  let effectiveResolution = resolutionMeters;
  if (scaleFactor > 1) {
    effectiveResolution = resolutionMeters * scaleFactor;
    pixelSizeY = effectiveResolution / metersPerDegLat;
    pixelSizeX = effectiveResolution / metersPerDegLon;
    width = Math.max(4, Math.round((maxX - minX) / pixelSizeX));
    height = Math.max(4, Math.round((maxY - minY) / pixelSizeY));
  }

  return { width, height, pixelSizeX, pixelSizeY, effectiveResolution: Math.round(effectiveResolution) };
}
