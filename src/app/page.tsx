"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mountain,
  Leaf,
  Building2,
  Map as MapIcon,
  Download,
  Layers,
  Wand2,
  ShieldCheck,
  ArrowRight,
  Globe2,
  Compass,
  PieChart,
  Sliders,
  FileText,
  CheckCircle2,
  ChevronDown,
  Waves,
  Wind,
  Droplets,
  Flame,
  FileSpreadsheet,
  Zap,
  Sparkles,
  ExternalLink,
  Check,
  Eye,
  GitCompareArrows,
  Search,
  Maximize2,
  X
} from "lucide-react";
import DynamicGeoBackground from "@/components/common/DynamicGeoBackground";
import {
  CopernicusLogo,
  NasaLogo,
  GoogleEarthEngineLogo,
  UsgsLogo,
  EcmwfLogo,
  OsmLogo,
  NeonLogo,
  SentinelBadge,
  GlofasBadge,
  CamsBadge,
} from "@/components/common/BrandLogos";

// Catalog of supported layers with rich metadata
const CATALOG_ITEMS = [
  {
    key: "dem",
    label: "Digital Elevation Model (DEM)",
    category: "terrain",
    categoryLabel: "Terrain",
    resolution: "30m",
    sensor: "Copernicus GLO-30 / SRTM",
    unit: "meters",
    format: "GeoTIFF",
    description: "High-resolution topographic surface elevation model referenced to WGS 84 vertical datum.",
    gradient: "from-amber-700 via-yellow-500 to-lime-300",
  },
  {
    key: "slope",
    label: "Slope Gradient",
    category: "terrain",
    categoryLabel: "Terrain",
    resolution: "30m",
    sensor: "Copernicus DEM Derived",
    unit: "degrees",
    format: "GeoTIFF",
    description: "Terrain steepness calculated using Horn's algorithm, vital for landslide and runoff models.",
    gradient: "from-emerald-500 via-amber-400 to-red-600",
  },
  {
    key: "twi",
    label: "Topographic Wetness Index (TWI)",
    category: "terrain",
    categoryLabel: "Terrain",
    resolution: "30m",
    sensor: "Copernicus Hydro Derivative",
    unit: "ln(a / tan β)",
    format: "GeoTIFF",
    description: "Physical measure of water accumulation potential and soil saturated moisture zone.",
    gradient: "from-amber-200 via-teal-400 to-blue-700",
  },
  {
    key: "ndvi",
    label: "Normalized Difference Vegetation Index",
    category: "vegetation",
    categoryLabel: "Vegetation",
    resolution: "10m",
    sensor: "Sentinel-2 MSI (B8/B4)",
    unit: "index (-1 to +1)",
    format: "GeoTIFF",
    description: "Canopy greenness, photosynthetic activity, and forest density monitoring.",
    gradient: "from-amber-900 via-yellow-400 to-emerald-600",
  },
  {
    key: "ndwi",
    label: "Normalized Difference Water Index",
    category: "water",
    categoryLabel: "Water & Flood",
    resolution: "10m",
    sensor: "Sentinel-2 MSI (B3/B8)",
    unit: "index (-1 to +1)",
    format: "GeoTIFF",
    description: "Surface water body delineation, river course tracking, and wetland mapping.",
    gradient: "from-slate-100 via-cyan-300 to-blue-700",
  },
  {
    key: "flood_risk",
    label: "GloFAS River Discharge & Flood Risk",
    category: "water",
    categoryLabel: "Water & Flood",
    resolution: "Global 0.05°",
    sensor: "Copernicus GloFAS / ECMWF",
    unit: "m³/s",
    format: "GeoJSON & Vector",
    description: "Live 7-day river discharge forecasts and return-period hydrological inundation hazard.",
    gradient: "from-sky-300 via-blue-500 to-indigo-800",
  },
  {
    key: "air_quality",
    label: "CAMS Atmospheric Air Quality Index",
    category: "hazard",
    categoryLabel: "Hazards & Climate",
    resolution: "Global 0.25°",
    sensor: "Copernicus CAMS & Open-Meteo",
    unit: "AQI & µg/m³",
    format: "GeoJSON & Vector",
    description: "Real-time PM2.5, PM10, Nitrogen Dioxide (NO2), and European Air Quality Index.",
    gradient: "from-emerald-400 via-amber-500 to-purple-800",
  },
  {
    key: "soil_moisture",
    label: "Volumetric Soil Moisture Profile",
    category: "vegetation",
    categoryLabel: "Vegetation & Soil",
    resolution: "Global 0.1°",
    sensor: "ECMWF IFS Land Model",
    unit: "m³/m³ (3 Depths)",
    format: "GeoJSON & Vector",
    description: "Soil water content measured at 0-7cm (surface), 7-28cm (root), and 28-100cm (deep).",
    gradient: "from-amber-300 via-orange-400 to-purple-700",
  },
  {
    key: "earthquakes",
    label: "USGS Seismic Hazard Catalog",
    category: "hazard",
    categoryLabel: "Hazards & Climate",
    resolution: "Point Catalog",
    sensor: "USGS Earthquake Program",
    unit: "Richter (M)",
    format: "GeoJSON & Vector",
    description: "30-year historical seismic events, epicenter points, Richter magnitude and focal depth.",
    gradient: "from-orange-400 via-red-500 to-rose-900",
  },
  {
    key: "active_fires",
    label: "NASA FIRMS Wildfire Hotspots",
    category: "hazard",
    categoryLabel: "Hazards & Climate",
    resolution: "375m",
    sensor: "VIIRS NRT / MODIS",
    unit: "MW (FRP)",
    format: "GeoJSON & Vector",
    description: "Active thermal anomalies and fire radiative power detections from polar orbiters.",
    gradient: "from-amber-400 via-orange-500 to-red-600",
  },
  {
    key: "lulc",
    label: "Land Use / Land Cover (LULC)",
    category: "urban",
    categoryLabel: "Urban & Land",
    resolution: "10m",
    sensor: "Dynamic World / Sentinel-2",
    unit: "9 Classes",
    format: "GeoTIFF",
    description: "Near real-time 10m artificial intelligence land classification: water, trees, built-up, crops.",
    gradient: "from-emerald-600 via-yellow-400 to-red-600",
  },
  {
    key: "critical_facilities",
    label: "Critical Amenities & Infrastructure",
    category: "urban",
    categoryLabel: "Urban & Land",
    resolution: "Vector Nodes",
    sensor: "OpenStreetMap Overpass",
    unit: "Amenities Count",
    format: "GeoJSON & Vector",
    description: "Hospitals, health clinics, universities, schools, fire stations and emergency services.",
    gradient: "from-teal-400 to-cyan-700",
  },
];

