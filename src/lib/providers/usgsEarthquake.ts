/**
 * Real Natural Hazards Provider using USGS Earthquake Hazards Program API
 * 100% Free & Open - Queries historical & recent seismic events in the Study Area.
 */

import { feature, point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

export interface EarthquakeRecord {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  depthKm: number;
  longitude: number;
  latitude: number;
  url: string;
}

export interface EarthquakeHazardResult {
  totalEvents: number;
  maxMagnitude: number;
  meanMagnitude: number;
  recentEvent?: EarthquakeRecord;
  events: EarthquakeRecord[];
  geojson: GeoJSON.FeatureCollection<GeoJSON.Point>;
  geojsonString: string;
  source: string;
}

export async function fetchUsgsEarthquakes(
  bbox: [number, number, number, number],
  studyAreaGeometry?: GeoJSON.Geometry,
  minMagnitude: number = 2.5
): Promise<EarthquakeHazardResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Query events over past 30 years within bbox
  const startDate = "1995-01-01";
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate}&minmagnitude=${minMagnitude}&minlatitude=${minLat.toFixed(4)}&maxlatitude=${maxLat.toFixed(4)}&minlongitude=${minLng.toFixed(4)}&maxlongitude=${maxLng.toFixed(4)}&limit=250&orderby=magnitude`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoStudyAreaAnalyzer/1.0",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`USGS Earthquake API returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    const rawFeatures: any[] = json.features || [];

    const events: EarthquakeRecord[] = [];
    const geojsonFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

    const polyFeature = studyAreaGeometry ? feature(studyAreaGeometry as any) : null;

    let maxMag = 0;
    let sumMag = 0;

    for (const f of rawFeatures) {
      const geom = f.geometry;
      if (!geom || geom.type !== "Point" || !Array.isArray(geom.coordinates)) continue;

      const [lon, lat, depth] = geom.coordinates;
      const mag = Number(f.properties?.mag ?? 0);
      const pt = point([Number(lon), Number(lat)], {
        id: f.id,
        magnitude: mag,
        place: f.properties?.place || "Unknown Location",
        time: f.properties?.time ? new Date(f.properties.time).toISOString() : "",
        depthKm: depth != null ? Number(depth.toFixed(1)) : 0,
        url: f.properties?.url || "",
      });

      // Spatial boundary check if geometry provided
      if (polyFeature) {
        try {
          if (!booleanPointInPolygon(pt, polyFeature as any)) {
            continue;
          }
        } catch {
          // If topology error, keep
        }
      }

      events.push({
        id: f.id,
        magnitude: mag,
        place: pt.properties.place,
        time: pt.properties.time,
        depthKm: pt.properties.depthKm,
        longitude: lon,
        latitude: lat,
        url: pt.properties.url,
      });

      geojsonFeatures.push(pt);
      if (mag > maxMag) maxMag = mag;
      sumMag += mag;
    }

    // Sort by magnitude descending
    events.sort((a, b) => b.magnitude - a.magnitude);

    const featureCollection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: geojsonFeatures,
    };

    return {
      totalEvents: events.length,
      maxMagnitude: Number(maxMag.toFixed(1)),
      meanMagnitude: events.length > 0 ? Number((sumMag / events.length).toFixed(1)) : 0,
      recentEvent: events.find((e) => Boolean(e.time)),
      events: events.slice(0, 50),
      geojson: featureCollection,
      geojsonString: JSON.stringify(featureCollection, null, 2),
      source: "USGS Earthquake Hazards Program (ComCat Global Catalog)",
    };
  } catch (err) {
    console.warn("Failed to fetch USGS earthquakes:", err);
    return null;
  }
}
