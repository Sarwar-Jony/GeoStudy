"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as turf from "@turf/turf";
import { ArrowRight, Globe2, MapPinned, UploadCloud, Info, Loader2, Search, Check, MapPin, Sparkles, X } from "lucide-react";
import Combobox from "@/components/ui/Combobox";
import DynamicStudyAreaMap from "@/components/map/DynamicStudyAreaMap";

interface CountryOption {
  iso3: string;
  name: string;
  region: string;
  flag: string;
  levelNames: string[];
}

interface BoundaryRow {
  id: string;
  countryIso3: string;
  level: number;
  levelName: string;
  externalId: string;
  parentId: string | null;
  name: string;
  geometry: GeoJSON.Geometry;
  bbox: [number, number, number, number];
  areaKm2: number;
  centroid: [number, number];
}

interface CustomBoundary {
  name: string;
  geometry: GeoJSON.Geometry;
  bbox: [number, number, number, number];
  areaKm2: number;
}

function useBoundaryLevel(country: string, level: number, parentId: string | null, enabled: boolean) {
  return useQuery<{ items?: BoundaryRow[]; levelName?: string; maxLevel: number; boundary?: BoundaryRow | null }>({
    queryKey: ["boundaries", country, level, parentId],
    queryFn: async () => {
      const params = new URLSearchParams({ country, level: String(level) });
      if (parentId) params.set("parentId", parentId);
      const res = await fetch(`/api/geo/boundaries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load boundaries");
      return res.json();
    },
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
  });
}

export default function StudioPage() {
  const router = useRouter();
  const [countryIso3, setCountryIso3] = useState("BGD");
  const [selectedPath, setSelectedPath] = useState<(BoundaryRow | null)[]>([]);
  const [mode, setMode] = useState<"search" | "hierarchy" | "upload">("search");
  const [customBoundary, setCustomBoundary] = useState<CustomBoundary | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");

  // Place Search (Geocoding) State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const { data: countriesData } = useQuery<{ countries: CountryOption[]; defaultCountry: string }>({
    queryKey: ["countries"],
    queryFn: async () => (await fetch("/api/geo/countries")).json(),
    staleTime: Infinity,
  });

  const country0 = useBoundaryLevel(countryIso3, 0, null, true);
  const maxLevel = country0.data?.maxLevel ?? 0;

  useEffect(() => {
    setSelectedPath([]);
  }, [countryIso3]);

  // Debounced search query for place search (Geocoding API)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}&country=${countryIso3}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.items || []);
        }
      } catch (err) {
        console.error("Geocoding search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, countryIso3]);

  const handleSelectPlace = (place: any) => {
    setSelectedPlaceId(place.id);
    setCustomBoundary({
      name: place.name,
      geometry: place.geometry,
      bbox: place.bbox,
      areaKm2: place.areaKm2,
    });
    setProjectName(place.name);
  };

  const levelQueries = [1, 2, 3, 4].map((lvl) => {
    const parent = lvl === 1 ? null : selectedPath[lvl - 2] ?? null;
    const enabled = lvl <= maxLevel && (lvl === 1 || Boolean(parent));
    return useBoundaryLevel(countryIso3, lvl, parent?.id ?? null, enabled);
  });

  const deepestSelected = [...selectedPath].reverse().find(Boolean) as BoundaryRow | undefined;
  const currentBoundary: BoundaryRow | undefined = deepestSelected;
  const country = countriesData?.countries.find((c) => c.iso3 === countryIso3);

  const isCustomMode = mode === "upload" || mode === "search";
  const activeGeometry =
    isCustomMode ? customBoundary?.geometry ?? null : currentBoundary?.geometry ?? country0.data?.boundary?.geometry ?? null;
  const activeBbox =
    isCustomMode ? customBoundary?.bbox ?? null : currentBoundary?.bbox ?? country0.data?.boundary?.bbox ?? null;
  const parentGeometry =
    mode === "hierarchy" && currentBoundary
      ? (selectedPath.length >= 2 ? selectedPath[selectedPath.length - 2]?.geometry : country0.data?.boundary?.geometry) ?? null
      : null;

  const areaKm2 = isCustomMode ? customBoundary?.areaKm2 : currentBoundary?.areaKm2 ?? country0.data?.boundary?.areaKm2;
  const displayName = isCustomMode ? customBoundary?.name : currentBoundary?.name ?? country0.data?.boundary?.name ?? country?.name;
  const displayLevelName =
    mode === "search"
      ? "Geocoded Area"
      : mode === "upload"
      ? "Custom Boundary"
      : currentBoundary?.levelName ?? "Country";

  const pathLabels = useMemo(() => {
    const labels: { level: number; levelName: string; name: string }[] = [];
    if (country) labels.push({ level: 0, levelName: "Country", name: country.name });
    selectedPath.forEach((b, i) => {
      if (b) labels.push({ level: i + 1, levelName: b.levelName, name: b.name });
    });
    return labels;
  }, [country, selectedPath]);

  function updateLevel(levelIdx: number, boundary: BoundaryRow | null) {
    setSelectedPath((prev) => {
      if (!boundary) {
        return prev.slice(0, levelIdx);
      }
      const next = prev.slice(0, levelIdx);
      next[levelIdx] = boundary;
      return next;
    });
  }

  const [bboxInput, setBboxInput] = useState({ south: "", west: "", north: "", east: "" });

  async function handleFileUpload(file: File) {
    setUploadError(null);
    try {
      let geojson: any;
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith(".zip")) {
        // ESRI Shapefile archive (.shp, .dbf, .prj inside zip)
        const shp = (await import("shpjs")).default;
        const arrayBuf = await file.arrayBuffer();
        geojson = await shp(arrayBuf);
      } else if (lowerName.endsWith(".kml")) {
        // Google Earth KML
        const { kml } = await import("@tmcw/togeojson");
        const text = await file.text();
        const dom = new DOMParser().parseFromString(text, "text/xml");
        geojson = kml(dom);
      } else {
        // GeoJSON or JSON
        const text = await file.text();
        geojson = JSON.parse(text);
      }

      let feature: GeoJSON.Feature | undefined;
      if (Array.isArray(geojson)) {
        geojson = geojson[0];
      }
      if (geojson && geojson.type === "FeatureCollection") {
        if (!geojson.features?.length) throw new Error("Empty FeatureCollection in file.");
        feature =
          geojson.features.find(
            (f: any) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
          ) || geojson.features[0];
      } else if (geojson && geojson.type === "Feature") {
        feature = geojson;
      } else if (geojson && (geojson.type === "Polygon" || geojson.type === "MultiPolygon")) {
        feature = turf.feature(geojson);
      } else {
        throw new Error("Unsupported format. Please provide a Polygon or MultiPolygon.");
      }

      if (!feature || !feature.geometry) {
        throw new Error("No valid polygon boundary geometry found in file.");
      }

      const bbox = turf.bbox(feature) as [number, number, number, number];
      const areaKm2 = turf.area(feature) / 1_000_000;
      setCustomBoundary({
        name: (feature.properties?.name as string) || file.name.replace(/\.[^.]+$/, ""),
        geometry: feature.geometry,
        bbox,
        areaKm2,
      });
    } catch (err) {
      setUploadError((err as Error).message || "Could not parse this file.");
    }
  }

  function handleApplyBbox() {
    setUploadError(null);
    const s = parseFloat(bboxInput.south);
    const w = parseFloat(bboxInput.west);
    const n = parseFloat(bboxInput.north);
    const e = parseFloat(bboxInput.east);
    if (isNaN(s) || isNaN(w) || isNaN(n) || isNaN(e)) {
      setUploadError("Please provide all 4 valid numeric coordinates (South, West, North, East).");
      return;
    }
    if (s >= n || w >= e) {
      setUploadError("Invalid coordinates: South must be < North and West must be < East.");
      return;
    }
    const bbox: [number, number, number, number] = [w, s, e, n];
    const poly = turf.bboxPolygon(bbox);
    const areaKm2 = turf.area(poly) / 1_000_000;
    setCustomBoundary({
      name: `AOI Box [${s.toFixed(2)}, ${w.toFixed(2)}]`,
      geometry: poly.geometry,
      bbox,
      areaKm2,
    });
  }

  async function confirmStudyArea() {
    setCreateError(null);
    if ((mode === "upload" || mode === "search") && !customBoundary) {
      setCreateError(mode === "search" ? "Search and select a location first." : "Upload a GeoJSON polygon first.");
      return;
    }
    if (mode === "hierarchy" && !activeGeometry) {
      setCreateError("Select at least the country boundary first.");
      return;
    }
    setCreating(true);
    try {
      const payload =
        mode === "upload" || mode === "search"
          ? {
              name: projectName || customBoundary!.name,
              countryIso3: countryIso3 || "XXX",
              countryName: country?.name || "Global Location",
              level: 99,
              levelName: mode === "search" ? "Geocoded Area" : "Custom Boundary",
              boundaryId: null,
              boundaryName: customBoundary!.name,
              pathLabels: [{ level: 99, levelName: mode === "search" ? "Geocoded Area" : "Custom Boundary", name: customBoundary!.name }],
              geometry: customBoundary!.geometry,
              bbox: customBoundary!.bbox,
              areaKm2: customBoundary!.areaKm2,
              isCustomGeometry: true,
            }
          : {
              name: projectName || displayName,
              countryIso3,
              countryName: country?.name,
              level: currentBoundary ? currentBoundary.level : 0,
              levelName: displayLevelName,
              boundaryId: currentBoundary ? currentBoundary.id : country0.data?.boundary?.id,
              boundaryName: displayName,
              pathLabels,
              geometry: activeGeometry,
              bbox: activeBbox,
              areaKm2: areaKm2 ?? 0,
              isCustomGeometry: false,
            };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      router.push(`/studio/${data.project.id}/layers`);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Step 1 of 4</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Select your Study Area</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Directly search any place or neighborhood, drill down through administrative levels, or upload custom boundaries.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setMode("search")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            mode === "search"
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Search size={15} /> Direct Place Search (Geocoding)
        </button>
        <button
          onClick={() => setMode("hierarchy")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            mode === "hierarchy"
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <MapPinned size={15} /> Hierarchical Selection
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
            mode === "upload"
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <UploadCloud size={15} /> Upload Custom Boundary
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          {mode === "search" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Search size={13} className="text-emerald-600 dark:text-emerald-400" /> Search Place or Address
                  </span>
                  <span className="text-[10px] text-slate-400">Mapbox / OSM / Google Geocoding</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Dhanmondi, Dhaka, Sylhet, Saint Martin..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2.5 pl-3.5 pr-9 text-xs outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-emerald-500"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Quick suggestions pills */}
              <div>
                <span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Sparkles size={11} className="text-amber-500" /> Popular Quick Searches:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["Dhanmondi, Dhaka", "Gulshan, Dhaka", "Cox's Bazar", "Sundarbans", "Sylhet Sadar", "Chittagong", "Saint Martin"].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchQuery(tag)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Live search state / results list */}
              <div className="space-y-2">
                {isSearching && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <Loader2 size={15} className="animate-spin text-emerald-600" />
                    <span>Searching boundaries and geocoded places...</span>
                  </div>
                )}

                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                    No matching location found. Try adding a city name (e.g. &quot;Dhanmondi, Dhaka&quot;) or use Hierarchical selection.
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Found {searchResults.length} places
                    </p>
                    {searchResults.map((item) => {
                      const isSelected = selectedPlaceId === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectPlace(item)}
                          className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left text-xs transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/60"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <MapPin
                            size={16}
                            className={`mt-0.5 shrink-0 ${
                              isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold truncate ${
                                  isSelected
                                    ? "text-emerald-950 dark:text-emerald-200"
                                    : "text-slate-800 dark:text-slate-100"
                                }`}
                              >
                                {item.name}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {item.areaKm2} km²
                              </span>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                {item.source}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {item.displayName}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : mode === "hierarchy" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Globe2 size={13} /> Country
                </label>
                <Combobox
                  options={(countriesData?.countries || []).map((c) => ({ value: c.iso3, label: `${c.flag} ${c.name}`, sublabel: c.region }))}
                  value={countryIso3}
                  onChange={(v) => v && setCountryIso3(v)}
                  placeholder="Select a country"
                />
              </div>

              {[0, 1, 2, 3].map((idx) => {
                const level = idx + 1;
                const label = country?.levelNames[idx] || `Level ${level}`;
                const q = levelQueries[idx];
                const parent = idx === 0 ? true : Boolean(selectedPath[idx - 1]);
                const disabled = level > maxLevel || !parent;
                return (
                  <div key={level}>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {label} {level > maxLevel && <span className="font-normal text-slate-400">(not available)</span>}
                    </label>
                    <Combobox
                      options={(q?.data?.items || []).map((b) => ({ value: b.id, label: b.name }))}
                      value={selectedPath[idx]?.id ?? null}
                      disabled={disabled}
                      loading={q?.isLoading}
                      onChange={(id) => {
                        const found = q?.data?.items?.find((b) => b.id === id) ?? null;
                        updateLevel(idx, found);
                      }}
                      placeholder={disabled ? "Select the level above first" : `Choose ${label.toLowerCase()}`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400">
                <UploadCloud size={28} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Upload Shapefile (.zip), KML (.kml) or GeoJSON
                </span>
                <span className="text-[11px] text-slate-400">
                  Supports zipped ESRI Shapefiles (.shp/.dbf/.prj), Google Earth KML, or GeoJSON
                </span>
                <input
                  type="file"
                  accept=".zip,.kml,.geojson,.json,application/zip,application/vnd.google-earth.kml+xml,application/geo+json,application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </label>

              {uploadError && <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg dark:bg-red-950/40">{uploadError}</p>}
              {customBoundary && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  ✓ Loaded &quot;{customBoundary.name}&quot; ({customBoundary.areaKm2.toFixed(2)} km²)
                </div>
              )}

              {/* Manual Coordinates Option */}
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Or Define Study Area by Bounding Box (Lat/Lon)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400">South (Min Lat)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 23.60"
                      value={bboxInput.south}
                      onChange={(e) => setBboxInput({ ...bboxInput, south: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">North (Max Lat)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 23.90"
                      value={bboxInput.north}
                      onChange={(e) => setBboxInput({ ...bboxInput, north: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">West (Min Lon)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 90.25"
                      value={bboxInput.west}
                      onChange={(e) => setBboxInput({ ...bboxInput, west: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">East (Max Lon)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 90.55"
                      value={bboxInput.east}
                      onChange={(e) => setBboxInput({ ...bboxInput, east: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyBbox}
                  className="mt-2.5 w-full rounded-lg bg-slate-800 py-1.5 text-xs font-bold text-white hover:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  Create AOI from Coordinates
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Study Area</h3>
            {displayName ? (
              <>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{displayLevelName}</p>
                {pathLabels.length > 0 && mode === "hierarchy" && (
                  <p className="mt-1 text-xs text-slate-400">{pathLabels.map((p) => p.name).join(" › ")}</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800">
                    <p className="text-slate-400">Area</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{(areaKm2 ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} km²</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800">
                    <p className="text-slate-400">BBox</p>
                    <p className="truncate font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-100">
                      {activeBbox?.map((n: number) => n.toFixed(2)).join(", ")}
                    </p>
                  </div>
                </div>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={`Project name (default: ${displayName})`}
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {createError && <p className="mt-2 text-xs font-medium text-red-600">{createError}</p>}
                <button
                  onClick={confirmStudyArea}
                  disabled={creating}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Confirm Study Area &amp; Continue
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400">Pick a country to get started, or upload a custom boundary.</p>
            )}
          </div>
        </div>

        <div className="min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
          <DynamicStudyAreaMap geometry={activeGeometry} parentGeometry={parentGeometry} bbox={activeBbox} className="h-full min-h-[500px] w-full" />
        </div>
      </div>
    </main>
  );
}
