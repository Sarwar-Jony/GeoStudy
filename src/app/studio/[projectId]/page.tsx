"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Download, 
  Layers, 
  Share2, 
  Eye, 
  Sliders, 
  Check, 
  FileArchive, 
  MapPin, 
  GitCompareArrows,
  Sparkles,
  Loader2,
  PieChart,
  Compass,
  FileText,
  Activity,
  Waves,
  Wind,
  Droplets,
  Flame,
  Building2,
  FileSpreadsheet,
  Keyboard,
  X,
  Copy,
  ExternalLink,
  Info
} from "lucide-react";
import DynamicStudyAreaMap from "@/components/map/DynamicStudyAreaMap";
import SwipeCompare from "@/components/SwipeCompare";
import type { MapLayerOverlay } from "@/components/map/StudyAreaMap";
import PublicationMapModal from "@/components/cartography/PublicationMapModal";
import ZonalStatsModal from "@/components/analysis/ZonalStatsModal";
import SuitabilityCalculatorModal from "@/components/analysis/SuitabilityCalculatorModal";
import StudyAreaReportModal from "@/components/reports/StudyAreaReportModal";

interface GeneratedLayer {
  id: string;
  projectId: string;
  layerKey: string;
  layerLabel: string;
  category: string;
  resolution: number;
  width: number;
  height: number;
  crs: string;
  filePath: string;
  fileSizeBytes: number;
  unit: string;
  stats: {
    min?: number;
    max?: number;
    mean?: number;
    stddev?: number;
    features?: number;
    lengthKm?: number;
    annualPrecipMm?: number;
    wettestMonth?: { month: string; precipMm: number };
    [key: string]: any;
  };
  legend?: Record<string, string> | Array<{ value: number; label: string; color: string }> | null;
  thumbnail: string;
  status: string;
}

interface ProjectData {
  project: {
    id: string;
    name: string;
    countryIso3: string;
    countryName: string;
    levelName: string;
    boundaryName: string;
    pathLabels: string[];
    geometry: GeoJSON.Geometry;
    bbox: [number, number, number, number];
    areaKm2: number;
    resolution: number;
    selectedLayers: string[];
    status: string;
    shareToken: string;
  };
  layers: GeneratedLayer[];
  job: any;
  catalog: Record<string, { label: string; category: string; description: string; unit?: string }>;
}

