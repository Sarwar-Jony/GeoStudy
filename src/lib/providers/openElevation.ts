/**
 * Real Elevation Provider using Copernicus 30m / Open-Meteo Elevation API
 * 100% Free - No API key or credit card required.
 */

export interface ElevationGridResult {
  dem: Float32Array;
  minElevation: number;
  maxElevation: number;
  meanElevation: number;
  source: string;
}

export async function fetchRealElevationGrid(
  bbox: [number, number, number, number],
  width: number,
  height: number,
  signal?: AbortSignal
): Promise<ElevationGridResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Choose an anchor grid size. 10x10 = 100 sample points is optimal for speed & accuracy
  const rows = 10;
  const cols = 10;
  const lats: string[] = [];
  const lons: string[] = [];

  for (let r = 0; r < rows; r++) {
    // Latitude decreases from north (maxLat) to south (minLat) for raster row order (top-to-bottom)
    const lat = maxLat - (r / (rows - 1)) * (maxLat - minLat);
    for (let c = 0; c < cols; c++) {
      const lon = minLng + (c / (cols - 1)) * (maxLng - minLng);
      lats.push(lat.toFixed(4));
      lons.push(lon.toFixed(4));
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lons.join(",")}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: signal || controller.signal,
      headers: {
        "User-Agent": "GeoStudyAreaAnalyzer/1.0",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Open-Meteo elevation returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const elevations: number[] = data.elevation;

    if (!Array.isArray(elevations) || elevations.length !== rows * cols) {
      console.warn("Invalid elevation array received from Open-Meteo");
      return null;
    }

    // Build 2D anchor grid
    const anchor: number[][] = [];
    for (let r = 0; r < rows; r++) {
      anchor.push(elevations.slice(r * cols, (r + 1) * cols));
    }

    // Bilinear interpolation onto target (width x height) grid
    const dem = new Float32Array(width * height);
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let y = 0; y < height; y++) {
      const v = y / Math.max(1, height - 1);
      const rFloat = v * (rows - 1);
      const r0 = Math.min(rows - 1, Math.floor(rFloat));
      const r1 = Math.min(rows - 1, r0 + 1);
      const dr = rFloat - r0;

      for (let x = 0; x < width; x++) {
        const u = x / Math.max(1, width - 1);
        const cFloat = u * (cols - 1);
        const c0 = Math.min(cols - 1, Math.floor(cFloat));
        const c1 = Math.min(cols - 1, c0 + 1);
        const dc = cFloat - c0;

        const val =
          (1 - dr) * (1 - dc) * anchor[r0][c0] +
          (1 - dr) * dc * anchor[r0][c1] +
          dr * (1 - dc) * anchor[r1][c0] +
          dr * dc * anchor[r1][c1];

        const rounded = Number(val.toFixed(2));
        dem[y * width + x] = rounded;

        if (rounded < min) min = rounded;
        if (rounded > max) max = rounded;
        sum += rounded;
      }
    }

    const mean = Number((sum / (width * height)).toFixed(2));

    return {
      dem,
      minElevation: min,
      maxElevation: max,
      meanElevation: mean,
      source: "Copernicus 30m DEM (via Open-Meteo)",
    };
  } catch (err) {
    console.warn("Failed to fetch real elevation from Open-Meteo, falling back:", err);
    return null;
  }
}