const FAQS = [
  {
    q: "Is GeoStudy Area Analyzer free for research and commercial use?",
    a: "Yes, 100% free! All core administrative boundary extractions, 30m Copernicus DEM, GloFAS river discharge, CAMS air quality, ECMWF soil moisture, USGS earthquakes, and OpenStreetMap layers are open-access without any subscription.",
  },
  {
    q: "Can I open the exported GeoTIFFs directly in QGIS or ArcGIS Pro?",
    a: "Absolutely. Every generated raster layer is georeferenced in the standard WGS 84 coordinate reference system (EPSG:4326), with embedded spatial metadata. You can drag and drop them straight into QGIS, ArcGIS Pro, Google Earth, or Python GDAL/Rasterio.",
  },
  {
    q: "How accurate is the 30m Copernicus DEM and Sentinel-2 optical data?",
    a: "The elevation data is sourced directly from the European Space Agency's Copernicus GLO-30 dataset, which provides high vertical accuracy (~2-4m) globally. The multi-spectral bands (NDVI, NDWI, etc.) come from ESA's Sentinel-2 MSI at 10m ground resolution.",
  },
  {
    q: "Can I upload my own custom study area boundary?",
    a: "Yes! In addition to our cascading administrative hierarchy for 190+ countries, you can upload zipped ESRI Shapefiles (.zip containing .shp, .dbf, .prj), Google Earth KML files (.kml), standard GeoJSON, or enter decimal degree bounding box coordinates.",
  },
  {
    q: "How can I cite these datasets and maps in my research paper?",
    a: "Our built-in Research Monograph generator produces a publication-ready 'Study Area & Data Description' section formatted in both LaTeX and Markdown, including formal academic citations for Copernicus, ESA, USGS, and NASA.",
  },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [swipePosition, setSwipePosition] = useState(50);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeFigureTab, setActiveFigureTab] = useState<"publication" | "mcda">("publication");
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; caption: string } | null>(null);

  const filteredItems =
    activeCategory === "all"
      ? CATALOG_ITEMS
      : CATALOG_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <main className="relative min-h-screen bg-[#f8fafc]/90 text-slate-900 transition-colors dark:bg-[#070d18]/90 dark:text-slate-100">
      {/* Real Dynamic Geodetic Mesh & Aurora Radar Background */}
      <DynamicGeoBackground />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_25%,rgba(16,185,129,0.15),transparent_50%),radial-gradient(circle_at_75%_10%,rgba(59,130,246,0.14),transparent_50%),radial-gradient(circle_at_50%_90%,rgba(139,92,246,0.08),transparent_50%)]" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Copy (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur-md dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Next-Gen Geospatial Engine</span>
                <span className="rounded bg-emerald-200/80 px-1.5 py-0.2 text-[10px] font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                  v2.5 LIVE
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white">
                Turn Any Administrative Boundary Into an{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-sky-400">
                  Academic-Grade GIS Dataset
                </span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Instantly extract, clip, and analyze <strong>30m DEM, Sentinel-2 Optical Indices, GloFAS Flood Discharge, CAMS Air Quality, Soil Moisture</strong>, and <strong>USGS Earthquakes</strong> for any study area in seconds. Export georeferenced GeoTIFFs, 300 DPI publication maps, and LaTeX monographs.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/studio"
                  className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-emerald-600 hover:shadow-emerald-600/20 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  <Sparkles size={16} />
                  Launch Study Area Studio
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="#catalog"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Layers size={16} className="text-emerald-500" />
                  Explore 19+ Live Layers
                </a>
              </div>

              {/* Live Status Tickers */}
              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-white/60 p-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DEM Resolution</div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">Copernicus 30m</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white/60 p-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Optical Bands</div>
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Sentinel-2 10m</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white/60 p-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Coverage</div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">190+ Countries</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white/60 p-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cloud DB Engine</div>
                  <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400">Neon Postgres</div>
                </div>
              </div>
            </div>

            {/* Right Visual: Interactive Live Swipe Showcase (5 cols) */}
            <div className="relative lg:col-span-5">
              <div className="relative mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                {/* Header of Preview */}
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                        Interactive Dual-Layer Comparison
                      </h2>
                      <p className="text-[10px] text-slate-400">Dhaka Division Study Area (20,973 km²)</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Live Demo
                  </span>
                </div>

                {/* High-resolution interactive swipe comparison viewport */}
                <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 select-none dark:border-slate-800 shadow-inner group">
                  {/* Left layer (DEM Topography Image) */}
                  <div className="absolute inset-0">
                    <img
                      src="/images/hero-dem-elevation.jpg"
                      alt="Digital Elevation Model (DEM) Topography"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-11 left-3 z-10 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-slate-950/85 px-2.5 py-1 text-[10px] font-extrabold text-amber-300 shadow-lg backdrop-blur-md">
                      <Mountain size={12} className="text-amber-400" />
                      <span>30m DEM Elevation (Copernicus GLO-30)</span>
                    </div>
                  </div>

                  {/* Right layer (NDVI Vegetation) clipped by swipe position */}
                  <div
                    style={{ clipPath: `inset(0 0 0 ${swipePosition}%)` }}
                    className="absolute inset-0"
                  >
                    <img
                      src="/images/hero-ndvi-vegetation.jpg"
                      alt="Sentinel-2 NDVI Canopy Remote Sensing"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-11 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-slate-950/85 px-2.5 py-1 text-[10px] font-extrabold text-emerald-300 shadow-lg backdrop-blur-md">
                      <Leaf size={12} className="text-emerald-400" />
                      <span>Sentinel-2 NDVI Canopy (10m)</span>
                    </div>
                  </div>

                  {/* Swipe Divider line */}
                  <div
                    style={{ left: `${swipePosition}%` }}
                    className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_15px_rgba(255,255,255,0.95)] z-20"
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl border-2 border-emerald-400">
                      <GitCompareArrows size={14} className="text-emerald-300" />
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => setLightboxImage({
                      src: swipePosition > 50 ? "/images/hero-dem-elevation.jpg" : "/images/hero-ndvi-vegetation.jpg",
                      title: "Satellite Earth Observation & Topographic Relief",
                      caption: "30m Copernicus Digital Elevation Model (DEM) and Sentinel-2 10m Normalized Difference Vegetation Index (NDVI) raster comparison."
                    })}
                    className="absolute top-3 right-3 z-20 rounded-full bg-slate-950/70 p-2 text-white/80 backdrop-blur-md transition hover:bg-slate-900 hover:text-white"
                    title="Expand view"
                  >
                    <Maximize2 size={13} />
                  </button>

                  {/* Slider controller */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={swipePosition}
                    onChange={(e) => setSwipePosition(Number(e.target.value))}
                    className="absolute inset-x-0 bottom-3 z-30 mx-auto w-4/5 accent-emerald-500 cursor-ew-resize opacity-85 hover:opacity-100"
                    aria-label="Swipe comparison slider"
                  />
                </div>

                {/* Live Real-time sensor badges */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
                    <Waves size={15} className="text-sky-500 shrink-0" />
                    <div className="truncate">
                      <span className="block text-[10px] text-slate-400">GloFAS Discharge</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">1,420 m³/s Peak</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
                    <Wind size={15} className="text-indigo-500 shrink-0" />
                    <div className="truncate">
                      <span className="block text-[10px] text-slate-400">CAMS Air Quality</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">AQI 38 (Good)</span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <Link
                  href="/studio"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                >
                  <Globe2 size={14} />
                  Test Live on Your Boundary
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Earth Observation Providers Banner with Official Vector Logos */}
      <section className="relative z-10 border-b border-slate-200/80 bg-white/70 py-10 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            Powered by Global Earth Observation &amp; Open Science Data Providers
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <CopernicusLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-red-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <NasaLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <GoogleEarthEngineLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-emerald-600 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <UsgsLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <EcmwfLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-lime-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <OsmLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
              <NeonLogo size={26} className="h-6 w-auto text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Academic & Professional GIS Toolkit Spotlight */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Advanced Geospatial Suite
          </span>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
            Built for Real Academic Research &amp; Urban Planning
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Eliminate tedious manual GIS workflows. Our platform computes zonal distribution, analytical suitability, publication cartography, and citations in one click.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Publication Map */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Compass size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Publication Map Studio
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Generate 300 DPI journal maps with dynamic North Arrows, latitude-calibrated scale bars, coordinate graticules, and legends. Formatted for Elsevier, Springer &amp; Nature.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>300 DPI · PDF &amp; PNG</span>
            </div>
          </div>

          {/* Card 2: Zonal Stats */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <PieChart size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Zonal Landscape Metrics
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Instant LULC area breakdown in km² and %, terrain elevation moments (Mean, Min, Max, StdDev), slope steepness classes, and infrastructure density ratios.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>LULC km² &amp; Moments</span>
            </div>
          </div>

          {/* Card 3: MCDA Calculator */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-purple-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Sliders size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              MCDA Suitability Engine
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Analytical Hierarchy Process (AHP) weighted overlay tool with presets for Solar PV Farm siting, Urban expansion, and Ecological Buffer zoning.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Weighted Overlay (AHP)</span>
            </div>
          </div>

          {/* Card 4: Research Monograph */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <FileText size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Automated Monograph
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Synthesize a formal academic methodology chapter: &quot;2. Study Area Description and Geospatial Datasets&quot; ready to copy in LaTeX and Markdown with complete citations.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>LaTeX &amp; Markdown</span>
            </div>
          </div>
        </div>

        {/* Academic Cartography & Analysis Figure Showcase */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Header with Figure Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Academic Figure Output (Peer-Reviewed Journal Standard)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFigureTab("publication")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeFigureTab === "publication"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Compass size={14} />
                Figure 1: 300 DPI Publication Cartography
              </button>
              <button
                type="button"
                onClick={() => setActiveFigureTab("mcda")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeFigureTab === "mcda"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Sliders size={14} />
                Figure 2: 3D MCDA Raster Layer Stacking
              </button>
            </div>
          </div>

          {/* Figure Content Area */}
          <div className="p-6 sm:p-8">
            {activeFigureTab === "publication" ? (
              <div className="grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div
                    onClick={() =>
                      setLightboxImage({
                        src: "/images/publication-map-figure.jpg",
                        title: "Figure 1: Location and Topography of Study Area (Elsevier / Nature Format)",
                        caption:
                          "300 DPI academic study area map layout featuring study boundary, digital elevation hillshade, major rivers, coordinate graticules (104°30'W - 39°30'N), compass rose north arrow, metric scale bar (0-10 km), and inset global locator globe.",
                      })
                    }
                    className="group relative cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                  >
                    <img
                      src="/images/publication-map-figure.jpg"
                      alt="Academic Publication Map Figure"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/20" />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
                      <Maximize2 size={12} />
                      Click to Expand (300 DPI)
                    </span>
                  </div>
                </div>
                <div className="space-y-4 lg:col-span-5">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    <span>Journal-Grade Cartography</span>
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Figure 1. Location and Topography of the Study Area
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Compliant with international peer-reviewed journals (Elsevier, Springer-Nature, MDPI, IEEE). Features geographic coordinate graticules along the borders, a dynamic north arrow, calibrated metric scale bar, elevation hillshade shading, and inset locator globe.
                  </p>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Spatial Reference</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">EPSG:4326 (WGS 84)</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Print Resolution</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">300 DPI (Lossless PNG / Vector PDF)</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Cartographic Elements</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Graticules, Inset Globe, Legend, Scale</span>
                    </div>
                  </div>
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    <span>Generate custom publication map for your study area</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div
                    onClick={() =>
                      setLightboxImage({
                        src: "/images/mcda-layer-stack.jpg",
                        title: "Figure 2: Multi-Criteria Decision Analysis (MCDA) GIS Layer Stacking",
                        caption:
                          "3D isometric visualization of multi-criteria spatial analysis stack: DEM elevation, slope steepness, hydrologic stream buffers, classified LULC, and resulting composite AHP suitability heatmap score.",
                      })
                    }
                    className="group relative cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                  >
                    <img
                      src="/images/mcda-layer-stack.jpg"
                      alt="MCDA GIS Raster Layer Stacking"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/20" />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
                      <Maximize2 size={12} />
                      Click to Expand (3D Isometric Stack)
                    </span>
                  </div>
                </div>
                <div className="space-y-4 lg:col-span-5">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    <span>AHP Weighted Overlay</span>
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Figure 2. 5-Layer MCDA Spatial Decision Stack
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Automated multi-criteria evaluation combining terrain relief, environmental sensitivities, hydrology buffers, and land use zoning into a composite suitability index (0-100).
                  </p>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Stack Composition</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">DEM + Slope + Hydrology + LULC</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Analytical Model</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">Saaty&apos;s Analytical Hierarchy Process (AHP)</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Output Classes</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">High (85-100), Marginal (30-70), Exclusion (0-30)</span>
                    </div>
                  </div>
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                  >
                    <span>Run suitability overlay on your boundary</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Data Layer Catalog */}
      <section id="catalog" className="border-t border-slate-200 bg-slate-100/60 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Data Catalog
              </span>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
                19+ Live Geospatial &amp; Earth Observation Layers
              </h2>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800">
              {[
                { id: "all", label: "All Layers" },
                { id: "terrain", label: "⛰️ Terrain" },
                { id: "vegetation", label: "🌿 Vegetation" },
                { id: "water", label: "🌊 Water & Flood" },
                { id: "hazard", label: "⚠️ Hazards" },
                { id: "urban", label: "🏙️ Urban & Roads" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    activeCategory === tab.id
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <div
                key={item.key}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  {/* Visual Palette Preview */}
                  <div className={`h-12 w-full rounded-xl bg-gradient-to-r ${item.gradient} shadow-inner mb-3`} />

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {item.categoryLabel}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.resolution}
                    </span>
                  </div>

                  <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {item.label}
                  </h4>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                  <span className="truncate max-w-[150px]">{item.sensor}</span>
                  <span className="rounded font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5">
                    {item.format}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bring Your Own AOI: Universal Boundary Inputs */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Flexible Ingestion
          </span>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
            Universal Study Area Inputs (Bring-Your-Own-AOI)
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Whether analyzing an official administrative district or a custom watershed polygon, GeoStudy Area Analyzer handles it seamlessly.
          </p>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-12">
          {/* Left: Beautiful glowing AOI boundary clipping figure (5 cols) */}
          <div className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800">
              <img
                src="/images/aoi-boundary-clip.jpg"
                alt="Vector Boundary Polygon Clipping Satellite Raster"
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 inset-x-4">
                <span className="inline-block rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-400/40">
                  Client-Side Vector Masking
                </span>
                <h4 className="mt-1.5 text-sm font-bold text-white">
                  Precision Boundary Delineation
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  Exact vector geometry preserves irregular contours across all 19+ raster bands with zero bounding-box distortion.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLightboxImage({
                    src: "/images/aoi-boundary-clip.jpg",
                    title: "Study Area Boundary Delineation & Vector Masking",
                    caption:
                      "Vector boundary polygon cleanly clipping 10m Sentinel-2 satellite imagery and DEM terrain with coordinate graticule reference.",
                  })
                }
                className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-2 text-white/80 backdrop-blur-md transition hover:bg-slate-900 hover:text-white"
                title="Expand figure"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Right: The 4 ingestion options (7 cols) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">🏛️</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hierarchical Discovery
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Drill down from Country ➔ Division ➔ District ➔ Sub-district ➔ Union across 190+ countries.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">📦</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ESRI Shapefile (.zip)
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Upload zipped shapefiles containing .shp, .dbf, and .prj. Clipped on the client securely.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">🌐</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Google Earth KML
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Export polygons from Google Earth (.kml) and drag-and-drop straight into the studio.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">📍</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bounding Box &amp; GeoJSON
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Input exact South, West, North, and East decimal degree coordinates or raw GeoJSON.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Manual GIS vs. GeoStudy Area Analyzer */}
      <section className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Performance Benchmark
            </span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
              Traditional GIS Workflow vs. GeoStudy Area Analyzer
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md dark:border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>
                  <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">Analysis Step</th>
                  <th className="p-3.5 font-bold text-slate-500 dark:text-slate-400">Traditional GIS Manual Flow</th>
                  <th className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">GeoStudy Area Analyzer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                <tr>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">AOI Discovery</td>
                  <td className="p-3.5 text-slate-500">Search government websites or dig through shapefile archives</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">1-click cascading dropdowns (190+ countries)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">Data Acquisition</td>
                  <td className="p-3.5 text-slate-500">Download multi-gigabyte raw tiles from USGS / SciHub (hours)</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Cloud-native clipping to exact boundary (seconds)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">Hazard Integration</td>
                  <td className="p-3.5 text-slate-500">Write custom Python scripts for GloFAS, CAMS, and USGS</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Pre-integrated live streams automatically computed</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">Publication Maps</td>
                  <td className="p-3.5 text-slate-500">Manual layout composer in QGIS / ArcGIS (scale bars, north arrows)</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Instant 300 DPI export ready for Nature/Springer</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">Zonal Metrics</td>
                  <td className="p-3.5 text-slate-500">Raster to polygon, zonal statistics toolboxes, Excel tables</td>
                  <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Automated LULC % breakdown &amp; elevation moments</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            FAQ
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-slate-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative overflow-hidden border-t border-slate-200 bg-slate-950 py-20 text-center text-white dark:border-slate-800">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.25),transparent_60%)]" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40">
            <Globe2 size={28} />
          </div>
          <h2 className="text-3xl font-black sm:text-4xl">
            Start Analyzing Your Study Area in Seconds
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            No complex installations required. Drill down to any district, select your live environmental sensors, and download publication-ready GeoTIFFs immediately.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              <Sparkles size={16} />
              Open Study Area Wizard
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Full Resolution Figure Inspection */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-5xl w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
              <div>
                <h3 className="text-sm font-extrabold text-white">{lightboxImage.title}</h3>
                <span className="text-[10px] text-emerald-400 font-semibold">High-Resolution Scientific Figure</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[68vh] overflow-auto p-4 bg-black/40 flex items-center justify-center">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[64vh] w-auto rounded-xl object-contain shadow-2xl"
              />
            </div>
            <div className="border-t border-slate-800 bg-slate-950/70 px-6 py-3.5 text-xs text-slate-300 leading-relaxed">
              {lightboxImage.caption}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
