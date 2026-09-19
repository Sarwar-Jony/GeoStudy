import * as turf from "@turf/turf";
import { db } from "@/db";
import { boundaries } from "@/db/schema";
import { and, eq, isNull, ilike, inArray } from "drizzle-orm";
import { levelName } from "./countries";

const META_BASE = "https://www.geoboundaries.org/api/current/gbOpen";

type GbMeta = {
  boundaryName: string;
  admUnitCount: string;
  simplifiedGeometryGeoJSON: string;
  gjDownloadURL: string;
};

type GbFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJSON.Geometry;
};

type GbFeatureCollection = {
  type: "FeatureCollection";
  features: GbFeature[];
};

const metaCache = new Map<string, GbMeta | null>();
const geojsonCache = new Map<string, GbFeatureCollection>();
const maxLevelCache = new Map<string, number>();

async function fetchJson<T>(url: string, timeoutMs = 20000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GeoStudy-Area-Analyzer/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getMeta(iso3: string, level: number): Promise<GbMeta | null> {
  const key = `${iso3}-ADM${level}`;
  if (metaCache.has(key)) return metaCache.get(key) ?? null;
  const meta = await fetchJson<GbMeta>(`${META_BASE}/${iso3}/ADM${level}/`);
  metaCache.set(key, meta);
  return meta;
}

/** Determine the deepest ADM level (0-4) that geoBoundaries publishes for a country. */
export async function getMaxAdmLevel(iso3: string): Promise<number> {
  if (maxLevelCache.has(iso3)) return maxLevelCache.get(iso3)!;
  let max = 0;
  for (let lvl = 4; lvl >= 1; lvl--) {
    const meta = await getMeta(iso3, lvl);
    if (meta) {
      max = lvl;
      break;
    }
  }
  maxLevelCache.set(iso3, max);
  return max;
}

async function getRawFeatureCollection(iso3: string, level: number): Promise<GbFeatureCollection | null> {
  const key = `${iso3}-ADM${level}`;
  if (geojsonCache.has(key)) return geojsonCache.get(key)!;
  const meta = await getMeta(iso3, level);
  if (!meta) return null;
  const url = meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL;
  const fc = await fetchJson<GbFeatureCollection>(url, 45000);
  if (!fc) return null;
  geojsonCache.set(key, fc);
  return fc;
}

function shapeName(props: Record<string, unknown>): string {
  return (
    (props.shapeName as string) ||
    (props.ADM0_NAME as string) ||
    (props.name as string) ||
    "Unnamed"
  );
}

function shapeExternalId(props: Record<string, unknown>, fallbackIndex: number): string {
  return (props.shapeID as string) || (props.shapeISO as string) || `idx-${fallbackIndex}`;
}

export interface BoundaryRow {
  id: string;
  countryIso3: string;
  level: number;
  levelName: string;
  externalId: string;
  parentId: string | null;
  name: string;
  geometry: GeoJSON.Geometry;
  bbox: [number, number, number, number];
  areaKm2: number;
  centroid: [number, number];
}

function toBoundaryRow(raw: typeof boundaries.$inferSelect): BoundaryRow {
  return {
    id: raw.id,
    countryIso3: raw.countryIso3,
    level: raw.level,
    levelName: raw.levelName,
    externalId: raw.externalId,
    parentId: raw.parentId,
    name: raw.name,
    geometry: raw.geometry as GeoJSON.Geometry,
    bbox: raw.bbox as [number, number, number, number],
    areaKm2: Number(raw.areaKm2),
    centroid: raw.centroid as [number, number],
  };
}

// 1-hour server-side memory cache for level lookups and parent-child sets
const levelCache = new Map<string, { time: number; rows: BoundaryRow[] }>();
// Server-side memory cache for individual boundaries by UUID
const singleBoundaryCache = new Map<string, BoundaryRow>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Ensure every feature for a given country+level exists in the DB cache (parentId left null initially). */
async function ensureLevelCached(iso3: string, level: number): Promise<BoundaryRow[]> {
  const cacheKey = `${iso3}_ALL_L${level}`;
  const mem = levelCache.get(cacheKey);
  if (mem && Date.now() - mem.time < CACHE_TTL_MS) {
    return mem.rows;
  }

  const existing = await db
    .select()
    .from(boundaries)
    .where(and(eq(boundaries.countryIso3, iso3), eq(boundaries.level, level)));

  if (existing.length > 0) {
    const mapped = existing.map(toBoundaryRow);
    mapped.forEach((r) => singleBoundaryCache.set(r.id, r));
    levelCache.set(cacheKey, { time: Date.now(), rows: mapped });
    return mapped;
  }

  const fc = await getRawFeatureCollection(iso3, level);
  if (!fc || !fc.features?.length) return [];

  const rows = fc.features.map((f, idx) => {
    const geometry = f.geometry;
    const bbox = turf.bbox(f) as [number, number, number, number];
    let areaKm2 = 0;
    let centroid: [number, number] = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
    try {
      areaKm2 = turf.area(f) / 1_000_000;
      const c = turf.centroid(f);
      centroid = c.geometry.coordinates as [number, number];
    } catch {
      // keep fallback values
    }
    return {
      countryIso3: iso3,
      level,
      levelName: levelName(iso3, level),
      externalId: shapeExternalId(f.properties, idx),
      parentId: null as string | null,
      name: shapeName(f.properties),
      geometry,
      bbox,
      areaKm2: areaKm2.toFixed(3),
      centroid,
    };
  });

  // Insert in chunks; ignore conflicts if another request raced us.
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await db.insert(boundaries).values(chunk).onConflictDoNothing();
  }

  const inserted = await db
    .select()
    .from(boundaries)
    .where(and(eq(boundaries.countryIso3, iso3), eq(boundaries.level, level)));
  const mapped = inserted.map(toBoundaryRow);
  mapped.forEach((r) => singleBoundaryCache.set(r.id, r));
  levelCache.set(cacheKey, { time: Date.now(), rows: mapped });
  return mapped;
}

