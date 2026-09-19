"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  MapPin,
  Ruler,
  CheckCircle2,
  ArrowLeft,
  Globe2,
  Calendar,
  Cloud,
  Sliders,
  Settings,
  Zap,
  Check,
  RotateCcw
} from "lucide-react";
import DynamicStudyAreaMap from "@/components/map/DynamicStudyAreaMap";
import GeeSettingsModal from "@/components/GeeSettingsModal";

interface LayerDef {
  key: string;
  label: string;
  category: string;
  unit: string;
  dataType: string;
  description: string;
}

interface ProjectResponse {
  project: {
    id: string;
    name: string;
    boundaryName: string;
    levelName: string;
    countryName: string;
    areaKm2: string;
    bbox: [number, number, number, number];
    geometry: GeoJSON.Geometry;
    selectedLayers: string[];
    resolution: number;
    status: string;
  };
  catalog: LayerDef[];
}

const RESOLUTIONS = [10, 30, 100, 250, 500];

interface PresetWorkflow {
  id: string;
  name: string;
  badge: string;
  icon: string;
  description: string;
  layers: string[];
  recommendedResolution: number;
  tags: string[];
}

const RESEARCH_PRESETS: PresetWorkflow[] = [
  {
    id: "flood",
    name: "Flood & Hydrology Study",
    badge: "Hydro / GloFAS",
    icon: "🌊",
    description: "Catchment elevation, slope runoff, wetness index, surface water & GloFAS river discharge.",
    layers: ["dem", "slope", "twi", "ndwi", "waterways", "flood_risk"],
    recommendedResolution: 30,
    tags: ["DEM", "TWI", "GloFAS", "Water"],
  },
  {
    id: "urban",
    name: "Urban Expansion & Air Quality",
    badge: "Urban / CAMS",
    icon: "🏙️",
    description: "Built-up indices, VIIRS night lights, WorldPop human density & CAMS atmospheric pollution.",
    layers: ["ndbi", "built_up_intensity", "night_lights", "population_density", "air_quality", "roads"],
    recommendedResolution: 30,
    tags: ["NDBI", "WorldPop", "CAMS AQI", "Roads"],
  },
  {
    id: "agri",
    name: "Agriculture & Drought Monitoring",
    badge: "Agri / Soil",
    icon: "🌾",
    description: "Crop vegetation index, soil moisture depth profiles, NDMI water stress & agroclimate.",
    layers: ["ndvi", "savi", "ndmi", "soil_moisture", "climate_summary"],
    recommendedResolution: 30,
    tags: ["NDVI", "SAVI", "Soil Profile", "ERA5"],
  },
  {
    id: "disaster",
    name: "Multi-Hazard & Emergency Resilience",
    badge: "Disaster / Hazards",
    icon: "⚠️",
    description: "USGS seismic catalogs, NASA FIRMS active fires, critical hospitals/facilities & slope.",
    layers: ["slope", "earthquakes", "active_fires", "critical_facilities", "flood_risk"],
    recommendedResolution: 100,
    tags: ["USGS", "NASA FIRMS", "Facilities", "Risk"],
  },
];

