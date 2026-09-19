import { NextRequest } from "next/server";
// @ts-ignore
import shpwrite from "@mapbox/shp-write";

export const dynamic = "force-dynamic";

function geojsonToKml(name: string, geometry: GeoJSON.Geometry): string {
  let placemarks = "";
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates
      .map(
        (ring, idx) => `
        <${idx === 0 ? "outerBoundaryIs" : "innerBoundaryIs"}>
          <LinearRing>
            <coordinates>${ring.map(([lng, lat]) => `${lng},${lat},0`).join(" ")}</coordinates>
          </LinearRing>
        </${idx === 0 ? "outerBoundaryIs" : "innerBoundaryIs"}>`
      )
      .join("");
    placemarks = `<Polygon><tessellate>1</tessellate>${rings}</Polygon>`;
  } else if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates
      .map((poly) => {
        const rings = poly
          .map(
            (ring, idx) => `
          <${idx === 0 ? "outerBoundaryIs" : "innerBoundaryIs"}>
            <LinearRing>
              <coordinates>${ring.map(([lng, lat]) => `${lng},${lat},0`).join(" ")}</coordinates>
            </LinearRing>
          </${idx === 0 ? "outerBoundaryIs" : "innerBoundaryIs"}>`
          )
          .join("");
        return `<Polygon><tessellate>1</tessellate>${rings}</Polygon>`;
      })
      .join("");
    placemarks = `<MultiGeometry>${polys}</MultiGeometry>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <description>Study area boundary vector exported from GeoStudy</description>
    <Placemark>
      <name>${name}</name>
      ${placemarks}
    </Placemark>
  </Document>
</kml>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, geometry, format = "shapefile", areaKm2, levelName } = body;

    if (!geometry || !name) {
      return Response.json({ error: "Missing geometry or study area name" }, { status: 400 });
    }

    const cleanName = (name || "study_area")
      .trim()
      .replace(/[^\w\s-]/gi, "")
      .replace(/\s+/g, "_") || "study_area";

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            NAME: name,
            LEVEL: levelName || "Study Area",
            AREA_KM2: areaKm2 ? Number(areaKm2).toFixed(2) : "N/A",
            SOURCE: "GeoStudy",
          },
          geometry,
        },
      ],
    };

    if (format === "geojson") {
      const jsonStr = JSON.stringify(featureCollection, null, 2);
      return new Response(jsonStr, {
        headers: {
          "Content-Type": "application/geo+json",
          "Content-Disposition": `attachment; filename="${cleanName}.geojson"`,
        },
      });
    }

    if (format === "kml") {
      const kmlStr = geojsonToKml(name, geometry);
      return new Response(kmlStr, {
        headers: {
          "Content-Type": "application/vnd.google-earth.kml+xml",
          "Content-Disposition": `attachment; filename="${cleanName}.kml"`,
        },
      });
    }

    // Default: ESRI Shapefile (.zip)
    const zipBuffer: Buffer = await shpwrite.zip(featureCollection, {
      outputType: "nodebuffer",
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${cleanName}_shapefile.zip"`,
      },
    });
  } catch (err: any) {
    console.error("Vector export error:", err);
    return Response.json({ error: err?.message || "Failed to export boundary" }, { status: 500 });
  }
}
