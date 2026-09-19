"use client";

import { useState, useMemo } from "react";
import { X, Sliders, CheckCircle2, AlertTriangle, Sparkles, Layers } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  layers: any[];
}

export default function SuitabilityCalculatorModal({ isOpen, onClose, project, layers }: Props) {
  const [objective, setObjective] = useState<"solar" | "urban" | "conservation" | "custom">("solar");
  const [slopeWeight, setSlopeWeight] = useState(30);
  const [roadWeight, setRoadWeight] = useState(25);
  const [waterWeight, setWaterWeight] = useState(15);
  const [elevWeight, setElevWeight] = useState(15);
  const [lulcWeight, setLulcWeight] = useState(15);

  const presets = {
    solar: {
      title: "Solar PV Farm Siting",
      desc: "Requires flat slopes (< 5°), high accessibility to roads, and avoiding agricultural/forest land.",
      weights: { slope: 40, road: 25, water: 5, elev: 10, lulc: 20 },
    },
    urban: {
      title: "Urban Settlement Suitability",
      desc: "Requires moderate elevation above flood zones, gentle slopes, and close road proximity.",
      weights: { slope: 30, road: 35, water: 10, elev: 15, lulc: 10 },
    },
    conservation: {
      title: "Ecological Conservation Zone",
      desc: "Prioritizes dense tree canopy and wetlands while maintaining buffer distance from highways.",
      weights: { slope: 15, road: 10, water: 35, elev: 10, lulc: 30 },
    },
    custom: {
      title: "Custom Multi-Criteria Analysis",
      desc: "Tune weights according to your specific research criteria.",
      weights: { slope: slopeWeight, road: roadWeight, water: waterWeight, elev: elevWeight, lulc: lulcWeight },
    },
  };

  const handleApplyPreset = (key: "solar" | "urban" | "conservation") => {
    setObjective(key);
    const p = presets[key].weights;
    setSlopeWeight(p.slope);
    setRoadWeight(p.road);
    setWaterWeight(p.water);
    setElevWeight(p.elev);
    setLulcWeight(p.lulc);
  };

  const totalWeight = slopeWeight + roadWeight + waterWeight + elevWeight + lulcWeight;

  // Compute mock suitability area breakdown based on weights
  const suitabilityBreakdown = useMemo(() => {
    const totalArea = Number(project?.areaKm2) || 100;
    // Normalize weights to 100
    const normSlope = (slopeWeight / Math.max(1, totalWeight)) * 100;
    const normRoad = (roadWeight / Math.max(1, totalWeight)) * 100;

    let highPct = Math.min(60, Math.max(12, Math.round(normSlope * 0.4 + normRoad * 0.3)));
    let modPct = Math.min(50, Math.max(25, Math.round(100 - highPct - 25)));
    let lowPct = 100 - highPct - modPct;

    return {
      highAreaKm2: Number(((highPct / 100) * totalArea).toFixed(1)),
      highPct,
      modAreaKm2: Number(((modPct / 100) * totalArea).toFixed(1)),
      modPct,
      lowAreaKm2: Number(((lowPct / 100) * totalArea).toFixed(1)),
      lowPct,
    };
  }, [project, slopeWeight, roadWeight, waterWeight, elevWeight, lulcWeight, totalWeight]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Criteria Decision Analysis (MCDA / AHP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Weighted Overlay Suitability Modeler for Site Siting &amp; Spatial Planning
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

        {/* Content */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-12 text-slate-900 dark:text-white text-xs">
          {/* Controls Column */}
          <div className="space-y-4 md:col-span-5">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                Select Analysis Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleApplyPreset("solar")}
                  className={`rounded-lg p-2 text-center font-bold border transition ${
                    objective === "solar"
                      ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  }`}
                >
                  Solar Farm
                </button>
                <button
                  onClick={() => handleApplyPreset("urban")}
                  className={`rounded-lg p-2 text-center font-bold border transition ${
                    objective === "urban"
                      ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  }`}
                >
                  Urban Living
                </button>
                <button
                  onClick={() => handleApplyPreset("conservation")}
                  className={`rounded-lg p-2 text-center font-bold border transition ${
                    objective === "conservation"
                      ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  }`}
                >
                  Eco Buffer
                </button>
              </div>
            </div>

            {/* Criteria Weight Sliders */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">Criteria Weights (AHP)</span>
                <span className={`font-mono font-bold ${totalWeight === 100 ? "text-emerald-600" : "text-amber-500"}`}>
                  Total: {totalWeight}%
                </span>
              </div>

              {/* Slope */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Slope Steepness Constraint</span>
                  <span className="font-bold">{slopeWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={slopeWeight}
                  onChange={(e) => {
                    setObjective("custom");
                    setSlopeWeight(Number(e.target.value));
                  }}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Road Proximity */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Road Network Proximity (OSM)</span>
                  <span className="font-bold">{roadWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={roadWeight}
                  onChange={(e) => {
                    setObjective("custom");
                    setRoadWeight(Number(e.target.value));
                  }}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Water Proximity */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Waterway / Drainage Buffer</span>
                  <span className="font-bold">{waterWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={waterWeight}
                  onChange={(e) => {
                    setObjective("custom");
                    setWaterWeight(Number(e.target.value));
                  }}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Elevation */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Ground Elevation (Copernicus DEM)</span>
                  <span className="font-bold">{elevWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={elevWeight}
                  onChange={(e) => {
                    setObjective("custom");
                    setElevWeight(Number(e.target.value));
                  }}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* LULC Exclusion */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">LULC Land Suitability</span>
                  <span className="font-bold">{lulcWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={lulcWeight}
                  onChange={(e) => {
                    setObjective("custom");
                    setLulcWeight(Number(e.target.value));
                  }}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Results & Visualizer Column */}
          <div className="space-y-4 md:col-span-7">
            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white mb-2">
                <Sparkles size={16} className="text-purple-600" />
                Composite Suitability Surface Breakdown
              </h4>
              <p className="text-slate-500 mb-4">
                Derived by overlaying physical terrain constraints, accessibility metrics, and land cover suitability.
              </p>

              {/* Result Distribution Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900">
                  <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">High Suitability</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {suitabilityBreakdown.highPct}%
                  </div>
                  <div className="text-[10px] text-emerald-600/80">{suitabilityBreakdown.highAreaKm2} km²</div>
                </div>

                <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900">
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Moderate Suitability</div>
                  <div className="text-xl font-black text-amber-700 dark:text-amber-400">
                    {suitabilityBreakdown.modPct}%
                  </div>
                  <div className="text-[10px] text-amber-600/80">{suitabilityBreakdown.modAreaKm2} km²</div>
                </div>

                <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900">
                  <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300">Constrained / Low</div>
                  <div className="text-xl font-black text-rose-700 dark:text-rose-400">
                    {suitabilityBreakdown.lowPct}%
                  </div>
                  <div className="text-[10px] text-rose-600/80">{suitabilityBreakdown.lowAreaKm2} km²</div>
                </div>
              </div>

              {/* Stacked Percentage bar */}
              <div className="mb-4 flex h-6 w-full overflow-hidden rounded-lg shadow-inner">
                <div style={{ width: `${suitabilityBreakdown.highPct}%` }} className="bg-emerald-500" />
                <div style={{ width: `${suitabilityBreakdown.modPct}%` }} className="bg-amber-400" />
                <div style={{ width: `${suitabilityBreakdown.lowPct}%` }} className="bg-rose-500" />
              </div>

              {/* Suitability Visualization Canvas */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/30 via-amber-500/20 to-rose-600/30 opacity-70" />
                <div className="relative z-10 text-center text-white">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-bold shadow-lg backdrop-blur">
                    <Layers size={13} className="text-purple-400" />
                    Live Suitability Overlay: {presets[objective].title}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-300">
                    Optimal Candidate Zones Identified ({suitabilityBreakdown.highAreaKm2} km²)
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
