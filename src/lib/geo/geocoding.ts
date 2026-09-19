import * as turf from "@turf/turf";
import { searchBoundaries } from "./geoBoundaries";

export interface GeocodedPlace {
  id: string;
  name: string;
  displayName: string;
  type: string;
  source: "nominatim" | "google" | "mapbox" | "db";
  bbox: [number, number, number, number]; // [west, south, east, north]
  centroid: [number, number]; // [lng, lat]
  geometry: GeoJSON.Geometry;
  areaKm2: number;
}

/**
 * Multi-Source Geocoding Engine
 * Primary: OpenStreetMap Nominatim (Free, No API Key, Returns Polygons)
 * Optional Fallback/Provider: Google Maps Geocoding or Mapbox if API keys are set in environment
 */
export async function geocodePlace(
  query: string,
  options?: { country?: string; limit?: number }
): Promise<GeocodedPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const limit = options?.limit ?? 6;
  const results: GeocodedPlace[] = [];
  const seenIds = new Set<string>();

  // Run Nominatim, Google/Mapbox, and DB in parallel
  const [nomResults, dbResults, googleResults, mapboxResults] = await Promise.allSettled([
    // 1. OpenStreetMap Nominatim (Always active, 100% Free, Returns Polygons)
    (async () => {
      const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
      nominatimUrl.searchParams.set("q", q);
      nominatimUrl.searchParams.set("format", "json");
      nominatimUrl.searchParams.set("polygon_geojson", "1");
      nominatimUrl.searchParams.set("addressdetails", "1");
      nominatimUrl.searchParams.set("limit", String(limit));
      if (options?.country) {
        nominatimUrl.searchParams.set("countrycodes", options.country.toLowerCase());
      }

      const res = await fetch(nominatimUrl.toString(), {
        headers: {
          "User-Agent": "GeoStudyAreaAnalyzer/2.5 (academic-gis; research@geostudyarea.org)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(4500),
        next: { revalidate: 3600 },
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const parsed: GeocodedPlace[] = [];
      for (const item of data) {
        const nomId = `osm-${item.osm_type}-${item.osm_id}`;
        const south = parseFloat(item.boundingbox[0]);
        const north = parseFloat(item.boundingbox[1]);
        const west = parseFloat(item.boundingbox[2]);
        const east = parseFloat(item.boundingbox[3]);
        const bbox: [number, number, number, number] = [west, south, east, north];

        const centroid: [number, number] = [parseFloat(item.lon), parseFloat(item.lat)];

        let geom: GeoJSON.Geometry = item.geojson;
        if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
          geom = turf.bboxPolygon(bbox).geometry;
        }

        let area = 0;
        try {
          area = Math.round((turf.area(turf.feature(geom)) / 1_000_000) * 100) / 100;
        } catch {
          area = Math.round((turf.area(turf.bboxPolygon(bbox)) / 1_000_000) * 100) / 100;
        }

        parsed.push({
          id: nomId,
          name: item.name || item.display_name.split(",")[0],
          displayName: item.display_name,
          type: item.type || item.class || "location",
          source: "nominatim",
          bbox,
          centroid,
          geometry: geom,
          areaKm2: area,
        });
      }
      return parsed;
    })(),

    // 2. Local Database Cached Boundaries
    (async () => {
      try {
        const dbItems = await searchBoundaries(options?.country || "BGD", q);
        return dbItems.slice(0, 3).map((item) => ({
          id: `db-${item.id}`,
          name: item.name,
          displayName: `${item.name} (${item.levelName}, ${item.countryIso3})`,
          type: item.levelName,
          source: "db" as const,
          bbox: item.bbox,
          centroid: item.centroid,
          geometry: item.geometry,
          areaKm2: item.areaKm2,
        }));
      } catch {
        return [];
      }
    })(),

    // 3. Google Maps Geocoding (if GOOGLE_MAPS_API_KEY is configured)
    (async () => {
      if (!process.env.GOOGLE_MAPS_API_KEY) return [];
      try {
        const googleUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        googleUrl.searchParams.set("address", q);
        googleUrl.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);
        if (options?.country) {
          googleUrl.searchParams.set("components", `country:${options.country.toLowerCase()}`);
        }

        const res = await fetch(googleUrl.toString(), {
          signal: AbortSignal.timeout(3500),
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.results || !Array.isArray(data.results)) return [];

        return data.results.slice(0, limit).map((item: any) => {
          const geom = item.geometry;
          const lat = geom.location.lat;
          const lng = geom.location.lng;
          const vp = geom.viewport || geom.bounds;
          const south = vp ? vp.southwest.lat : lat - 0.04;
          const west = vp ? vp.southwest.lng : lng - 0.04;
          const north = vp ? vp.northeast.lat : lat + 0.04;
          const east = vp ? vp.northeast.lng : lng + 0.04;

          const bboxPoly = turf.bboxPolygon([west, south, east, north]);
          const area = Math.round((turf.area(bboxPoly) / 1_000_000) * 100) / 100;

          return {
            id: `google-${item.place_id}`,
            name: item.address_components?.[0]?.long_name || item.formatted_address,
            displayName: item.formatted_address,
            type: item.types?.[0]?.replace(/_/g, " ") || "place",
            source: "google" as const,
            bbox: [west, south, east, north] as [number, number, number, number],
            centroid: [lng, lat] as [number, number],
            geometry: bboxPoly.geometry,
            areaKm2: area,
          };
        });
      } catch {
        return [];
      }
    })(),

    // 4. Mapbox Geocoding (if MAPBOX_ACCESS_TOKEN is configured)
    (async () => {
      if (!process.env.MAPBOX_ACCESS_TOKEN) return [];
      try {
        const mapboxUrl = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
        );
        mapboxUrl.searchParams.set("access_token", process.env.MAPBOX_ACCESS_TOKEN);
        mapboxUrl.searchParams.set("limit", String(limit));
        if (options?.country) {
          mapboxUrl.searchParams.set("country", options.country.toLowerCase());
        }

        const res = await fetch(mapboxUrl.toString(), {
          signal: AbortSignal.timeout(3500),
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.features || !Array.isArray(data.features)) return [];

        return data.features.map((feat: any) => {
          const center = feat.center || [0, 0];
          const bbox: [number, number, number, number] = feat.bbox || [
            center[0] - 0.04,
            center[1] - 0.04,
            center[0] + 0.04,
            center[1] + 0.04,
          ];

          const geom = feat.geometry || turf.bboxPolygon(bbox).geometry;
          const area = Math.round((turf.area(turf.bboxPolygon(bbox)) / 1_000_000) * 100) / 100;

          return {
            id: `mapbox-${feat.id}`,
            name: feat.text || feat.place_name,
            displayName: feat.place_name,
            type: feat.place_type?.[0] || "feature",
            source: "mapbox" as const,
            bbox,
            centroid: [center[0], center[1]] as [number, number],
            geometry: geom,
            areaKm2: area,
          };
        });
      } catch {
        return [];
      }
    })(),
  ]);

  // Combine results gracefully
  const placeLists = [
    nomResults.status === "fulfilled" ? nomResults.value : [],
    dbResults.status === "fulfilled" ? dbResults.value : [],
    googleResults.status === "fulfilled" ? googleResults.value : [],
    mapboxResults.status === "fulfilled" ? mapboxResults.value : [],
  ];

  for (const list of placeLists) {
    for (const place of list) {
      if (!seenIds.has(place.id) && results.length < limit) {
        seenIds.add(place.id);
        results.push(place);
      }
    }
  }

  return results;
}
