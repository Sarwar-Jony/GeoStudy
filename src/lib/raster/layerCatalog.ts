export type LayerCategory =
  | "Terrain"
  | "Spectral Indices"
  | "Land Cover"
  | "Vector & Infrastructure"
  | "Climate & Weather"
  | "Natural Hazards & Disaster"
  | "Others";

export interface LayerDef {
  key: string;
  label: string;
  category: LayerCategory;
  unit: string;
  dataType: "float32" | "byte" | "vector" | "climate" | "hazard";
  description: string;
  needsDem?: boolean;
}

export const LAYER_CATALOG: LayerDef[] = [
  // Terrain (Live Copernicus 30m Real Elevation)
  { key: "dem", label: "DEM (Digital Elevation Model)", category: "Terrain", unit: "m", dataType: "float32", description: "Real Copernicus 30m bare-earth elevation above sea level." },
  { key: "dsm", label: "DSM (Digital Surface Model)", category: "Terrain", unit: "m", dataType: "float32", description: "Surface elevation including canopy/buildings.", needsDem: true },
  { key: "elevation", label: "Elevation", category: "Terrain", unit: "m", dataType: "float32", description: "Real ground elevation above sea level.", needsDem: true },
  { key: "slope", label: "Slope", category: "Terrain", unit: "degrees", dataType: "float32", description: "Physical terrain steepness derived from Copernicus DEM.", needsDem: true },
  { key: "aspect", label: "Aspect", category: "Terrain", unit: "degrees (0-360)", dataType: "float32", description: "Compass direction of real slope face.", needsDem: true },
  { key: "hillshade", label: "Hillshade", category: "Terrain", unit: "index (0-255)", dataType: "byte", description: "Real 3D shaded relief (sun az 315°, alt 45°).", needsDem: true },
  { key: "curvature", label: "Curvature", category: "Terrain", unit: "per 100m", dataType: "float32", description: "Topographic profile curvature (concave/convex).", needsDem: true },
  { key: "twi", label: "Topographic Wetness Index (TWI)", category: "Terrain", unit: "index", dataType: "float32", description: "Soil saturation tendency derived from DEM catchment & slope.", needsDem: true },

  // Climate & Weather (Live Open-Meteo & ECMWF)
  { key: "climate_summary", label: "Climate & Rainfall Summary", category: "Climate & Weather", unit: "timeseries", dataType: "climate", description: "Real 1-year historical rainfall, temperature, and seasonal extremes." },
  { key: "flood_risk", label: "River Discharge & Flood Risk", category: "Climate & Weather", unit: "m³/s", dataType: "climate", description: "GloFAS 7-day river discharge forecast and historical percentile." },
  { key: "soil_moisture", label: "Soil Moisture Profile (0-100cm)", category: "Climate & Weather", unit: "% vol", dataType: "climate", description: "Volumetric soil moisture at 0-7cm, 7-28cm, and 28-100cm depths." },
  { key: "air_quality", label: "Air Quality & PM2.5 (CAMS)", category: "Climate & Weather", unit: "AQI", dataType: "climate", description: "European AQI, PM2.5, PM10, NO2, and Ozone levels." },

  // Natural Hazards & Disaster (Live USGS & NASA)
  { key: "earthquakes", label: "Earthquake History & Seismic Points", category: "Natural Hazards & Disaster", unit: "Magnitude", dataType: "hazard", description: "USGS global earthquake catalog (past 30 years) within AOI." },
  { key: "active_fires", label: "Active Wildfires & Thermal Hotspots", category: "Natural Hazards & Disaster", unit: "FRP (MW)", dataType: "hazard", description: "NASA FIRMS MODIS/VIIRS thermal anomaly detections." },

  // Vector & Infrastructure (Live OpenStreetMap Overpass)
  { key: "roads", label: "Roads & Transportation (OSM)", category: "Vector & Infrastructure", unit: "GeoJSON", dataType: "vector", description: "Real OpenStreetMap highway & road network vectors." },
  { key: "waterways", label: "Rivers & Waterways (OSM)", category: "Vector & Infrastructure", unit: "GeoJSON", dataType: "vector", description: "Real OpenStreetMap rivers, canals, and streams." },
  { key: "critical_facilities", label: "Critical Facilities (Hospitals & Schools)", category: "Vector & Infrastructure", unit: "GeoJSON", dataType: "vector", description: "OpenStreetMap health, education, and emergency services POIs." },

  // Spectral indices
  { key: "ndvi", label: "NDVI", category: "Spectral Indices", unit: "index (-1 to 1)", dataType: "float32", description: "Normalized Difference Vegetation Index." },
  { key: "ndwi", label: "NDWI", category: "Spectral Indices", unit: "index (-1 to 1)", dataType: "float32", description: "Normalized Difference Water Index." },
  { key: "ndbi", label: "NDBI", category: "Spectral Indices", unit: "index (-1 to 1)", dataType: "float32", description: "Normalized Difference Built-up Index." },
  { key: "ndmi", label: "NDMI", category: "Spectral Indices", unit: "index (-1 to 1)", dataType: "float32", description: "Normalized Difference Moisture Index." },
  { key: "savi", label: "SAVI", category: "Spectral Indices", unit: "index (-1 to 1)", dataType: "float32", description: "Soil Adjusted Vegetation Index." },
  { key: "evi", label: "EVI", category: "Spectral Indices", unit: "index (-1 to 1)", dataType: "float32", description: "Enhanced Vegetation Index." },

  // Land cover
  { key: "lulc", label: "LULC (Land Use / Land Cover)", category: "Land Cover", unit: "class", dataType: "byte", description: "10-class land cover, ESA WorldCover style legend." },

  // Others
  { key: "population_density", label: "Population Density", category: "Others", unit: "people / km²", dataType: "float32", description: "Modeled population density surface." },
  { key: "night_lights", label: "Night-time Lights", category: "Others", unit: "radiance (nW/cm²/sr)", dataType: "float32", description: "VIIRS-like night light radiance." },
  { key: "built_up_intensity", label: "Built-up Intensity", category: "Others", unit: "index (0-1)", dataType: "float32", description: "Fractional built-up surface intensity." },
  { key: "tree_cover", label: "Tree Cover", category: "Others", unit: "% canopy", dataType: "float32", description: "Percent tree canopy cover." },
  { key: "water_bodies", label: "Water Bodies Mask", category: "Others", unit: "0 / 1", dataType: "byte", description: "Binary surface-water presence mask." },
];

export const LAYER_MAP = new Map(LAYER_CATALOG.map((l) => [l.key, l]));

export const RESOLUTION_OPTIONS = [10, 30, 100, 250, 500] as const;