/** Get the country-level (ADM0) boundary as a single row (fetched + cached like any level). */
export async function getCountryBoundary(iso3: string): Promise<BoundaryRow | null> {
  const cacheKey = `${iso3}_COUNTRY_0`;
  const cached = singleBoundaryCache.get(cacheKey);
  if (cached) return cached;
  const rows = await ensureLevelCached(iso3, 0);
  if (rows[0]) {
    singleBoundaryCache.set(cacheKey, rows[0]);
    singleBoundaryCache.set(rows[0].id, rows[0]);
    return rows[0];
  }
  return null;
}

/** Get children boundaries under a parent (or top-level ADM1 list when parent is null). */
export async function getChildBoundaries(
  iso3: string,
  level: number,
  parent: BoundaryRow | null,
): Promise<BoundaryRow[]> {
  const cacheKey = `${iso3}_L${level}_P${parent?.id || "root"}`;
  const cached = levelCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.rows;
  }

  // 1. Root Level (Level 1 divisions): return all level 1 boundaries
  if (level === 1 || !parent) {
    const all = await ensureLevelCached(iso3, level);
    const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
    levelCache.set(cacheKey, { time: Date.now(), rows: sorted });
    return sorted;
  }

  // 2. Fast Path: Check if children are ALREADY assigned to parent in database
  const directChildren = await db
    .select()
    .from(boundaries)
    .where(
      and(
        eq(boundaries.countryIso3, iso3),
        eq(boundaries.level, level),
        eq(boundaries.parentId, parent.id)
      )
    );

  if (directChildren.length > 0) {
    const rows = directChildren.map(toBoundaryRow).sort((a, b) => a.name.localeCompare(b.name));
    rows.forEach((r) => singleBoundaryCache.set(r.id, r));
    levelCache.set(cacheKey, { time: Date.now(), rows });
    return rows;
  }

  // 3. First-time computation: Level exists, but parentId not yet populated for this parent
  const allCandidates = await ensureLevelCached(iso3, level);
  if (allCandidates.length === 0) return [];

  const parentBbox = parent.bbox;
  const parentFeat = turf.feature(parent.geometry);
  const matchedChildren: BoundaryRow[] = [];
  const matchedIds: string[] = [];

  for (const candidate of allCandidates) {
    const cb = candidate.bbox;
    // Fast Bounding box rejection (0.0001ms)
    if (cb[2] < parentBbox[0] || cb[0] > parentBbox[2] || cb[3] < parentBbox[1] || cb[1] > parentBbox[3]) {
      continue;
    }

    // Fast Point-In-Polygon on Centroid (0.01ms vs 2000ms for polygon intersect)
    let isInside = false;
    try {
      isInside = turf.booleanPointInPolygon(turf.point(candidate.centroid), parentFeat as any);
    } catch {
      isInside = false;
    }

    // Fallback if centroid is slightly outside irregular polygon boundary
    if (!isInside) {
      try {
        const pt = turf.pointOnFeature(turf.feature(candidate.geometry));
        isInside = turf.booleanPointInPolygon(pt, parentFeat as any);
      } catch {}
    }

    if (isInside) {
      matchedChildren.push({ ...candidate, parentId: parent.id });
      matchedIds.push(candidate.id);
    }
  }

  // Batch update parentId in ONE single query (instead of looping 500 times)
  if (matchedIds.length > 0) {
    await db
      .update(boundaries)
      .set({ parentId: parent.id })
      .where(inArray(boundaries.id, matchedIds));
  }

  const sorted = matchedChildren.sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach((r) => singleBoundaryCache.set(r.id, r));
  levelCache.set(cacheKey, { time: Date.now(), rows: sorted });
  return sorted;
}

export async function getBoundaryById(id: string): Promise<BoundaryRow | null> {
  if (singleBoundaryCache.has(id)) {
    return singleBoundaryCache.get(id)!;
  }
  const rows = await db.select().from(boundaries).where(eq(boundaries.id, id)).limit(1);
  if (!rows[0]) return null;
  const row = toBoundaryRow(rows[0]);
  singleBoundaryCache.set(id, row);
  return row;
}

/** Search cached boundary names for a country (fast indexed ILIKE query). */
export async function searchBoundaries(iso3: string, query: string): Promise<BoundaryRow[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = await db
    .select()
    .from(boundaries)
    .where(and(eq(boundaries.countryIso3, iso3), ilike(boundaries.name, `%${q}%`)))
    .limit(10);
  return rows.map((row: any) => toBoundaryRow(row));
}
