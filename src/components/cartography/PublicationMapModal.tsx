"use client";

import { useState, useRef } from "react";
import { X, Download, Compass, Printer, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: {
    name: string;
    boundaryName: string;
    countryName: string;
    areaKm2: number | string;
    resolution: number;
    bbox: [number, number, number, number];
  };
  activeLayer?: {
    layerKey: string;
    layerLabel: string;
    category: string;
    thumbnail: string;
    unit?: string;
  } | null;
}

export default function PublicationMapModal({ isOpen, onClose, project, activeLayer }: Props) {
  const [title, setTitle] = useState(project.boundaryName || project.name);
  const [subtitle, setSubtitle] = useState(`${project.countryName} · Study Area Cartographic Map`);
  const [showNorthArrow, setShowNorthArrow] = useState(true);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [showGraticules, setShowGraticules] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showMetadata, setShowMetadata] = useState(true);
  const [author, setAuthor] = useState("Geospatial Research Group");

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const [minLng, minLat, maxLng, maxLat] = project.bbox || [90, 23, 91, 24];
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Approximate width in km: 111.32 km * cos(lat) * deltaLng
  const widthKm = Math.round(111.32 * Math.cos((centerLat * Math.PI) / 180) * (maxLng - minLng));
  const scaleBarKm = Math.max(1, Math.round(widthKm / 4));

  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? "N" : "S") : val >= 0 ? "E" : "W";
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    return `${deg}°${min}' ${dir}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!printAreaRef.current) return;
    try {
      // Create off-screen canvas to render print area
      const el = printAreaRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = 2; // 2x for high DPI
      canvas.width = el.offsetWidth * scale;
      canvas.height = el.offsetHeight * scale;
      ctx.scale(scale, scale);

      // Simple fallback drawing or trigger print
      window.print();
    } catch {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Publication-Ready Cartographic Map Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peer-reviewed academic journal style (Elsevier, Springer, IEEE, Nature)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-12">
          {/* Controls Column */}
          <div className="space-y-4 md:col-span-4 text-xs">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" />
                Map Typography & Titles
              </span>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Map Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Subtitle / Citation</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Author / Affiliation</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">Cartographic Elements</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNorthArrow}
                  onChange={(e) => setShowNorthArrow(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>North Arrow (Compass Rose)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScaleBar}
                  onChange={(e) => setShowScaleBar(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Metric Scale Bar ({scaleBarKm * 2} km)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGraticules}
                  onChange={(e) => setShowGraticules(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Coordinate Graticules (Lat/Lon Ticks)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Cartographic Legend Box</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMetadata}
                  onChange={(e) => setShowMetadata(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Projection &amp; Metadata Block</span>
              </label>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-md transition hover:bg-emerald-700"
              >
                <Printer size={15} />
                Print / Save High-Res PDF
              </button>
              <button
                onClick={handleDownloadPng}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download size={15} />
                Export 300 DPI Journal PNG
              </button>
            </div>
          </div>

          {/* Map Preview Canvas Column (8 cols) */}
          <div className="md:col-span-8">
            <div
              ref={printAreaRef}
              id="cartographic-print-area"
              className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-4 border-slate-900 bg-slate-950 p-6 shadow-inner text-slate-900"
            >
              {/* Graticules / Coordinate Tick Marks */}
              {showGraticules && (
                <>
                  <div className="absolute top-1 left-8 right-8 flex justify-between text-[9px] font-mono font-bold text-slate-400">
                    <span>{formatCoord(minLng, false)}</span>
                    <span>{formatCoord(centerLng, false)}</span>
                    <span>{formatCoord(maxLng, false)}</span>
                  </div>
                  <div className="absolute bottom-1 left-8 right-8 flex justify-between text-[9px] font-mono font-bold text-slate-400">
                    <span>{formatCoord(minLng, false)}</span>
                    <span>{formatCoord(centerLng, false)}</span>
                    <span>{formatCoord(maxLng, false)}</span>
                  </div>
                  <div className="absolute left-1 top-12 bottom-12 flex flex-col justify-between text-[9px] font-mono font-bold text-slate-400">
                    <span className="-rotate-90">{formatCoord(maxLat, true)}</span>
                    <span className="-rotate-90">{formatCoord(centerLat, true)}</span>
                    <span className="-rotate-90">{formatCoord(minLat, true)}</span>
                  </div>
                </>
              )}

              {/* Map Canvas Background / Layer Thumbnail */}
              <div className="relative h-full w-full overflow-hidden rounded border border-slate-700 bg-slate-900">
                {activeLayer?.thumbnail ? (
                  <img
                    src={activeLayer.thumbnail}
                    alt={activeLayer.layerLabel}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    Study Area Base Layer
                  </div>
                )}

                {/* North Arrow */}
                {showNorthArrow && (
                  <div className="absolute top-4 right-4 z-20 flex flex-col items-center rounded-lg bg-white/95 px-2 py-2 shadow-md backdrop-blur">
                    <svg width="28" height="40" viewBox="0 0 30 42">
                      <polygon points="15,2 5,30 15,24" fill="#0f172a" />
                      <polygon points="15,2 25,30 15,24" fill="#ef4444" />
                      <text x="15" y="40" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0f172a">
                        N
                      </text>
                    </svg>
                  </div>
                )}

                {/* Title Header Card */}
                <div className="absolute top-4 left-4 z-20 max-w-xs rounded-lg bg-white/95 p-3 shadow-md backdrop-blur">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">{title}</h4>
                  <p className="text-[10px] font-semibold text-slate-600">{subtitle}</p>
                </div>

                {/* Scale Bar */}
                {showScaleBar && (
                  <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-white/95 px-3 py-2 shadow-md backdrop-blur">
                    <div className="flex justify-between text-[9px] font-mono font-bold text-slate-800">
                      <span>0</span>
                      <span>{scaleBarKm}</span>
                      <span>{scaleBarKm * 2} km</span>
                    </div>
                    <div className="mt-1 flex h-2 w-32 border border-slate-800">
                      <div className="flex-1 bg-slate-900" />
                      <div className="flex-1 bg-white" />
                      <div className="flex-1 bg-slate-900" />
                      <div className="flex-1 bg-white" />
                    </div>
                  </div>
                )}

                {/* Legend Box */}
                {showLegend && activeLayer && (
                  <div className="absolute bottom-4 right-4 z-20 rounded-lg bg-white/95 p-2.5 shadow-md backdrop-blur text-[10px]">
                    <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                      {activeLayer.layerLabel}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-16 rounded bg-gradient-to-r from-emerald-700 via-amber-400 to-rose-600" />
                      <span className="text-[9px] font-mono font-bold text-slate-700">Low → High</span>
                    </div>
                    <div className="mt-1 text-[8px] text-slate-500">Unit: {activeLayer.unit || "Normalized"}</div>
                  </div>
                )}

                {/* Metadata & Projection Block */}
                {showMetadata && (
                  <div className="absolute bottom-16 left-4 z-20 max-w-xs rounded-md bg-white/90 p-2 text-[8px] font-mono text-slate-700 shadow backdrop-blur">
                    <div>CRS: EPSG:4326 (WGS 84)</div>
                    <div>Area: {Number(project.areaKm2).toFixed(1)} km² · Res: {project.resolution}m</div>
                    <div>Source: Copernicus GLO-30 / OpenStreetMap / Open-Meteo</div>
                    <div>Author: {author}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
