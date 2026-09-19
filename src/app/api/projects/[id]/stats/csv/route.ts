import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, generatedLayers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeZonalAnalysis } from "@/lib/raster/zonalStats";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const layers = await db.select().from(generatedLayers).where(eq(generatedLayers.projectId, id));
  const analysis = computeZonalAnalysis(project, layers);

  // Generate scientific CSV content
  const rows: string[] = [];
  rows.push("GEOSTUDY AREA ANALYZER - SCIENTIFIC ZONAL STATISTICS & METRICS REPORT");
  rows.push(`Study Area Name,${JSON.stringify(analysis.studyAreaName)}`);
  rows.push(`Total Area (sq km),${analysis.totalAreaKm2.toFixed(2)}`);
  rows.push(`Spatial Resolution (m),${analysis.resolutionMeters}`);
  rows.push("");

  rows.push("--- LAND USE AND LAND COVER (LULC) BREAKDOWN ---");
  rows.push("Class Code,Class Label,Area (sq km),Proportion (%)");
  for (const c of analysis.lulcBreakdown) {
    rows.push(`${c.value},${JSON.stringify(c.label)},${c.areaKm2.toFixed(2)},${c.percentage.toFixed(1)}`);
  }
  rows.push("");

  rows.push("--- TOPOGRAPHIC RELIEF & TERRAIN DYNAMICS ---");
  rows.push("Metric,Value,Unit");
  rows.push(`Minimum Elevation,${analysis.terrainMetrics.elevation.min},meters AMSL`);
  rows.push(`Maximum Elevation,${analysis.terrainMetrics.elevation.max},meters AMSL`);
  rows.push(`Mean Elevation,${analysis.terrainMetrics.elevation.mean},meters AMSL`);
  rows.push(`Elevation Std Dev (sigma),${analysis.terrainMetrics.elevation.stdDev},meters`);
  rows.push(`Median Elevation,${analysis.terrainMetrics.elevation.median},meters AMSL`);
  rows.push(`Mean Surface Gradient,${analysis.terrainMetrics.slope.meanSlopeDeg},degrees`);
  rows.push(`Flat Terrain (<2 deg),${analysis.terrainMetrics.slope.flatPercent},%`);
  rows.push(`Gentle Slopes (2-5 deg),${analysis.terrainMetrics.slope.gentlePercent},%`);
  rows.push(`Moderate Slopes (5-15 deg),${analysis.terrainMetrics.slope.moderatePercent},%`);
  rows.push(`Steep Slopes (>15 deg),${analysis.terrainMetrics.slope.steepPercent + analysis.terrainMetrics.slope.verySteepPercent},%`);
  rows.push("");

  rows.push("--- INFRASTRUCTURE & EXPOSURE METRICS ---");
  rows.push("Feature,Value,Unit");
  rows.push(`Total Road Length,${analysis.infrastructureMetrics.roadLengthKm},km`);
  rows.push(`Road Network Density,${analysis.infrastructureMetrics.roadDensityKmPerKm2},km/sq km`);
  rows.push(`Waterways Channel Length,${analysis.infrastructureMetrics.waterwayLengthKm},km`);
  rows.push(`Drainage Channel Density,${analysis.infrastructureMetrics.drainageDensityKmPerKm2},km/sq km`);
  rows.push(`Critical Facilities Identified,${analysis.infrastructureMetrics.criticalFacilitiesCount},count`);
  rows.push("");

  rows.push("--- CLIMATOLOGY & DISASTER RISK ---");
  rows.push("Hazard Indicator,Value,Unit");
  if (analysis.climateAndHazards.annualRainfallMm != null) {
    rows.push(`Annual Precipitation,${analysis.climateAndHazards.annualRainfallMm},mm`);
  }
  if (analysis.climateAndHazards.meanTempC != null) {
    rows.push(`Mean Ambient Temperature,${analysis.climateAndHazards.meanTempC},deg C`);
  }
  if (analysis.climateAndHazards.peakRiverDischargeM3s != null) {
    rows.push(`Peak River Discharge (GloFAS),${analysis.climateAndHazards.peakRiverDischargeM3s},m3/s`);
  }
  if (analysis.climateAndHazards.europeanAqi != null) {
    rows.push(`Air Quality Index (CAMS AQI),${analysis.climateAndHazards.europeanAqi},index`);
  }
  if (analysis.climateAndHazards.maxEarthquakeMagnitude != null) {
    rows.push(`Max Earthquake Magnitude (USGS),${analysis.climateAndHazards.maxEarthquakeMagnitude},Richter scale`);
    rows.push(`Total Historical Seismic Events,${analysis.climateAndHazards.totalEarthquakesCount},count`);
  }

  const csv = rows.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="study_area_${id}_statistics.csv"`,
    },
  });
}
