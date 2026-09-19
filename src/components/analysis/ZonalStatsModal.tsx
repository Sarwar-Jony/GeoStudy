"use client";

import { useMemo } from "react";
import { X, PieChart, BarChart3, Mountain, Activity, Download } from "lucide-react";
import { computeZonalAnalysis, type ZonalAnalysisReport } from "@/lib/raster/zonalStats";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  layers: any[];
}

export default function ZonalStatsModal({ isOpen, onClose, project, layers }: Props) {
  const report: ZonalAnalysisReport = useMemo(() => {
    return computeZonalAnalysis(project, layers);
  }, [project, layers]);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    window.location.href = `/api/projects/${project.id}/stats/csv`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <PieChart size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Zonal Statistics &amp; Landscape Metrics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spatial area composition, terrain distribution &amp; exposure indices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-900 dark:text-white">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-semibold text-slate-500">Total Study Area</div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {report.totalAreaKm2.toFixed(2)} <span className="text-xs font-medium">km²</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-semibold text-slate-500">Mean Elevation</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {report.terrainMetrics.elevation.mean} <span className="text-xs font-medium">m</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-semibold text-slate-500">Mean Slope</div>
              <div className="text-lg font-black text-amber-600">
                {report.terrainMetrics.slope.meanSlopeDeg}°
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-semibold text-slate-500">Road Density</div>
              <div className="text-lg font-black text-sky-600">
                {report.infrastructureMetrics.roadDensityKmPerKm2} <span className="text-xs font-medium">km/km²</span>
              </div>
            </div>
          </div>

          {/* Section 1: LULC Area Breakdown */}
          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <BarChart3 size={16} className="text-emerald-600" />
                Land Use &amp; Land Cover (LULC) Composition
              </h4>
              <span className="text-xs text-slate-500">ESA WorldCover 10m Standard</span>
            </div>

            {/* Composite Stacked Bar */}
            <div className="mb-4 flex h-6 w-full overflow-hidden rounded-lg shadow-inner">
              {report.lulcBreakdown.map((item) => (
                <div
                  key={item.value}
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  title={`${item.label}: ${item.percentage}% (${item.areaKm2} km²)`}
                  className="h-full transition-all hover:opacity-90"
                />
              ))}
            </div>

            {/* Class Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800 font-semibold">
                    <th className="pb-2">Class Name</th>
                    <th className="pb-2 text-right">Area (km²)</th>
                    <th className="pb-2 text-right">Percentage (%)</th>
                    <th className="pb-2 w-32 pl-4">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.lulcBreakdown.map((item) => (
                    <tr key={item.value} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-medium flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.areaKm2.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.percentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pl-4">
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Terrain Distribution Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                <Mountain size={16} className="text-emerald-600" />
                Elevation Moments &amp; Relief (Copernicus 30m)
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span className="text-slate-500">Minimum Ground Elevation</span>
                  <span className="font-mono font-bold">{report.terrainMetrics.elevation.min} m</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span className="text-slate-500">Maximum Ground Elevation</span>
                  <span className="font-mono font-bold">{report.terrainMetrics.elevation.max} m</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span className="text-slate-500">Mean Ground Elevation</span>
                  <span className="font-mono font-bold text-emerald-600">{report.terrainMetrics.elevation.mean} m</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span className="text-slate-500">Standard Deviation (σ)</span>
                  <span className="font-mono font-bold">±{report.terrainMetrics.elevation.stdDev} m</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Median Elevation</span>
                  <span className="font-mono font-bold">{report.terrainMetrics.elevation.median} m</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                <Activity size={16} className="text-amber-600" />
                Slope Classification (Steepness Exposure)
              </h4>
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Flat Terrain (&lt; 2°)</span>
                    <span className="font-mono font-bold">{report.terrainMetrics.slope.flatPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${report.terrainMetrics.slope.flatPercent}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Gentle Slopes (2° - 5°)</span>
                    <span className="font-mono font-bold">{report.terrainMetrics.slope.gentlePercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${report.terrainMetrics.slope.gentlePercent}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Moderate Slopes (5° - 15°)</span>
                    <span className="font-mono font-bold">{report.terrainMetrics.slope.moderatePercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${report.terrainMetrics.slope.moderatePercent}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Steep &amp; Mountainous (&gt; 15°)</span>
                    <span className="font-mono font-bold">{report.terrainMetrics.slope.steepPercent + report.terrainMetrics.slope.verySteepPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${report.terrainMetrics.slope.steepPercent + report.terrainMetrics.slope.verySteepPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
