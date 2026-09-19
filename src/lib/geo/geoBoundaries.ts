import * as turf from "@turf/turf";
import { db } from "@/db";
import { boundaries } from "@/db/schema";
import { and, eq, isNull, ilike } from "drizzle-orm";
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

/** Ensure every feature for a given country+level exists in the DB cache (parentId left null initially). */
async function ensureLevelCached(iso3: string, level: number): Promise<BoundaryRow[]> {
  const existing = await db
    .select()
    .from(boundaries)
    .where(and(eq(boundaries.countryIso3, iso3), eq(boundaries.level, level)));
  if (existing.length > 0) return existing.map(toBoundaryRow);

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
  return inserted.map(toBoundaryRow);
}

/** Get the country-level (ADM0) boundary as a single row (fetched + cached like any level). */
export async function getCountryBoundary(iso3: string): Promise<BoundaryRow | null> {
  const rows = await ensureLevelCached(iso3, 0);
  return rows[0] ?? null;
}

function computeOverlapArea(geom1: GeoJSON.Geometry, geom2: GeoJSON.Geometry): number {
  try {
    const isect = turf.intersect(
      turf.featureCollection([turf.feature(geom1), turf.feature(geom2)]) as any,
    );
    if (isect) return turf.area(isect);
  } catch {
    // Fallback if complex polygon boundary has self-intersection
  }
  try {
    const pt = turf.pointOnFeature(turf.feature(geom1));
    if (turf.booleanPointInPolygon(pt, turf.feature(geom2) as any)) {
      return 1;
    }
  } catch {
    // ignore
  }
  return 0;
}

/** Get children boundaries under a parent (or top-level ADM1 list when parent is null). */
export async function getChildBoundaries(
  iso3: string,
  level: number,
  parent: BoundaryRow | null,
): Promise<BoundaryRow[]> {
  const all = await ensureLevelCached(iso3, level);
  if (all.length === 0) return [];
  if (level === 1 || !parent) {
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  const parentBbox = parent.bbox;
  const matchedChildren: BoundaryRow[] = [];
  const needsParentUpdate: string[] = [];

  for (const candidate of all) {
    const cb = candidate.bbox;
    // Quick bbox reject
    if (cb[2] < parentBbox[0] || cb[0] > parentBbox[2] || cb[3] < parentBbox[1] || cb[1] > parentBbox[3]) {
      continue;
    }

    // If candidate was already assigned to this parent, verify it's a true match and not a border glitch
    if (candidate.parentId === parent.id) {
      const overlap = computeOverlapArea(candidate.geometry, parent.geometry);
      const candidateAreaM2 = candidate.areaKm2 * 1_000_000;
      const overlapRatio = candidateAreaM2 > 0 ? overlap / candidateAreaM2 : 0;

      // If overlap with this parent is virtually non-existent (< 10%), it was wrongly claimed by centroid border bug
      if (overlapRatio < 0.10 && candidateAreaM2 > 100_000) {
        // Unset invalid parentId so the true parent can claim it
        await db
          .update(boundaries)
          .set({ parentId: null })
          .where(eq(boundaries.id, candidate.id));
        continue;
      }

      matchedChildren.push(candidate);
      continue;
    }

    // If candidate has no parent or had a dubious assignment, check overlap area with this parent
    const overlap = computeOverlapArea(candidate.geometry, parent.geometry);
    const candidateAreaM2 = candidate.areaKm2 * 1_000_000;
    const overlapRatio = candidateAreaM2 > 0 ? overlap / candidateAreaM2 : 0;

    // A true child boundary substantially overlaps with its administrative parent (> 35% of child area)
    if (overlapRatio > 0.35 || (overlap > 10_000_000 && overlapRatio > 0.15)) {
      matchedChildren.push({ ...candidate, parentId: parent.id });
      needsParentUpdate.push(candidate.id);
    }
  }

  if (needsParentUpdate.length > 0) {
    for (const childId of needsParentUpdate) {
      await db
        .update(boundaries)
        .set({ parentId: parent.id })
        .where(eq(boundaries.id, childId));
    }
  }

  return matchedChildren.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBoundaryById(id: string): Promise<BoundaryRow | null> {
  const rows = await db.select().from(boundaries).where(eq(boundaries.id, id)).limit(1);
  return rows[0] ? toBoundaryRow(rows[0]) : null;
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
