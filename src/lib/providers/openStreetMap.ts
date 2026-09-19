/**
 * Real Vector Provider using OpenStreetMap Overpass API
 * 100% Free - Extracts real roads and waterways for any study area.
 */

import booleanIntersects from "@turf/boolean-intersects";
import { feature, lineString } from "@turf/helpers";

export interface OsmVectorResult {
  featureCount: number;
  totalLengthKm: number;
  geojson: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  geojsonString: string;
  source: string;
}

export async function fetchOsmRoads(
  bbox: [number, number, number, number],
  studyAreaGeometry?: GeoJSON.Geometry
): Promise<OsmVectorResult | null> {
  return queryOverpass(
    bbox,
    `way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential"]`,
    "roads",
    studyAreaGeometry
  );
}

export async function fetchOsmWaterways(
  bbox: [number, number, number, number],
  studyAreaGeometry?: GeoJSON.Geometry
): Promise<OsmVectorResult | null> {
  return queryOverpass(
    bbox,
    `way["waterway"~"river|stream|canal|drain|ditch"]`,
    "waterways",
    studyAreaGeometry
  );
}

async function queryOverpass(
  bbox: [number, number, number, number],
  selector: string,
  typeCategory: "roads" | "waterways",
  studyAreaGeometry?: GeoJSON.Geometry
): Promise<OsmVectorResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const south = minLat.toFixed(4);
  const west = minLng.toFixed(4);
  const north = maxLat.toFixed(4);
  const east = maxLng.toFixed(4);

  const query = `[out:json][timeout:25];
(
  ${selector}(${south},${west},${north},${east});
);
out geom 500;`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoStudyAreaAnalyzer/1.0 (OpenStreetMap integration)",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "data=" + encodeURIComponent(query),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Overpass API returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const elements: any[] = data.elements || [];

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    let totalLengthKm = 0;

    const studyAreaFeature = studyAreaGeometry
      ? feature(studyAreaGeometry as any)
      : null;

    for (const el of elements) {
      if (el.type !== "way" || !Array.isArray(el.geometry) || el.geometry.length < 2) {
        continue;
      }

      const coordinates: [number, number][] = el.geometry.map((pt: any) => [
        Number(pt.lon),
        Number(pt.lat),
      ]);

      const line = lineString(coordinates, {
        id: el.id,
        name: el.tags?.name || el.tags?.["name:en"] || el.tags?.ref || "Unnamed",
        type: el.tags?.highway || el.tags?.waterway,
        category: typeCategory,
        surface: el.tags?.surface,
        lanes: el.tags?.lanes,
        bridge: el.tags?.bridge,
        tunnel: el.tags?.tunnel,
        oneway: el.tags?.oneway,
        maxspeed: el.tags?.maxspeed,
        lengthKm: 0,
      });


      // If study area polygon is given, verify spatial intersection
      if (studyAreaFeature) {
        try {
          if (!booleanIntersects(line, studyAreaFeature)) {
            continue;
          }
        } catch {
          // If intersection check fails on topology, keep the feature
        }
      }

      // Compute approximate geodesic length in km
      let lenKm = 0;
      for (let i = 1; i < coordinates.length; i++) {
        const [lon1, lat1] = coordinates[i - 1];
        const [lon2, lat2] = coordinates[i];
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        lenKm += 6371 * c;
      }

      line.properties = {
        ...line.properties,
        lengthKm: Number(lenKm.toFixed(3)),
      };
      totalLengthKm += lenKm;
      features.push(line);
    }

    const featureCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: "FeatureCollection",
      features,
    };

    return {
      featureCount: features.length,
      totalLengthKm: Number(totalLengthKm.toFixed(2)),
      geojson: featureCollection,
      geojsonString: JSON.stringify(featureCollection, null, 2),
      source: "OpenStreetMap (Overpass API)",
    };
  } catch (err) {
    console.warn(`Failed to fetch OSM ${typeCategory}:`, err);
    return null;
  }
}
