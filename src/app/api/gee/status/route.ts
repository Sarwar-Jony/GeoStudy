import { getGeeStatus, initGee } from "@/lib/gee/client";

export const dynamic = "force-dynamic";

export async function GET() {
  await initGee().catch(() => {});
  const status = getGeeStatus();

  return Response.json({
    status,
    sensors: [
      {
        id: "s2",
        name: "Sentinel-2 MSI Level-2A",
        resolution: "10m",
        agency: "ESA / Copernicus",
        layers: ["true_color", "ndvi", "ndwi", "ndmi", "evi", "savi"],
      },
      {
        id: "dem",
        name: "Copernicus GLO-30 / SRTM DEM",
        resolution: "30m",
        agency: "ESA / USGS",
        layers: ["dem", "slope", "aspect", "hillshade"],
      },
      {
        id: "dw",
        name: "Dynamic World V1 LULC",
        resolution: "10m",
        agency: "Google / World Resources Institute",
        layers: ["lulc"],
      },
      {
        id: "viirs",
        name: "VIIRS Nighttime Day/Night Band",
        resolution: "500m",
        agency: "NOAA",
        layers: ["night_lights"],
      },
    ],
  });
}
