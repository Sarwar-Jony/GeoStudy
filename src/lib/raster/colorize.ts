export type RGB = [number, number, number];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function rampColor(stops: RGB[], t: number): RGB {
  const clamped = Math.min(1, Math.max(0, t));
  const n = stops.length - 1;
  const scaled = clamped * n;
  const i = Math.min(n - 1, Math.floor(scaled));
  const localT = scaled - i;
  const [r1, g1, b1] = stops[i];
  const [r2, g2, b2] = stops[i + 1];
  return [
    Math.round(lerp(r1, r2, localT)),
    Math.round(lerp(g1, g2, localT)),
    Math.round(lerp(b1, b2, localT)),
  ];
}

export const RAMPS: Record<string, RGB[]> = {
  terrain: [
    [17, 84, 45],
    [92, 168, 74],
    [214, 201, 106],
    [166, 116, 65],
    [140, 90, 60],
    [255, 255, 255],
  ],
  slope: [
    [34, 139, 34],
    [255, 255, 0],
    [255, 140, 0],
    [200, 0, 0],
  ],
  grayscale: [
    [10, 10, 10],
    [255, 255, 255],
  ],
  diverging: [
    [30, 90, 200],
    [245, 245, 245],
    [200, 40, 40],
  ],
  ndvi: [
    [140, 90, 40],
    [230, 210, 120],
    [170, 210, 90],
    [50, 140, 50],
    [10, 90, 20],
  ],
  water: [
    [245, 245, 245],
    [170, 210, 255],
    [50, 110, 220],
    [10, 40, 130],
  ],
  builtup: [
    [245, 245, 245],
    [255, 214, 140],
    [230, 120, 60],
    [150, 20, 20],
  ],
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
  greens: [
    [247, 252, 245],
    [161, 217, 155],
    [65, 171, 93],
    [0, 90, 50],
  ],
};

export const LULC_CLASSES = [
  { value: 1, name: "Tree Cover", color: [0, 100, 0] as RGB },
  { value: 2, name: "Shrubland", color: [170, 170, 90] as RGB },
  { value: 3, name: "Grassland", color: [150, 220, 110] as RGB },
  { value: 4, name: "Cropland", color: [230, 200, 80] as RGB },
  { value: 5, name: "Built-up", color: [200, 30, 30] as RGB },
  { value: 6, name: "Bare / Sparse Vegetation", color: [190, 180, 160] as RGB },
  { value: 7, name: "Snow / Ice", color: [250, 250, 250] as RGB },
  { value: 8, name: "Permanent Water Bodies", color: [30, 90, 200] as RGB },
  { value: 9, name: "Herbaceous Wetland", color: [90, 170, 190] as RGB },
  { value: 10, name: "Mangroves", color: [30, 130, 100] as RGB },
];

export function aspectColor(deg: number): RGB {
  const h = ((deg % 360) + 360) % 360;
  return hsvToRgb(h, 0.75, 0.95);
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