export default function ProjectViewerPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();

  const [activeLayerKey, setActiveLayerKey] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(85);
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeftKey, setCompareLeftKey] = useState<string | null>(null);
  const [compareRightKey, setCompareRightKey] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Mobile navigation tabs
  const [activeMobileTab, setActiveMobileTab] = useState<"map" | "layers" | "tools">("map");

  // Coordinate click inspector
  const [inspectedCoord, setInspectedCoord] = useState<{ lat: number; lng: number } | null>(null);

  // Keyboard shortcuts modal
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Advanced Geospatial Tools Modal States
  const [isPubMapOpen, setIsPubMapOpen] = useState(false);
  const [isZonalOpen, setIsZonalOpen] = useState(false);
  const [isMcdaOpen, setIsMcdaOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const { data, isLoading, error } = useQuery<ProjectData>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project layers");
      return res.json();
    },
  });

  const project = data?.project;
  const layers = data?.layers ?? [];

  // Automatically select first layer as active if not set
  const currentActiveKey = activeLayerKey || (layers.length > 0 ? layers[0].layerKey : null);
  const activeLayer = layers.find((l) => l.layerKey === currentActiveKey);
  const demLayer = layers.find((l) => l.layerKey === "dem");

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input, textarea, or contentEditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        setIsPubMapOpen(false);
        setIsZonalOpen(false);
        setIsMcdaOpen(false);
        setIsReportOpen(false);
        setShowShortcutsHelp(false);
        setInspectedCoord(null);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "s") {
        setCompareMode((prev) => !prev);
      } else if (key === "z") {
        setIsZonalOpen((prev) => !prev);
      } else if (key === "p") {
        setIsPubMapOpen((prev) => !prev);
      } else if (key === "c") {
        setIsMcdaOpen((prev) => !prev);
      } else if (key === "r") {
        setIsReportOpen((prev) => !prev);
      } else if (e.key === "?") {
        setShowShortcutsHelp((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Map overlays config
  const mapOverlays = useMemo<MapLayerOverlay[]>(() => {
    if (!project || !activeLayer || !activeLayer.thumbnail) return [];
    const bbox = project.bbox;
    // Leaflet bounds: [[south, west], [north, east]] = [[minLat, minLng], [maxLat, maxLng]]
    return [
      {
        key: activeLayer.layerKey,
        bounds: [
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ],
        url: activeLayer.thumbnail,
        opacity: opacity / 100,
      },
    ];
  }, [project, activeLayer, opacity]);

  const leftLayer = layers.find((l) => l.layerKey === (compareLeftKey || layers[0]?.layerKey));
  const rightLayer = layers.find(
    (l) => l.layerKey === (compareRightKey || (layers.length > 1 ? layers[1]?.layerKey : layers[0]?.layerKey))
  );

  const handleCopyShare = () => {
    if (!project?.shareToken) return;
    const url = `${window.location.origin}/studio/${project.id}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleCopyCoords = () => {
    if (!inspectedCoord) return;
    navigator.clipboard.writeText(`${inspectedCoord.lat.toFixed(6)}, ${inspectedCoord.lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Loading Study Area &amp; Raster Layers...</p>
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Not Found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {(error as Error)?.message || "Unable to locate this study area project."}
          </p>
          <button
            onClick={() => router.push("/studio")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
          >
            <ArrowLeft size={16} /> Return to Studio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb & Top Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push(`/studio/${projectId}/layers`)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-emerald-600 dark:text-slate-400"
        >
          <ArrowLeft size={14} /> Back to Layer Selection
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Keyboard shortcut trigger */}
          <button
            onClick={() => setShowShortcutsHelp(true)}
            title="Keyboard Shortcuts (?)"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Keyboard size={13} className="text-slate-400" />
            <span>Shortcuts</span>
            <kbd className="rounded bg-slate-100 px-1 py-0.2 text-[10px] text-slate-500 dark:bg-slate-800">?</kbd>
          </button>

          <button
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copiedShare ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
            {copiedShare ? "Link Copied!" : "Share Link"}
          </button>

          <a
            href={`/api/download/project/${projectId}/zip`}
            download
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <FileArchive size={14} />
            Download ZIP Bundle
          </a>
        </div>
      </div>

      {/* Hero Title & Metadata Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Sparkles size={13} />
              Step 4 of 4: Study Area Explorer &amp; GIS Export
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
              {project.boundaryName || project.name}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin size={13} className="text-emerald-500" />
              {Array.isArray(project.pathLabels) && project.pathLabels.length > 0
                ? project.pathLabels.join(" › ")
                : `${project.countryName} › ${project.boundaryName}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Area: <strong className="text-slate-900 dark:text-white">{Number(project.areaKm2).toFixed(2)} km²</strong>
            </span>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Resolution: <strong className="text-slate-900 dark:text-white">{project.resolution}m</strong>
            </span>
            <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {layers.length} Layers Generated
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Copernicus &amp; OSM
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Geospatial GIS Ribbon (Desktop & Tablet) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
            GIS Toolkit:
          </span>

          <button
            onClick={() => setIsZonalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <PieChart size={14} className="text-emerald-600" />
            Zonal Statistics
          </button>

          <button
            onClick={() => setIsPubMapOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Compass size={14} className="text-blue-500" />
            Publication Map
          </button>

          <button
            onClick={() => setIsMcdaOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800 transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
          >
            <Sliders size={14} className="text-purple-600" />
            Suitability (MCDA)
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
          >
            <FileText size={14} className="text-blue-600" />
            Research Monograph
          </button>
        </div>

        <a
          href={`/api/projects/${projectId}/stats/csv`}
          download
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <FileSpreadsheet size={14} className="text-emerald-600" />
          Export CSV Statistics
        </a>
      </div>

      {/* Mobile-Friendly Tabs Navigation (Visible on mobile screens < lg) */}
      <div className="mt-4 flex items-center rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/80 lg:hidden">
        <button
          onClick={() => setActiveMobileTab("map")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeMobileTab === "map"
              ? "bg-white text-emerald-700 shadow dark:bg-slate-900 dark:text-emerald-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          🗺️ Map &amp; Viewer
        </button>
        <button
          onClick={() => setActiveMobileTab("layers")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeMobileTab === "layers"
              ? "bg-white text-emerald-700 shadow dark:bg-slate-900 dark:text-emerald-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          📑 Layers ({layers.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("tools")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeMobileTab === "tools"
              ? "bg-white text-emerald-700 shadow dark:bg-slate-900 dark:text-emerald-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          🛠️ GIS Tools
        </button>
      </div>

      {/* Mobile GIS Tools View (Visible only on mobile when tools tab is active) */}
      {activeMobileTab === "tools" && (
        <div className="mt-4 space-y-3 lg:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Geospatial Analyst Toolkit
            </h3>
            <div className="grid gap-2.5">
              <button
                onClick={() => setIsZonalOpen(true)}
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-left transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40"
              >
                <div className="flex items-center gap-3">
                  <PieChart size={20} className="text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Zonal Statistics</div>
                    <div className="text-[11px] text-slate-500">LULC area breakdown &amp; elevation metrics</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600">Open ↗</span>
              </button>

              <button
                onClick={() => setIsPubMapOpen(true)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <Compass size={20} className="text-blue-500" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Publication Map Exporter</div>
                    <div className="text-[11px] text-slate-500">300 DPI, North Arrow, Graticule &amp; Legends</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">Export ↗</span>
              </button>

              <button
                onClick={() => setIsMcdaOpen(true)}
                className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-left transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40"
              >
                <div className="flex items-center gap-3">
                  <Sliders size={20} className="text-purple-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">MCDA Suitability Calculator</div>
                    <div className="text-[11px] text-slate-500">Weighted overlay with presets (Solar, Urban)</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600">Calculate ↗</span>
              </button>

              <button
                onClick={() => setIsReportOpen(true)}
                className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-left transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Research Monograph Section</div>
                    <div className="text-[11px] text-slate-500">Academic methodology in Markdown &amp; LaTeX</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">Generate ↗</span>
              </button>

              <a
                href={`/api/projects/${projectId}/stats/csv`}
                download
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Export CSV Statistics</div>
                    <div className="text-[11px] text-slate-500">Download table of all computed layer metrics</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600">Download ↗</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Map & Controls */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Map Column (7 cols on desktop, toggled on mobile) */}
        <div
          className={`space-y-4 lg:col-span-7 ${
            activeMobileTab === "map" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <DynamicStudyAreaMap
              geometry={project.geometry}
              bbox={project.bbox}
              overlays={mapOverlays}
              className="h-[460px] w-full"
              defaultBasemap="satellite"
              onMapClick={(info) => setInspectedCoord(info)}
            />

            {/* Real-time active overlay indicator on map */}
            {activeLayer && (
              <div className="absolute left-3 top-3 z-[1000] flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow-md backdrop-blur-md dark:bg-slate-900/90">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  Active Layer: {activeLayer.layerLabel}
                </span>
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {opacity}% Opacity
                </span>
              </div>
            )}
          </div>

          {/* Click Coordinate Inspector Floating Info Bar */}
          {inspectedCoord && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50/90 p-3 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
                  📍
                </span>
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Sample Coordinate: {inspectedCoord.lat.toFixed(5)}°N, {inspectedCoord.lng.toFixed(5)}°E
                  </div>
                  <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                    {demLayer
                      ? `Study Area Elevation Context: Min ${demLayer.stats?.min ?? 0}m, Max ${demLayer.stats?.max ?? 0}m`
                      : "Within Study Area Boundary Polygon"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyCoords}
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200"
                >
                  {copiedCoords ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copiedCoords ? "Copied" : "Copy Lat/Lng"}
                </button>
                <button
                  onClick={() => setInspectedCoord(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-emerald-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Opacity & Map Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <Sliders size={16} className="text-emerald-600 dark:text-emerald-400" />
              <label htmlFor="opacity-slider" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Layer Transparency
              </label>
              <input
                id="opacity-slider"
                type="range"
                min={0}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-36 accent-emerald-600 sm:w-48"
              />
              <span className="w-10 text-xs font-bold text-slate-600 dark:text-slate-400">
                {opacity}%
              </span>
            </div>

            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                compareMode
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <GitCompareArrows size={14} />
              {compareMode ? "Hide Swipe Comparison" : "Swipe Compare Tool"}
            </button>
          </div>

          {/* Swipe Compare View */}
          {compareMode && leftLayer && rightLayer && (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/20 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Select Two Layers to Compare Side-by-Side:
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={leftLayer.layerKey}
                    onChange={(e) => setCompareLeftKey(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {layers.map((l) => (
                      <option key={l.layerKey} value={l.layerKey}>
                        Left: {l.layerLabel}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rightLayer.layerKey}
                    onChange={(e) => setCompareRightKey(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {layers.map((l) => (
                      <option key={l.layerKey} value={l.layerKey}>
                        Right: {l.layerLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <SwipeCompare left={leftLayer} right={rightLayer} />
            </div>
          )}
        </div>

        {/* Layers List & Statistics Column (5 cols on desktop, toggled on mobile) */}
        <div
          className={`space-y-4 lg:col-span-5 ${
            activeMobileTab === "layers" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
              Generated Raster Layers ({layers.length})
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              GeoTIFF &amp; Vector Format
            </span>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {layers.map((layer) => {
              const isSelected = layer.layerKey === currentActiveKey;
              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerKey(layer.layerKey)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:bg-slate-900"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail preview */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      <img
                        src={layer.thumbnail}
                        alt={layer.layerLabel}
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/30">
                          <Eye size={18} className="text-white drop-shadow" />
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate font-bold text-slate-900 dark:text-white">
                          {layer.layerLabel}
                        </div>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {layer.category}
                        </span>
                      </div>

                      {/* Stats snippet */}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {layer.category === "Vector & Infrastructure" ? (
                          <>
                            <span>Features: <strong>{layer.stats?.features ?? layer.stats?.max ?? 0}</strong></span>
                            {layer.stats?.lengthKm !== undefined && (
                              <span>Total: <strong>{Number(layer.stats.lengthKm).toFixed(1)} km</strong></span>
                            )}
                            <span className="text-emerald-600 dark:text-emerald-400">OSM Live</span>
                          </>
                        ) : layer.category === "Climate & Weather" ? (
                          <>
                            <span>Annual: <strong>{layer.stats?.annualPrecipMm ?? 0} mm</strong></span>
                            <span>Mean: <strong>{layer.stats?.mean ?? 0}°C</strong></span>
                            <span className="text-emerald-600 dark:text-emerald-400">ERA5 Live</span>
                          </>
                        ) : (
                          <>
                            {layer.stats?.min !== undefined && (
                              <span>Min: <strong>{Number(layer.stats.min).toFixed(1)}</strong></span>
                            )}
                            {layer.stats?.mean !== undefined && (
                              <span>Avg: <strong>{Number(layer.stats.mean).toFixed(1)}</strong></span>
                            )}
                            {layer.stats?.max !== undefined && (
                              <span>Max: <strong>{Number(layer.stats.max).toFixed(1)}</strong> {layer.unit}</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {layer.category !== "Climate & Weather" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveLayerKey(layer.layerKey);
                              // On mobile, switch to map tab
                              if (window.innerWidth < 1024) {
                                setActiveMobileTab("map");
                              }
                            }}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <Eye size={12} />
                            {isSelected ? "Active on Map" : "View on Map"}
                          </button>
                        )}

                        <a
                          href={`/api/download/layer/${layer.id}`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Download size={12} />
                          {layer.category === "Vector & Infrastructure"
                            ? `GeoJSON (${(layer.fileSizeBytes / 1024).toFixed(0)} KB)`
                            : layer.category === "Climate & Weather"
                            ? `JSON (${(layer.fileSizeBytes / 1024).toFixed(0)} KB)`
                            : `GeoTIFF (${(layer.fileSizeBytes / 1024).toFixed(0)} KB)`}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated Climate & Weather Card */}
          {(() => {
            const climateLayer = layers.find((l) => l.layerKey === "climate_summary");
            if (!climateLayer) return null;
            const monthly = Array.isArray(climateLayer.legend) ? climateLayer.legend : [];
            const maxPrecip = Math.max(...monthly.map((m: any) => m.precipSumMm || 0), 10);

            return (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/20 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400" />
                    Live 1-Year Climate &amp; Rainfall (Open-Meteo ERA5)
                  </h3>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Live Data
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Annual Rain</div>
                    <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {climateLayer.stats?.annualPrecipMm ?? 0} mm
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Mean Temp</div>
                    <div className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      {climateLayer.stats?.mean ?? 0}°C
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Max Temp</div>
                    <div className="text-base font-extrabold text-amber-600">
                      {climateLayer.stats?.max ?? 0}°C
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Min Temp</div>
                    <div className="text-base font-extrabold text-sky-600">
                      {climateLayer.stats?.min ?? 0}°C
                    </div>
                  </div>
                </div>

                {monthly.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <span>Monthly Rainfall Breakdown (mm)</span>
                      <span>Wettest: {climateLayer.stats?.wettestMonth?.month} ({climateLayer.stats?.wettestMonth?.precipMm} mm)</span>
                    </div>
                    <div className="flex h-24 items-end gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                      {monthly.map((m: any) => {
                        const hPercent = Math.max(8, Math.round(((m.precipSumMm || 0) / maxPrecip) * 100));
                        const monthLabel = m.month?.slice(5);
                        return (
                          <div key={m.month} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                            <div
                              style={{ height: `${hPercent}%` }}
                              className="w-full rounded-t bg-emerald-500 transition-all group-hover:bg-emerald-400"
                            />
                            <span className="mt-1 text-[9px] font-semibold text-slate-500">{monthLabel}</span>
                            <div className="pointer-events-none absolute -top-8 z-50 hidden rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shadow group-hover:block whitespace-nowrap dark:bg-slate-100 dark:text-slate-900">
                              {m.precipSumMm} mm · {m.tempMeanAvg}°C
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Flood Risk GloFAS Card */}
          {(() => {
            const floodLayer = layers.find((l) => l.layerKey === "flood_risk");
            if (!floodLayer) return null;
            const peak = floodLayer.stats?.peakDischargeM3s ?? floodLayer.stats?.max ?? 0;
            const risk = floodLayer.stats?.riskLevel || "Low";
            const riskBg =
              risk === "Severe"
                ? "bg-red-500"
                : risk === "High"
                ? "bg-orange-500"
                : risk === "Moderate"
                ? "bg-amber-500"
                : "bg-sky-500";

            return (
              <div className="rounded-2xl border border-sky-500/30 bg-sky-50/20 p-5 dark:border-sky-900/50 dark:bg-sky-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Waves size={15} className="text-sky-600 dark:text-sky-400" />
                    GloFAS River Discharge &amp; Flood Risk
                  </h3>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${riskBg}`}>
                    {risk} Risk
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Peak Discharge</div>
                    <div className="text-base font-extrabold text-sky-600 dark:text-sky-400">{peak} m³/s</div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Peak Date</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {floodLayer.stats?.peakDate || "Within 7 Days"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Air Quality CAMS Card */}
          {(() => {
            const aqLayer = layers.find((l) => l.layerKey === "air_quality");
            if (!aqLayer) return null;
            const aqi = aqLayer.stats?.europeanAqi ?? 25;
            const cat = aqLayer.stats?.aqiCategory || "Good";
            const aqiColor = aqi > 60 ? "text-red-500" : aqi > 40 ? "text-amber-500" : "text-emerald-500";

            return (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-50/20 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Wind size={15} className="text-indigo-600 dark:text-indigo-400" />
                    CAMS Live Air Quality Index
                  </h3>
                  <span className={`text-xs font-black ${aqiColor}`}>{cat} ({aqi} AQI)</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">PM2.5</div>
                    <div className="text-xs font-bold">{aqLayer.stats?.pm25 ?? 0} µg/m³</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">PM10</div>
                    <div className="text-xs font-bold">{aqLayer.stats?.pm10 ?? 0} µg/m³</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">NO₂</div>
                    <div className="text-xs font-bold">{aqLayer.stats?.nitrogenDioxide ?? 0} µg/m³</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Soil Moisture Profile Card */}
          {(() => {
            const smLayer = layers.find((l) => l.layerKey === "soil_moisture");
            if (!smLayer) return null;
            const cat = smLayer.stats?.droughtCategory || "Adequate";

            return (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-50/20 p-5 dark:border-purple-900/50 dark:bg-purple-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Droplets size={15} className="text-purple-600 dark:text-purple-400" />
                    Volumetric Soil Moisture (ECMWF)
                  </h3>
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                    {cat}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">0-7cm Surface</div>
                    <div className="text-xs font-bold text-purple-600">{smLayer.stats?.surface ?? 0.25} m³/m³</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">7-28cm Root</div>
                    <div className="text-xs font-bold text-purple-600">{smLayer.stats?.rootZone ?? 0.28} m³/m³</div>
                  </div>
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-500">28-100cm Deep</div>
                    <div className="text-xs font-bold text-purple-600">{smLayer.stats?.deepSoil ?? 0.30} m³/m³</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* USGS Earthquakes Card */}
          {(() => {
            const eqLayer = layers.find((l) => l.layerKey === "earthquakes");
            if (!eqLayer) return null;
            const count = eqLayer.stats?.totalEvents ?? eqLayer.stats?.features ?? 0;
            const maxMag = eqLayer.stats?.maxMagnitude ?? eqLayer.stats?.max ?? 0;

            return (
              <div className="rounded-2xl border border-red-500/30 bg-red-50/20 p-5 dark:border-red-900/50 dark:bg-red-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Activity size={15} className="text-red-600 dark:text-red-400" />
                    USGS Earthquake Catalog (Past 30 Years)
                  </h3>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-900/60 dark:text-red-300">
                    {count} Events
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Maximum Recorded Magnitude</span>
                    <span className="text-base font-black text-red-600">M{maxMag} Richter</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Average Magnitude</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">M{eqLayer.stats?.mean ?? 3.0}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* NASA FIRMS Fires Card */}
          {(() => {
            const fireLayer = layers.find((l) => l.layerKey === "active_fires");
            if (!fireLayer) return null;
            const count = fireLayer.stats?.fireCount ?? fireLayer.stats?.features ?? 0;
            const maxFrp = fireLayer.stats?.maxFrpMw ?? 0;

            return (
              <div className="rounded-2xl border border-orange-500/30 bg-orange-50/20 p-5 dark:border-orange-900/50 dark:bg-orange-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Flame size={15} className="text-orange-600 dark:text-orange-400" />
                    NASA FIRMS Active Fires &amp; Thermal Anomalies
                  </h3>
                  <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-900/60 dark:text-orange-300">
                    {count} Hotspots
                  </span>
                </div>
                <div className="mt-3 rounded-lg bg-white p-3 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Peak Fire Radiative Power</span>
                    <span className="text-base font-black text-orange-600">{maxFrp} MW</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Satellite Sensor: VIIRS NRT</span>
                </div>
              </div>
            );
          })()}

          {/* Critical Facilities Card */}
          {(() => {
            const facLayer = layers.find((l) => l.layerKey === "critical_facilities");
            if (!facLayer) return null;
            const total = facLayer.stats?.features ?? 0;
            const health = facLayer.stats?.healthCount ?? 0;
            const edu = facLayer.stats?.educationCount ?? 0;

            return (
              <div className="rounded-2xl border border-teal-500/30 bg-teal-50/20 p-5 dark:border-teal-900/50 dark:bg-teal-950/20">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <Building2 size={15} className="text-teal-600 dark:text-teal-400" />
                    Critical Amenities (OpenStreetMap)
                  </h3>
                  <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                    {total} Facilities
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Hospitals &amp; Clinics</div>
                    <div className="text-base font-black text-teal-600">{health}</div>
                  </div>
                  <div className="rounded-lg bg-white p-2.5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Schools &amp; Universities</div>
                    <div className="text-base font-black text-sky-600">{edu}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Download Boundary GeoJSON */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Need only the Study Area Polygon?
            </div>
            <a
              href={`/api/download/boundary/${projectId}`}
              download
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              <Download size={13} />
              Download Study Area Boundary (.geojson)
            </a>
          </div>
        </div>
      </div>

      {/* Geospatial Modals */}
      {project && (
        <>
          <PublicationMapModal
            isOpen={isPubMapOpen}
            onClose={() => setIsPubMapOpen(false)}
            project={project}
            activeLayer={activeLayer}
          />
          <ZonalStatsModal
            isOpen={isZonalOpen}
            onClose={() => setIsZonalOpen(false)}
            project={project}
            layers={layers}
          />
          <SuitabilityCalculatorModal
            isOpen={isMcdaOpen}
            onClose={() => setIsMcdaOpen(false)}
            project={project}
            layers={layers}
          />
          <StudyAreaReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            project={project}
            layers={layers}
          />
        </>
      )}

      {/* Keyboard Shortcuts Cheat-Sheet Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Keyboard size={20} className="text-emerald-600" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Keyboard Shortcuts
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Speed up your geospatial analysis workflows with single-key shortcuts:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200 font-medium">Toggle Swipe Compare</span>
                <kbd className="rounded bg-white px-2 py-0.5 font-bold shadow-sm dark:bg-slate-900">S</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200 font-medium">Open Zonal Statistics</span>
                <kbd className="rounded bg-white px-2 py-0.5 font-bold shadow-sm dark:bg-slate-900">Z</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200 font-medium">Open Publication Map Exporter</span>
                <kbd className="rounded bg-white px-2 py-0.5 font-bold shadow-sm dark:bg-slate-900">P</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200 font-medium">Open MCDA Suitability Tool</span>
                <kbd className="rounded bg-white px-2 py-0.5 font-bold shadow-sm dark:bg-slate-900">C</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200 font-medium">Open Research Monograph</span>
                <kbd className="rounded bg-white px-2 py-0.5 font-bold shadow-sm dark:bg-slate-900">R</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                <span className="text-slate-700 dark:text-slate-200 font-medium">Close Dialog / Clear Sample</span>
                <kbd className="rounded bg-white px-2 py-0.5 font-bold shadow-sm dark:bg-slate-900">Esc</kbd>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
