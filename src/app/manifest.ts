import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GeoStudy — Study Area & Raster Layer Analyzer",
    short_name: "GeoStudy",
    description:
      "Autonomous Geospatial Study Area Intelligence & Remote Sensing Analytics Platform. Export DEM, Slope, NDVI, LULC and vector boundaries.",
    start_url: "/",
    display: "standalone",
    background_color: "#060913",
    theme_color: "#059669",
    orientation: "any",
    categories: ["productivity", "education", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "New Study Area",
        short_name: "New AOI",
        description: "Select administrative boundary or upload AOI",
        url: "/studio",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "My Projects",
        short_name: "Projects",
        description: "View saved geospatial projects",
        url: "/projects",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
