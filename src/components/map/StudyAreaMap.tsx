"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { Maximize2, Minimize2, Layers, Crosshair, Mountain, Trash2, Loader2 } from "lucide-react";
import ElevationProfileModal from "@/components/analysis/ElevationProfileModal";
import type { ProfilePoint, ProfileStats } from "@/app/api/geo/elevation-profile/route";

export type BasemapType = "satellite" | "positron" | "dark" | "topo" | "osm";

export const BASEMAP_CONFIGS: Record<
  BasemapType,
  { name: string; url: string; attribution: string; maxZoom: number; icon: string }
> = {
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
    icon: "🛰️",
  },
  positron: {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap & CARTO",
    maxZoom: 20,
    icon: "☀️",
  },
  dark: {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap & CARTO",
    maxZoom: 20,
    icon: "🌙",
  },
  topo: {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap & OpenTopoMap",
    maxZoom: 17,
    icon: "⛰️",
  },
  osm: {
    name: "Street (OSM)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
    icon: "🗺️",
  },
};

export interface MapLayerOverlay {
  key: string;
  bounds: [[number, number], [number, number]]; // [[south,west],[north,east]]
  url: string;
  opacity: number;
}

interface Props {
  geometry?: GeoJSON.Geometry | null;
  parentGeometry?: GeoJSON.Geometry | null;
  bbox?: [number, number, number, number] | null;
  overlays?: MapLayerOverlay[];
  swipeOverlay?: MapLayerOverlay | null;
  swipePosition?: number; // 0-100
  className?: string;
  showAttribution?: boolean;
  defaultBasemap?: BasemapType;
  onMapClick?: (info: { lat: number; lng: number }) => void;
  enableElevationTool?: boolean;
}

