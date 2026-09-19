/** Deterministic seeded value-noise utilities used to synthesize plausible,
 * spatially-coherent raster surfaces (elevation, indices, etc.) for a given
 * study area. Seeded by boundary id + layer key so the same Study Area always
 * regenerates the same-looking layers. */

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simple 2D gradient-free value noise with bilinear interpolation. */
export class ValueNoise2D {
  private gridSize: number;
  private grid: Float32Array;
  private rand: () => number;

  constructor(seed: number, gridSize = 64) {
    this.rand = mulberry32(seed);
    this.gridSize = gridSize;
    this.grid = new Float32Array(gridSize * gridSize);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = this.rand() * 2 - 1;
  }

  private sample(x: number, y: number): number {
    const gx = ((x % this.gridSize) + this.gridSize) % this.gridSize;
    const gy = ((y % this.gridSize) + this.gridSize) % this.gridSize;
    return this.grid[gy * this.gridSize + gx];
  }

  /** u,v in [0,1); scale controls frequency (higher = more detail cells) */
  noise(u: number, v: number, scale: number): number {
    const x = u * scale;
    const y = v * scale;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const v00 = this.sample(x0, y0);
    const v10 = this.sample(x0 + 1, y0);
    const v01 = this.sample(x0, y0 + 1);
    const v11 = this.sample(x0 + 1, y0 + 1);
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = v00 + (v10 - v00) * sx;
    const b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sy;
  }

  /** Fractal Brownian motion: sum of octaves for natural-looking terrain. */
  fbm(u: number, v: number, baseScale: number, octaves = 5, persistence = 0.5): number {
    let total = 0;
    let amplitude = 1;
    let maxAmp = 0;
    let scale = baseScale;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(u, v, scale) * amplitude;
      maxAmp += amplitude;
      amplitude *= persistence;
      scale *= 2;
    }
    return total / maxAmp;
  }
}
