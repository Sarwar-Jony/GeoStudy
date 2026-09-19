"use client";

import { useState, useMemo } from "react";
import { X, FileText, Copy, Check, Printer, Sparkles, BookOpen } from "lucide-react";
import { computeZonalAnalysis } from "@/lib/raster/zonalStats";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  layers: any[];
}

export default function StudyAreaReportModal({ isOpen, onClose, project, layers }: Props) {
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    return computeZonalAnalysis(project, layers);
  }, [project, layers]);

  const [minLng, minLat, maxLng, maxLat] = project.bbox || [0, 0, 0, 0];

  const markdownContent = useMemo(() => {
    return `# 2. Study Area Description and Geospatial Datasets

## 2.1 Geographic Location & Administrative Context
The investigation was conducted across **${project.boundaryName || project.name}** located in ${project.countryName}. 
The study area spans a total surface area of **${Number(project.areaKm2).toFixed(2)} km²** and is geographically bounded between latitudes **${minLat.toFixed(4)}°N to ${maxLat.toFixed(4)}°N** and longitudes **${minLng.toFixed(4)}°E to ${maxLng.toFixed(4)}°E** within the World Geodetic System 1984 (WGS 84 / EPSG:4326) coordinate reference frame.

## 2.2 Topography and Geomorphological Relief
Physical terrain characteristics were derived from the Copernicus Global 30m Digital Elevation Model (GLO-30):
- **Ground Elevation Range:** ${report.terrainMetrics.elevation.min} m to ${report.terrainMetrics.elevation.max} m above mean sea level (AMSL), with a mean altitude of ${report.terrainMetrics.elevation.mean} m (σ = ±${report.terrainMetrics.elevation.stdDev} m).
- **Slope Steepness Dynamics:** Average surface gradient was measured at **${report.terrainMetrics.slope.meanSlopeDeg}°**. Flat terrain (< 2°) accounts for **${report.terrainMetrics.slope.flatPercent}%**, gentle slopes (2° - 5°) comprise **${report.terrainMetrics.slope.gentlePercent}%**, while moderate to steep terrain accounts for **${(report.terrainMetrics.slope.moderatePercent + report.terrainMetrics.slope.steepPercent).toFixed(1)}%**.

## 2.3 Climatology, Precipitation & Hydrological Exposure
According to the ECMWF ERA5 reanalysis and GloFAS hydrological monitoring:
- **Annual Precipitation:** Approximately ${report.climateAndHazards.annualRainfallMm ?? "N/A"} mm.
- **Mean Temperature:** ${report.climateAndHazards.meanTempC ?? "N/A"} °C.
${report.climateAndHazards.peakRiverDischargeM3s ? `- **Peak River Discharge (GloFAS):** ${report.climateAndHazards.peakRiverDischargeM3s} m³/s.` : ""}
${report.climateAndHazards.europeanAqi ? `- **Air Quality Index (CAMS European AQI):** ${report.climateAndHazards.europeanAqi}.` : ""}

## 2.4 Land Use and Land Cover (LULC) Composition
Spatial land cover distributions were classified at 10m spatial resolution following the ESA WorldCover taxonomy:
| Land Cover Class | Area (km²) | Proportion (%) |
| :--- | :---: | :---: |
${report.lulcBreakdown.map((item) => `| ${item.label} | ${item.areaKm2.toFixed(2)} | ${item.percentage.toFixed(1)}% |`).join("\n")}

## 2.5 Infrastructure and Exposure Metrics
- **Transportation Network (OSM):** ${report.infrastructureMetrics.roadLengthKm} km of primary, secondary, and residential roads (Road density = **${report.infrastructureMetrics.roadDensityKmPerKm2} km/km²**).
- **Drainage & Waterways:** ${report.infrastructureMetrics.waterwayLengthKm} km of mapped river channels (Drainage density = **${report.infrastructureMetrics.drainageDensityKmPerKm2} km/km²**).
- **Critical Amenities:** ${report.infrastructureMetrics.criticalFacilitiesCount} health and educational facilities identified within the study bounds.
${report.climateAndHazards.maxEarthquakeMagnitude ? `- **Seismic Activity (USGS):** ${report.climateAndHazards.totalEarthquakesCount} recorded seismic events with a maximum recorded magnitude of M${report.climateAndHazards.maxEarthquakeMagnitude}.` : ""}

## 2.6 Geospatial Data Sources & Citations
1. **Copernicus DEM (2021):** European Space Agency (ESA) & Airbus Defence and Space, GLO-30 Public Release.
2. **OpenStreetMap Contributors (2025):** Planet dump retrieved via Overpass API.
3. **ECMWF ERA5 (2024):** Copernicus Climate Change Service (C3S) climate reanalysis.
4. **USGS Earthquake Hazards Program (2025):** Advanced National Seismic System (ANSS) Comprehensive Catalog.
`;
  }, [project, report, minLat, maxLat, minLng, maxLng]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Academic Study Area Monograph / Research Paper Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ready-to-publish "Study Area Description" section formatted for journals (Elsevier, Springer, Nature)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copied ? "Copied Markdown!" : "Copy Markdown"}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Printer size={13} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-900 dark:text-white font-serif leading-relaxed">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 font-sans text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200 flex items-start gap-2.5">
            <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Peer-Reviewed Research Ready:</strong> This monograph synthesizes real geographic coordinates, physical topography from Copernicus DEM, land cover taxonomy from ESA WorldCover, climate trends, and infrastructure metrics. You can copy this directly into Overleaf, LaTeX, or Microsoft Word.
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none text-sm space-y-4">
            <h2 className="text-xl font-bold font-sans border-b pb-2">2. Study Area Description and Geospatial Datasets</h2>

            <div>
              <h3 className="text-base font-bold font-sans text-emerald-700 dark:text-emerald-400">
                2.1 Geographic Location &amp; Administrative Context
              </h3>
              <p className="mt-1">
                The investigation was conducted across <strong>{project.boundaryName || project.name}</strong> located in {project.countryName}. The study area spans a total surface area of <strong>{Number(project.areaKm2).toFixed(2)} km²</strong> and is geographically bounded between latitudes <strong>{minLat.toFixed(4)}°N to {maxLat.toFixed(4)}°N</strong> and longitudes <strong>{minLng.toFixed(4)}°E to {maxLng.toFixed(4)}°E</strong> within the World Geodetic System 1984 (WGS 84 / EPSG:4326) coordinate reference frame.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold font-sans text-emerald-700 dark:text-emerald-400">
                2.2 Topography and Geomorphological Relief
              </h3>
              <p className="mt-1">
                Physical terrain characteristics were derived from the Copernicus Global 30m Digital Elevation Model (GLO-30):
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-1">
                <li>
                  <strong>Ground Elevation Range:</strong> {report.terrainMetrics.elevation.min} m to {report.terrainMetrics.elevation.max} m AMSL (Mean = {report.terrainMetrics.elevation.mean} m, σ = ±{report.terrainMetrics.elevation.stdDev} m).
                </li>
                <li>
                  <strong>Slope Dynamics:</strong> Mean terrain slope is measured at <strong>{report.terrainMetrics.slope.meanSlopeDeg}°</strong>. Flat lands (&lt; 2°) constitute <strong>{report.terrainMetrics.slope.flatPercent}%</strong>, gentle slopes (2° - 5°) comprise <strong>{report.terrainMetrics.slope.gentlePercent}%</strong>, and moderate to steep terrain accounts for <strong>{(report.terrainMetrics.slope.moderatePercent + report.terrainMetrics.slope.steepPercent).toFixed(1)}%</strong>.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold font-sans text-emerald-700 dark:text-emerald-400">
                2.3 Climatology, Precipitation &amp; Hydrological Profile
              </h3>
              <p className="mt-1">
                Annual precipitation across the study area totals approximately <strong>{report.climateAndHazards.annualRainfallMm ?? "N/A"} mm</strong> with an average ambient temperature of <strong>{report.climateAndHazards.meanTempC ?? "N/A"} °C</strong> (ECMWF ERA5 Reanalysis).
                {report.climateAndHazards.peakRiverDischargeM3s ? ` Peak river discharge recorded by GloFAS reaches ${report.climateAndHazards.peakRiverDischargeM3s} m³/s.` : ""}
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold font-sans text-emerald-700 dark:text-emerald-400">
                2.4 Land Use and Land Cover (LULC) Composition
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs font-sans border border-slate-200 dark:border-slate-800">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-2 text-left">Land Cover Class</th>
                      <th className="p-2 text-right">Area (km²)</th>
                      <th className="p-2 text-right">Proportion (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {report.lulcBreakdown.map((item) => (
                      <tr key={item.value}>
                        <td className="p-2 font-medium">{item.label}</td>
                        <td className="p-2 text-right font-mono">{item.areaKm2.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold font-sans text-emerald-700 dark:text-emerald-400">
                2.5 Infrastructure, Human Exposure &amp; Natural Hazards
              </h3>
              <p className="mt-1">
                The transportation grid features <strong>{report.infrastructureMetrics.roadLengthKm} km</strong> of mapped highways and roads (density: {report.infrastructureMetrics.roadDensityKmPerKm2} km/km²), accompanied by <strong>{report.infrastructureMetrics.waterwayLengthKm} km</strong> of waterways. A total of <strong>{report.infrastructureMetrics.criticalFacilitiesCount}</strong> critical public facilities (medical centers and schools) were mapped within the AOI.
                {report.climateAndHazards.maxEarthquakeMagnitude ? ` Historical seismic records identify ${report.climateAndHazards.totalEarthquakesCount} earthquake epicenters (maximum magnitude M${report.climateAndHazards.maxEarthquakeMagnitude}).` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
