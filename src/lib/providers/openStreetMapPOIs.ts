/**
 * Real Critical Infrastructure & Facilities Provider using OpenStreetMap Overpass API
 * 100% Free - Extracts emergency services, hospitals, clinics, and schools.
 */

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { feature, point } from "@turf/helpers";

export interface FacilityRecord {
  id: number;
  name: string;
  type: "hospital" | "clinic" | "pharmacy" | "school" | "university" | "fire_station" | "police" | "other";
  category: "Health & Medical" | "Education" | "Emergency & Safety" | "Other";
  latitude: number;
  longitude: number;
}

export interface FacilitiesResult {
  totalCount: number;
  healthCount: number;
  educationCount: number;
  emergencyCount: number;
  facilities: FacilityRecord[];
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>;
  geojsonString: string;
  source: string;
}

export async function fetchOsmFacilities(
  bbox: [number, number, number, number],
  studyAreaGeometry?: GeoJSON.Geometry
): Promise<FacilitiesResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const south = minLat.toFixed(4);
  const west = minLng.toFixed(4);
  const north = maxLat.toFixed(4);
  const east = maxLng.toFixed(4);

  const query = `[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|pharmacy|school|university|fire_station|police"](${south},${west},${north},${east});
);
out 300;`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoStudyAreaAnalyzer/1.0",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "data=" + encodeURIComponent(query),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Overpass facilities query returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const elements: any[] = data.elements || [];

    const polyFeature = studyAreaGeometry ? feature(studyAreaGeometry as any) : null;
    const facilities: FacilityRecord[] = [];
    const geojsonFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

    let healthCount = 0;
    let educationCount = 0;
    let emergencyCount = 0;

    for (const el of elements) {
      if (!el.lat || !el.lon) continue;

      const amenity = el.tags?.amenity || "other";
      let category: FacilityRecord["category"] = "Other";
      if (["hospital", "clinic", "pharmacy"].includes(amenity)) {
        category = "Health & Medical";
        healthCount++;
      } else if (["school", "university"].includes(amenity)) {
        category = "Education";
        educationCount++;
      } else if (["fire_station", "police"].includes(amenity)) {
        category = "Emergency & Safety";
        emergencyCount++;
      }

      const pt = point([Number(el.lon), Number(el.lat)], {
        id: el.id,
        name: el.tags?.name || el.tags?.["name:en"] || `${amenity.replace("_", " ")}`,
        amenity,
        category,
      });

      if (polyFeature) {
        try {
          if (!booleanPointInPolygon(pt, polyFeature as any)) continue;
        } catch {
          // Keep if check fails
        }
      }

      facilities.push({
        id: el.id,
        name: pt.properties.name,
        type: amenity as any,
        category,
        latitude: el.lat,
        longitude: el.lon,
      });

      geojsonFeatures.push(pt);
    }

    const featureCollection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: geojsonFeatures,
    };

    return {
      totalCount: facilities.length,
      healthCount,
      educationCount,
      emergencyCount,
      facilities: facilities.slice(0, 60),
      geojson: featureCollection,
      geojsonString: JSON.stringify(featureCollection, null, 2),
      source: "OpenStreetMap Critical Amenities (Overpass API)",
    };
  } catch (err) {
    console.warn("Failed to fetch OSM facilities:", err);
    return null;
  }
}