export default function LayersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resolution, setResolution] = useState(100);
  const [goal, setGoal] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ recommendedLayers: string[]; reasoning: string; source: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Satellite & GEE parameters
  const [isGeeModalOpen, setIsGeeModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 4);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [maxCloudCover, setMaxCloudCover] = useState(15);

  const { data: geeData, refetch: refetchGee } = useQuery({
    queryKey: ["geeStatus"],
    queryFn: async () => (await fetch("/api/gee/status")).json(),
  });

  const { data, isLoading } = useQuery<ProjectResponse>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.project) {
      setSelected(new Set(data.project.selectedLayers?.length ? data.project.selectedLayers : ["dem", "slope", "roads", "ndvi", "lulc", "climate_summary"]));
      setResolution(data.project.resolution || 100);
    }
  }, [data?.project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const map = new Map<string, LayerDef[]>();
    for (const l of data?.catalog || []) {
      if (!map.has(l.category)) map.set(l.category, []);
      map.get(l.category)!.push(l);
    }
    return map;
  }, [data?.catalog]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActivePreset(null);
  }

  function handleApplyPreset(preset: PresetWorkflow) {
    setSelected(new Set(preset.layers));
    setResolution(preset.recommendedResolution);
    setActivePreset(preset.id);
  }

  function handleSelectAll() {
    if (!data?.catalog) return;
    setSelected(new Set(data.catalog.map((l) => l.key)));
    setActivePreset(null);
  }

  function handleClearAll() {
    setSelected(new Set());
    setActivePreset(null);
  }

  async function askAssistant() {
    if (!goal.trim()) return;
    setSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const json = await res.json();
      setSuggestion(json);
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    setSelected(new Set(suggestion.recommendedLayers));
    setActivePreset(null);
  }

  async function generate() {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one layer to generate.");
      return;
    }
    setStarting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedLayers: Array.from(selected),
          resolution,
          startDate,
          endDate,
          maxCloudCover,
        }),
      });
      const json = await res.json();
      router.push(`/studio/${projectId}/processing${json.jobId ? `?jobId=${json.jobId}` : ""}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <Loader2 className="animate-spin text-emerald-600" />
      </main>
    );
  }

  const { project } = data;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button onClick={() => router.push("/studio")} className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400">
        <ArrowLeft size={13} /> Back to Study Area selection
      </button>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Step 2 of 4</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Choose your Data Layers</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <MapPin size={14} /> {project.boundaryName} ({project.levelName}) · {Number(project.areaKm2).toLocaleString()} km²
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Copernicus 30m DEM & OSM Live Data: Active</span>
            <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
              FREE
            </span>
          </div>

          <button
            onClick={() => setIsGeeModalOpen(true)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
              geeData?.status?.isConnected
                ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {geeData?.status?.isConnected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>GEE Satellite Feed Active</span>
                <span className="text-[10px] opacity-75">({geeData.status.email?.split("@")[0]})</span>
              </>
            ) : (
              <>
                <Globe2 size={14} className="text-amber-600" />
                <span>Connect Google Earth Engine</span>
                <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  Optional
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1-Click Research Workflow Presets */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              1-Click Geospatial Research Presets
            </h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              One-click Bundle
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Select All Layers
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <RotateCcw size={11} /> Clear
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RESEARCH_PRESETS.map((preset) => {
            const isApplied = activePreset === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  isApplied
                    ? "border-emerald-500 bg-emerald-50/70 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/30"
                    : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{preset.icon}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isApplied
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                    {preset.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                  <span className="text-[10px] font-medium text-slate-400">
                    {preset.layers.length} layers · {preset.recommendedResolution}m
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold ${
                      isApplied ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 group-hover:text-emerald-600"
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check size={12} /> Applied
                      </>
                    ) : (
                      "Apply"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-500/5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
              <Sparkles size={16} /> AI Layer Assistant
            </div>
            <p className="mb-3 text-xs text-emerald-800/80 dark:text-emerald-400/80">
              Describe what you&apos;re analyzing (e.g. &quot;flood risk in a river delta&quot;, &quot;urban expansion&quot;, &quot;agriculture&quot;) and get a
              tailored layer recommendation.
            </p>
            <div className="flex gap-2">
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAssistant()}
                placeholder="e.g. flood risk assessment"
                className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-emerald-900 dark:bg-slate-900 dark:text-white"
              />
              <button
                onClick={askAssistant}
                disabled={suggesting}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {suggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Suggest
              </button>
            </div>
            {suggestion && (
              <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <p className="mb-1.5 font-semibold text-slate-800 dark:text-slate-100">Recommended: {suggestion.recommendedLayers.join(", ")}</p>
                <p className="leading-relaxed text-slate-500 dark:text-slate-400">{suggestion.reasoning}</p>
                <button onClick={applySuggestion} className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Apply this selection
                </button>
              </div>
            )}
          </div>

          {[...grouped.entries()].map(([category, layers]) => (
            <div key={category} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-white">{category}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {layers.map((l) => (
                  <label
                    key={l.key}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition ${
                      selected.has(l.key)
                        ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-500/10"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(l.key)} onChange={() => toggle(l.key)} className="mt-0.5 accent-emerald-600" />
                    <span>
                      <span className="block font-semibold text-slate-800 dark:text-slate-100">{l.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{l.description}</span>
                      <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {l.unit}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <DynamicStudyAreaMap geometry={project.geometry} bbox={project.bbox} className="h-64 w-full" />
          </div>

          {/* Satellite Observation Window Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white">
                <Calendar size={15} className="text-emerald-600 dark:text-emerald-400" />
                Satellite Window
              </h3>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Sentinel-2 & DEM
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Quick Seasonal Presets */}
            <div className="mt-2.5 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setMonth(start.getMonth() - 3);
                  setStartDate(start.toISOString().split("T")[0]);
                  setEndDate(end.toISOString().split("T")[0]);
                }}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Last 3M
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate("2024-11-01");
                  setEndDate("2025-02-28");
                }}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Dry (Nov-Feb)
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate("2024-06-01");
                  setEndDate("2024-09-30");
                }}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Monsoon
              </button>
            </div>

            {/* Cloud Cover Slider */}
            <div className="mt-3.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                  <Cloud size={13} className="text-sky-500" /> Max Cloud Cover
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">&lt; {maxCloudCover}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={maxCloudCover}
                onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white">
              <Ruler size={15} /> Output Resolution
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    resolution === r
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Finer resolution over very large areas is automatically capped to keep processing fast — the actual pixel size used is
              shown after generation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              <b className="text-slate-700 dark:text-slate-200">{selected.size}</b> layer{selected.size !== 1 ? "s" : ""} selected
            </p>
            {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}
            <button
              onClick={generate}
              disabled={starting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Generate Layers
            </button>
          </div>
        </div>
      </div>

      <GeeSettingsModal
        isOpen={isGeeModalOpen}
        onClose={() => setIsGeeModalOpen(false)}
        onSuccess={() => refetchGee()}
        currentStatus={geeData?.status}
      />
    </main>
  );
}