export default function StudyAreaMap({
  geometry,
  parentGeometry,
  bbox,
  overlays = [],
  swipeOverlay,
  swipePosition = 50,
  className = "h-[420px] w-full",
  showAttribution = true,
  defaultBasemap = "osm",
  onMapClick,
  enableElevationTool = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const parentLayerRef = useRef<L.GeoJSON | null>(null);
  const overlayLayersRef = useRef<Map<string, L.ImageOverlay>>(new Map());
  const swipeLayersRef = useRef<{ left?: L.ImageOverlay; right?: L.ImageOverlay }>({});
  const swipeContainerRef = useRef<HTMLDivElement | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const inspectMarkerRef = useRef<L.CircleMarker | null>(null);

  // Elevation Profile Transect Refs
  const isDrawingTransectRef = useRef<boolean>(false);
  const transectCoordsRef = useRef<[number, number][]>([]);
  const transectMarkersRef = useRef<L.CircleMarker[]>([]);
  const transectLineRef = useRef<L.Polyline | null>(null);
  const transectHoverMarkerRef = useRef<L.CircleMarker | null>(null);

  const [activeBasemap, setActiveBasemap] = useState<BasemapType>(defaultBasemap);
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Elevation Profile State
  const [isDrawingTransect, setIsDrawingTransect] = useState(false);
  const [drawingStep, setDrawingStep] = useState<0 | 1>(0);
  const [transectLoading, setTransectLoading] = useState(false);
  const [profileData, setProfileData] = useState<{ points: ProfilePoint[]; stats: ProfileStats } | null>(null);
  const [isElevationModalOpen, setIsElevationModalOpen] = useState(false);

  // Fetch Elevation Profile from API
  const fetchElevationProfile = useCallback(async (coords: [number, number][]) => {
    setTransectLoading(true);
    try {
      const res = await fetch("/api/geo/elevation-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coords, samples: 60 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to calculate elevation profile");
      }
      const data = await res.json();
      setProfileData({ points: data.points, stats: data.stats });
      setIsElevationModalOpen(true);
    } catch (err) {
      console.error("Elevation profile error:", err);
      alert((err as Error).message || "Error fetching elevation profile");
    } finally {
      setTransectLoading(false);
    }
  }, []);

  // Clear transect drawing
  const handleClearTransect = useCallback(() => {
    if (transectLineRef.current) {
      transectLineRef.current.remove();
      transectLineRef.current = null;
    }
    transectMarkersRef.current.forEach((m) => m.remove());
    transectMarkersRef.current = [];
    if (transectHoverMarkerRef.current) {
      transectHoverMarkerRef.current.remove();
      transectHoverMarkerRef.current = null;
    }
    transectCoordsRef.current = [];
    isDrawingTransectRef.current = false;
    setIsDrawingTransect(false);
    setDrawingStep(0);
    setProfileData(null);
    setIsElevationModalOpen(false);
  }, []);

  // Toggle Transect Drawing Tool
  const toggleTransectTool = useCallback(() => {
    if (isDrawingTransectRef.current) {
      // cancel
      handleClearTransect();
    } else {
      handleClearTransect();
      isDrawingTransectRef.current = true;
      setIsDrawingTransect(true);
      setDrawingStep(0);
    }
  }, [handleClearTransect]);

  // Hover point marker along transect line
  const handleHoverPoint = useCallback((pt: ProfilePoint | null) => {
    const map = mapRef.current;
    if (!map) return;
    if (!pt) {
      if (transectHoverMarkerRef.current) {
        transectHoverMarkerRef.current.remove();
        transectHoverMarkerRef.current = null;
      }
      return;
    }
    if (!transectHoverMarkerRef.current) {
      transectHoverMarkerRef.current = L.circleMarker([pt.lat, pt.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#ef4444",
        fillOpacity: 1,
      }).addTo(map);
    } else {
      transectHoverMarkerRef.current.setLatLng([pt.lat, pt.lng]);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: showAttribution,
    }).setView([23.685, 90.3563], 6);

    const cfg = BASEMAP_CONFIGS[activeBasemap] || BASEMAP_CONFIGS.osm;
    const tileLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution,
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Handle map click
    map.on("click", (e: L.LeafletMouseEvent) => {
      // If transect tool is active, capture points
      if (isDrawingTransectRef.current) {
        const { lat, lng } = e.latlng;
        if (transectMarkersRef.current.length === 0) {
          // Point A
          const markerA = L.circleMarker(e.latlng, {
            radius: 7,
            color: "#b45309",
            weight: 3,
            fillColor: "#f59e0b",
            fillOpacity: 1,
          }).addTo(map);
          markerA.bindTooltip("A (Start)", { permanent: true, direction: "top", offset: [0, -10] });
          transectMarkersRef.current.push(markerA);
          transectCoordsRef.current = [[lng, lat]];
          setDrawingStep(1);
        } else if (transectMarkersRef.current.length === 1) {
          // Point B
          const markerB = L.circleMarker(e.latlng, {
            radius: 7,
            color: "#b45309",
            weight: 3,
            fillColor: "#f59e0b",
            fillOpacity: 1,
          }).addTo(map);
          markerB.bindTooltip("B (End)", { permanent: true, direction: "top", offset: [0, -10] });
          transectMarkersRef.current.push(markerB);

          const coords: [number, number][] = [transectCoordsRef.current[0], [lng, lat]];
          transectCoordsRef.current = coords;

          // Draw connecting transect line
          const polyline = L.polyline(
            [
              [coords[0][1], coords[0][0]],
              [coords[1][1], coords[1][0]],
            ],
            {
              color: "#d97706",
              weight: 4,
              dashArray: "6, 6",
              opacity: 0.95,
            }
          ).addTo(map);
          transectLineRef.current = polyline;

          // Finish drawing and trigger profile API
          isDrawingTransectRef.current = false;
          setIsDrawingTransect(false);
          setDrawingStep(0);
          fetchElevationProfile(coords);
        }
        return;
      }

      // Regular Map Click Inspection
      const { lat, lng } = e.latlng;
      if (onMapClick) {
        onMapClick({ lat, lng });
      }

      if (inspectMarkerRef.current) {
        inspectMarkerRef.current.setLatLng(e.latlng);
      } else {
        inspectMarkerRef.current = L.circleMarker(e.latlng, {
          radius: 7,
          color: "#059669",
          weight: 2,
          fillColor: "#34d399",
          fillOpacity: 0.9,
        }).addTo(map);
      }

      inspectMarkerRef.current
        .bindPopup(
          `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.4;min-width:140px;">
            <div style="font-weight:700;color:#059669;margin-bottom:2px;">📍 Sample Point</div>
            <div><b>Lat:</b> ${lat.toFixed(5)}°</div>
            <div><b>Lng:</b> ${lng.toFixed(5)}°</div>
          </div>`,
          { closeButton: false }
        )
        .openPopup();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
      currentTileLayerRef.current = null;
    }

    const cfg = BASEMAP_CONFIGS[activeBasemap] || BASEMAP_CONFIGS.osm;
    const newLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution,
    }).addTo(map);

    // Keep basemap at the back behind overlays
    newLayer.bringToBack();
    currentTileLayerRef.current = newLayer;
  }, [activeBasemap]);

  // Recenter map function
  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (boundaryLayerRef.current) {
      try {
        map.fitBounds(boundaryLayerRef.current.getBounds(), { padding: [30, 30], maxZoom: 15 });
      } catch {
        // ignore
      }
    } else if (bbox) {
      map.fitBounds(
        [
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ],
        { padding: [30, 30] }
      );
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 120);
  };

  // Exit fullscreen or cancel transect on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDrawingTransectRef.current) {
          handleClearTransect();
        } else if (isFullscreen) {
          setIsFullscreen(false);
          setTimeout(() => {
            mapRef.current?.invalidateSize();
          }, 120);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, handleClearTransect]);

  // Parent context boundary (light outline)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (parentLayerRef.current) {
      parentLayerRef.current.remove();
      parentLayerRef.current = null;
    }
    if (parentGeometry) {
      const layer = L.geoJSON(parentGeometry as GeoJSON.GeoJsonObject, {
        style: { color: "#64748b", weight: 1.5, dashArray: "4 4", fillOpacity: 0.02 },
      }).addTo(map);
      parentLayerRef.current = layer;
    }
  }, [parentGeometry]);

  // Main selected boundary highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.remove();
      boundaryLayerRef.current = null;
    }
    if (geometry) {
      const layer = L.geoJSON(geometry as GeoJSON.GeoJsonObject, {
        style: { color: "#059669", weight: 2.5, fillColor: "#10b981", fillOpacity: 0.15 },
      }).addTo(map);
      boundaryLayerRef.current = layer;
      try {
        map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 15 });
      } catch {
        // ignore invalid bounds
      }
    } else if (bbox) {
      map.fitBounds(
        [
          [bbox[1], bbox[0]],
          [bbox[3], bbox[2]],
        ],
        { padding: [30, 30] }
      );
    }
  }, [geometry, bbox]);

  // Raster preview overlays (non-swipe mode)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentKeys = new Set(overlays.map((o) => o.key));
    for (const [key, layer] of overlayLayersRef.current.entries()) {
      if (!currentKeys.has(key)) {
        layer.remove();
        overlayLayersRef.current.delete(key);
      }
    }
    for (const overlay of overlays) {
      const existing = overlayLayersRef.current.get(overlay.key);
      if (existing) {
        existing.setOpacity(overlay.opacity);
      } else {
        const layer = L.imageOverlay(overlay.url, overlay.bounds, { opacity: overlay.opacity }).addTo(map);
        overlayLayersRef.current.set(overlay.key, layer);
      }
    }
  }, [overlays]);

  // Swipe comparison mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (swipeLayersRef.current.left) {
      swipeLayersRef.current.left.remove();
      swipeLayersRef.current.left = undefined;
    }
    if (swipeLayersRef.current.right) {
      swipeLayersRef.current.right.remove();
      swipeLayersRef.current.right = undefined;
    }

    if (!swipeOverlay) return;

    const layer = L.imageOverlay(swipeOverlay.url, swipeOverlay.bounds, { opacity: 1 }).addTo(map);
    swipeLayersRef.current.left = layer;

    const el = layer.getElement();
    if (el && swipeContainerRef.current) {
      el.style.clipPath = `inset(0 ${100 - swipePosition}% 0 0)`;
    }
  }, [swipeOverlay, swipePosition]);

  useEffect(() => {
    const layer = swipeLayersRef.current.left;
    const el = layer?.getElement();
    if (el) el.style.clipPath = `inset(0 ${100 - swipePosition}% 0 0)`;
  }, [swipePosition]);

  return (
    <div
      ref={swipeContainerRef}
      className={`relative ${
        isFullscreen
          ? "fixed inset-0 z-[99999] h-screen w-screen rounded-none bg-slate-950"
          : `overflow-hidden rounded-2xl ${className}`
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Drawing Instruction Pill */}
      {isDrawingTransect && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-500/95 px-4 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md animate-pulse">
          <Mountain size={14} />
          <span>
            {drawingStep === 0
              ? "📍 Step 1/2: Click starting point on map (Esc to cancel)"
              : "📍 Step 2/2: Click end point to calculate elevation profile"}
          </span>
          <button
            onClick={handleClearTransect}
            className="ml-1 rounded-full bg-white/20 p-0.5 hover:bg-white/40 text-white"
            title="Cancel"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Map Utility Bar */}
      <div className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        {/* Elevation Profile Transect Tool */}
        {enableElevationTool && (
          <div className="flex items-center gap-1">
            {!profileData ? (
              <button
                onClick={toggleTransectTool}
                title={
                  isDrawingTransect
                    ? "Click 2 points on map (Esc to cancel)"
                    : "Draw Elevation Cross-Section Transect"
                }
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                  isDrawingTransect
                    ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {transectLoading ? (
                  <Loader2 size={14} className="animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Mountain size={15} className={isDrawingTransect ? "text-white" : "text-amber-600 dark:text-amber-400"} />
                )}
                <span className="hidden sm:inline">
                  {transectLoading
                    ? "Sampling DEM..."
                    : isDrawingTransect
                    ? drawingStep === 0
                      ? "Click Point A..."
                      : "Click Point B..."
                    : "Elevation Profile"}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsElevationModalOpen(true)}
                  title="View Elevation Cross-Section Chart"
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
                >
                  <Mountain size={14} />
                  <span className="hidden sm:inline">Elevation Profile</span>
                  <span className="rounded bg-amber-600/70 px-1.5 py-0.5 text-[10px]">
                    {profileData.stats.totalDistanceKm.toFixed(1)} km
                  </span>
                </button>
                <button
                  onClick={handleClearTransect}
                  title="Clear Transect Line"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          title="Recenter to Study Area (BBox)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Crosshair size={16} />
        </button>

        {/* Basemap Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowBasemapMenu(!showBasemapMenu)}
            title="Change Basemap"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              showBasemapMenu
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>{BASEMAP_CONFIGS[activeBasemap]?.icon}</span>
            <span className="hidden sm:inline">{BASEMAP_CONFIGS[activeBasemap]?.name}</span>
            <Layers size={13} className="opacity-70" />
          </button>

          {/* Basemap Dropdown Popover */}
          {showBasemapMenu && (
            <div className="absolute right-0 top-10 z-[1010] min-w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Select Basemap
              </p>
              {(Object.keys(BASEMAP_CONFIGS) as BasemapType[]).map((key) => {
                const cfg = BASEMAP_CONFIGS[key];
                const isActive = activeBasemap === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveBasemap(key);
                      setShowBasemapMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-base">{cfg.icon}</span>
                    <span className="flex-1">{cfg.name}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Map Fullscreen"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Elevation Profile Modal */}
      {profileData && (
        <ElevationProfileModal
          isOpen={isElevationModalOpen}
          onClose={() => setIsElevationModalOpen(false)}
          points={profileData.points}
          stats={profileData.stats}
          onHoverPoint={handleHoverPoint}
        />
      )}
    </div>
  );
}
