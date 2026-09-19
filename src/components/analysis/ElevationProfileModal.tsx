"use client";

import React, { useState } from "react";
import { Mountain, X, Download, TrendingUp, Compass, Copy, Check, BarChart2 } from "lucide-react";
import { ProfilePoint, ProfileStats } from "@/app/api/geo/elevation-profile/route";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  points: ProfilePoint[];
  stats: ProfileStats;
  onHoverPoint?: (point: ProfilePoint | null) => void;
}

export default function ElevationProfileModal({
  isOpen,
  onClose,
  points,
  stats,
  onHoverPoint,
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<ProfilePoint | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || points.length === 0) return null;

  // Chart dimensions & scaling
  const width = 760;
  const height = 280;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const minElev = Math.max(0, Math.floor(stats.minElevationM - 5));
  const maxElev = Math.ceil(stats.maxElevationM + 5);
  const elevRange = Math.max(maxElev - minElev, 10);
  const maxDist = Math.max(stats.totalDistanceKm, 0.1);

  // SVG coordinate projection
  const getX = (distKm: number) => padLeft + (distKm / maxDist) * chartW;
  const getY = (elevM: number) => padTop + chartH - ((elevM - minElev) / elevRange) * chartH;

  // Build path
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.distanceKm)} ${getY(p.elevationM)}`)
    .join(" ");

  const areaD = `${pathD} L ${getX(points[points.length - 1].distanceKm)} ${padTop + chartH} L ${getX(points[0].distanceKm)} ${padTop + chartH} Z`;

  // Download CSV
  const handleDownloadCsv = () => {
    const header = "Index,Distance_km,Elevation_m,Slope_percent,Latitude,Longitude\n";
    const rows = points
      .map(
        (p) =>
          `${p.index},${p.distanceKm},${p.elevationM},${p.slopePercent},${p.lat},${p.lng}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elevation-profile-${stats.totalDistanceKm}km.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Markdown / LaTeX table
  const handleCopyMarkdown = () => {
    const md = `### Elevation Profile Summary (Transect Line)
- **Total Length:** ${stats.totalDistanceKm} km
- **Elevation Range:** ${stats.minElevationM} m to ${stats.maxElevationM} m (Δ ${(stats.maxElevationM - stats.minElevationM).toFixed(1)} m)
- **Total Elevation Gain:** +${stats.elevationGainM} m | **Loss:** -${stats.elevationLossM} m
- **Average Slope:** ${stats.avgSlopePercent}% | **Max Slope:** ${stats.maxSlopePercent}%

| Distance (km) | Elevation (m) | Slope (%) | Coordinates (Lat, Lng) |
| :--- | :--- | :--- | :--- |
${points
  .filter((_, idx) => idx % Math.ceil(points.length / 12) === 0)
  .map((p) => `| ${p.distanceKm} | ${p.elevationM} | ${p.slopePercent}% | ${p.lat}, ${p.lng} |`)
  .join("\n")}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] max-w-4xl w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Mountain size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Topographic Elevation Cross-Section Profile
              </h3>
              <span className="text-xs text-slate-400">
                Open-Elevation &amp; Copernicus 90m DEM · {points.length} Sample Points
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Distance</span>
              <div className="text-lg font-extrabold text-white">{stats.totalDistanceKm} <span className="text-xs font-normal text-slate-400">km</span></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peak Elevation</span>
              <div className="text-lg font-extrabold text-amber-400">{stats.maxElevationM} <span className="text-xs font-normal text-slate-400">m</span></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lowest Point</span>
              <div className="text-lg font-extrabold text-sky-400">{stats.minElevationM} <span className="text-xs font-normal text-slate-400">m</span></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Elevation Gain</span>
              <div className="text-lg font-extrabold text-emerald-400">+{stats.elevationGainM} <span className="text-xs font-normal text-slate-400">m</span></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Slope</span>
              <div className="text-lg font-extrabold text-indigo-300">{stats.avgSlopePercent}%</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Slope</span>
              <div className="text-lg font-extrabold text-rose-400">{stats.maxSlopePercent}%</div>
            </div>
          </div>

          {/* Interactive SVG Elevation Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-inner relative select-none">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <BarChart2 size={14} className="text-emerald-400" />
                <span className="font-semibold text-slate-200">Elevation Profile Curve (Distance vs. Altitude)</span>
              </div>
              {hoveredPoint && (
                <div className="flex items-center gap-3 font-mono text-[11px] text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <span>Dist: {hoveredPoint.distanceKm} km</span>
                  <span>Elev: {hoveredPoint.elevationM} m</span>
                  <span>Slope: {hoveredPoint.slopePercent}%</span>
                  <span>({hoveredPoint.lat.toFixed(4)}°, {hoveredPoint.lng.toFixed(4)}°)</span>
                </div>
              )}
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  onHoverPoint?.(null);
                }}
              >
                <defs>
                  <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                    <stop offset="60%" stopColor="#0284c7" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const val = Math.round(minElev + frac * elevRange);
                  const y = getY(val);
                  return (
                    <g key={frac}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={width - padRight}
                        y2={y}
                        stroke="#334155"
                        strokeWidth="0.8"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="monospace"
                      >
                        {val}m
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const dist = Math.round(frac * maxDist * 10) / 10;
                  const x = getX(dist);
                  return (
                    <g key={frac}>
                      <line
                        x1={x}
                        y1={padTop}
                        x2={x}
                        y2={padTop + chartH}
                        stroke="#334155"
                        strokeWidth="0.8"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={x}
                        y={padTop + chartH + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="monospace"
                      >
                        {dist} km
                      </text>
                    </g>
                  );
                })}

                {/* Elevation Area & Line */}
                <path d={areaD} fill="url(#elev-grad)" />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points on Hover */}
                {points.map((p) => {
                  const cx = getX(p.distanceKm);
                  const cy = getY(p.elevationM);
                  const isHovered = hoveredPoint?.index === p.index;
                  return (
                    <circle
                      key={p.index}
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 2}
                      fill={isHovered ? "#38bdf8" : "#10b981"}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2 : 0.5}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => {
                        setHoveredPoint(p);
                        onHoverPoint?.(p);
                      }}
                    />
                  );
                })}

                {/* Hover vertical guideline */}
                {hoveredPoint && (
                  <line
                    x1={getX(hoveredPoint.distanceKm)}
                    y1={padTop}
                    x2={getX(hoveredPoint.distanceKm)}
                    y2={padTop + chartH}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3.5 gap-3">
          <div className="text-xs text-slate-400">
            Hover along the elevation curve to inspect specific coordinates and slope gradients.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? "Copied Table!" : "Copy Markdown"}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition"
            >
              <Download size={14} />
              Export CSV Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
