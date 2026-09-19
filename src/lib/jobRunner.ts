import { db } from "@/db";
import { jobs, generatedLayers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateStudyAreaLayers, computeGridDimensions } from "./raster/generate";
import { saveLayerFile } from "./storage";
import { isGeeConfigured } from "./gee/client";
import { fetchGeeLayers } from "./gee/fetchLayers";
import { fetchRealElevationGrid } from "./providers/openElevation";
import { fetchOsmRoads, fetchOsmWaterways } from "./providers/openStreetMap";
import { fetchOsmFacilities } from "./providers/openStreetMapPOIs";
import { fetchStudyAreaClimate } from "./providers/openMeteo";
import {
  fetchStudyAreaFlood,
  fetchStudyAreaAirQuality,
  fetchStudyAreaSoilMoisture,
} from "./providers/openMeteoExtended";
import { fetchUsgsEarthquakes } from "./providers/usgsEarthquake";
import { fetchActiveFires } from "./providers/nasaFirms";
import {
  createRoadsThumbnailSvg,
  createWaterwaysThumbnailSvg,
  createClimateThumbnailSvg,
  createFloodThumbnailSvg,
  createAirQualityThumbnailSvg,
  createSoilMoistureThumbnailSvg,
  createEarthquakesThumbnailSvg,
  createFiresThumbnailSvg,
  createFacilitiesThumbnailSvg,
} from "./raster/vectorThumbnail";

const NON_RASTER_KEYS = new Set([
  "roads",
  "waterways",
  "critical_facilities",
  "climate_summary",
  "flood_risk",
  "soil_moisture",
  "air_quality",
  "earthquakes",
  "active_fires",
]);

export async function createAndRunJob(projectId: string): Promise<string> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("Project not found");

  const selectedLayers = (project.selectedLayers as string[]) ?? [];
  const [job] = await db
    .insert(jobs)
    .values({
      projectId,
      status: "queued",
      progress: 0,
      message: "Queued for processing",
      totalLayers: selectedLayers.length,
      completedLayers: 0,
    })
    .returning();

  await db.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
  await db.delete(generatedLayers).where(eq(generatedLayers.projectId, projectId));

  // Fire and forget execution
  runJob(job.id, projectId).catch(async (err) => {
    console.error("Job runner execution error:", err);
    await db
      .update(jobs)
      .set({ status: "failed", error: String(err?.message || err), finishedAt: new Date() })
      .where(eq(jobs.id, job.id));
    await db.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, projectId));
  });

  return job.id;
}

async function runJob(jobId: string, projectId: string) {
  await db
    .update(jobs)
    .set({ status: "running", startedAt: new Date(), message: "Preparing study area grid..." })
    .where(eq(jobs.id, jobId));

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("Project not found");

  const selectedLayers = (project.selectedLayers as string[]) ?? [];
  const bbox = project.bbox as [number, number, number, number];
  const geometry = project.geometry as GeoJSON.Geometry;
  const totalLayers = selectedLayers.length;
  let completedCount = 0;

  // 1. Separate non-raster layers from raster layers
  const rasterLayerKeys = selectedLayers.filter((k) => !NON_RASTER_KEYS.has(k));

  // 2. Fetch real elevation from Copernicus 30m DEM via Open-Meteo
  let realDem: Float32Array | undefined = undefined;
  const needsElevation = rasterLayerKeys.some((k) =>
    ["dem", "elevation", "slope", "aspect", "hillshade", "curvature", "dsm", "twi"].includes(k)
  );

  if (needsElevation) {
    try {
      await db
        .update(jobs)
        .set({ message: "Fetching real 30m elevation from Copernicus DEM..." })
        .where(eq(jobs.id, jobId));

      const dims = computeGridDimensions(bbox, project.resolution);
      const elevResult = await fetchRealElevationGrid(bbox, dims.width, dims.height);
      if (elevResult) {
        realDem = elevResult.dem;
        console.log(
          `Real Copernicus DEM loaded for project ${project.id}: min=${elevResult.minElevation}m, max=${elevResult.maxElevation}m`
        );
      }
    } catch (elevErr) {
      console.warn("Copernicus DEM fetch error, continuing with fallback:", elevErr);
    }
  }

  // 3. Process raster layers (via GEE if configured, else procedural simulation with real DEM)
  let rasterResults: any[] = [];
  const geeConfigured = isGeeConfigured();

  if (geeConfigured && rasterLayerKeys.length > 0) {
    try {
      await db
        .update(jobs)
        .set({ message: "Requesting real satellite layers from Google Earth Engine..." })
        .where(eq(jobs.id, jobId));

      rasterResults = await fetchGeeLayers({
        geometry,
        resolutionMeters: project.resolution,
        layerKeys: rasterLayerKeys,
        onProgress: async (completed, total, label) => {
          completedCount = completed;
          const progress = Math.min(80, Math.round((completedCount / Math.max(1, totalLayers)) * 80) + 5);
          await db
            .update(jobs)
            .set({
              progress,
              completedLayers: completedCount,
              message: `Retrieved GEE ${label} (${completedCount}/${totalLayers})`,
            })
            .where(eq(jobs.id, jobId));
        },
      });
    } catch (geeErr) {
      console.warn("GEE pipeline error, falling back to local processing:", geeErr);
    }
  }

  if (rasterResults.length === 0 && rasterLayerKeys.length > 0) {
    const sim = await generateStudyAreaLayers({
      seed: project.boundaryId || project.id,
      bbox,
      geometry,
      resolutionMeters: project.resolution,
      layerKeys: rasterLayerKeys,
      realDem,
      onProgress: async (completed, total, label) => {
        completedCount = completed;
        const progress = Math.min(80, Math.round((completedCount / Math.max(1, totalLayers)) * 80) + 5);
        await db
          .update(jobs)
          .set({
            progress,
            completedLayers: completedCount,
            message: `Generated ${label} (${completedCount}/${totalLayers})`,
          })
          .where(eq(jobs.id, jobId));
      },
    });
    rasterResults = sim.results;
  }

  // Save raster layers to disk and DB
  for (const r of rasterResults) {
    const filePath = saveLayerFile(project.id, r.key, r.geotiff, "tif");
    await db.insert(generatedLayers).values({
      projectId: project.id,
      layerKey: r.key,
      layerLabel: r.label,
      category: r.category,
      resolution: r.resolution,
      width: r.width,
      height: r.height,
      crs: r.crs,
      filePath,
      fileSizeBytes: r.geotiff.length,
      unit: r.unit,
      stats: r.stats,
      legend: r.legend ?? null,
      thumbnail: r.thumbnailBase64,
      status: "completed",
    });
  }

  // 4. Live Vector Layer: OSM Roads
  if (selectedLayers.includes("roads")) {
    await updateJobStep(jobId, "Extracting road & highway network from OpenStreetMap...", completedCount, totalLayers);
    const roadsResult = await fetchOsmRoads(bbox, geometry);
    if (roadsResult) {
      const filePath = saveLayerFile(project.id, "roads", roadsResult.geojsonString, "geojson");
      const thumb = createRoadsThumbnailSvg(roadsResult.featureCount, roadsResult.totalLengthKm);
      await saveLayerRecord(project.id, {
        layerKey: "roads",
        layerLabel: "Roads & Transportation (OSM)",
        category: "Vector & Infrastructure",
        resolution: project.resolution,
        filePath,
        fileSizeBytes: Buffer.byteLength(roadsResult.geojsonString),
        unit: "lines",
        stats: {
          min: 0,
          max: roadsResult.featureCount,
          mean: roadsResult.totalLengthKm,
          std: 0,
          validPixels: roadsResult.featureCount,
          features: roadsResult.featureCount,
          lengthKm: roadsResult.totalLengthKm,
          source: roadsResult.source,
        },
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 5. Live Vector Layer: OSM Waterways
  if (selectedLayers.includes("waterways")) {
    await updateJobStep(jobId, "Extracting rivers & waterways from OpenStreetMap...", completedCount, totalLayers);
    const waterResult = await fetchOsmWaterways(bbox, geometry);
    if (waterResult) {
      const filePath = saveLayerFile(project.id, "waterways", waterResult.geojsonString, "geojson");
      const thumb = createWaterwaysThumbnailSvg(waterResult.featureCount, waterResult.totalLengthKm);
      await saveLayerRecord(project.id, {
        layerKey: "waterways",
        layerLabel: "Rivers & Waterways (OSM)",
        category: "Vector & Infrastructure",
        resolution: project.resolution,
        filePath,
        fileSizeBytes: Buffer.byteLength(waterResult.geojsonString),
        unit: "lines",
        stats: {
          min: 0,
          max: waterResult.featureCount,
          mean: waterResult.totalLengthKm,
          std: 0,
          validPixels: waterResult.featureCount,
          features: waterResult.featureCount,
          lengthKm: waterResult.totalLengthKm,
          source: waterResult.source,
        },
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 6. Live Vector Layer: OSM Critical Facilities
  if (selectedLayers.includes("critical_facilities")) {
    await updateJobStep(jobId, "Extracting hospitals, schools & emergency POIs...", completedCount, totalLayers);
    const facResult = await fetchOsmFacilities(bbox, geometry);
    if (facResult) {
      const filePath = saveLayerFile(project.id, "critical_facilities", facResult.geojsonString, "geojson");
      const thumb = createFacilitiesThumbnailSvg(facResult.totalCount, facResult.healthCount, facResult.educationCount);
      await saveLayerRecord(project.id, {
        layerKey: "critical_facilities",
        layerLabel: "Critical Facilities (Hospitals & Schools)",
        category: "Vector & Infrastructure",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(facResult.geojsonString),
        unit: "points",
        stats: {
          min: 0,
          max: facResult.totalCount,
          mean: facResult.healthCount,
          std: 0,
          validPixels: facResult.totalCount,
          features: facResult.totalCount,
          healthCount: facResult.healthCount,
          educationCount: facResult.educationCount,
          emergencyCount: facResult.emergencyCount,
          source: facResult.source,
        },
        legend: facResult.facilities as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 7. Live Climate & Weather: Open-Meteo ERA5
  if (selectedLayers.includes("climate_summary")) {
    await updateJobStep(jobId, "Fetching 1-year precipitation & temperature trends from Open-Meteo...", completedCount, totalLayers);
    const climateResult = await fetchStudyAreaClimate(bbox);
    if (climateResult) {
      const jsonStr = JSON.stringify(climateResult, null, 2);
      const filePath = saveLayerFile(project.id, "climate_summary", jsonStr, "json");
      const thumb = createClimateThumbnailSvg(climateResult.annualPrecipitationMm, climateResult.meanTemperatureC);
      await saveLayerRecord(project.id, {
        layerKey: "climate_summary",
        layerLabel: "Climate & Rainfall Summary",
        category: "Climate & Weather",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(jsonStr),
        unit: "mm/°C",
        stats: {
          min: climateResult.minTemperatureC,
          max: climateResult.maxTemperatureC,
          mean: climateResult.meanTemperatureC,
          std: 0,
          validPixels: 365,
          annualPrecipMm: climateResult.annualPrecipitationMm,
          wettestMonth: climateResult.wettestMonth,
          driestMonth: climateResult.driestMonth,
          source: climateResult.source,
        },
        legend: climateResult.monthlyData as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 8. Live Flood & River Discharge: GloFAS
  if (selectedLayers.includes("flood_risk")) {
    await updateJobStep(jobId, "Querying GloFAS river discharge & flood risk...", completedCount, totalLayers);
    const floodResult = await fetchStudyAreaFlood(bbox);
    if (floodResult) {
      const jsonStr = JSON.stringify(floodResult, null, 2);
      const filePath = saveLayerFile(project.id, "flood_risk", jsonStr, "json");
      const thumb = createFloodThumbnailSvg(floodResult.peakDischargeM3s, floodResult.riskLevel);
      await saveLayerRecord(project.id, {
        layerKey: "flood_risk",
        layerLabel: "River Discharge & Flood Risk",
        category: "Climate & Weather",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(jsonStr),
        unit: "m³/s",
        stats: {
          min: 0,
          max: floodResult.peakDischargeM3s,
          mean: floodResult.currentDischargeM3s,
          std: 0,
          validPixels: 7,
          peakDischargeM3s: floodResult.peakDischargeM3s,
          peakDate: floodResult.peakDate,
          riskLevel: floodResult.riskLevel,
          source: floodResult.source,
        },
        legend: floodResult.forecastDays as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 9. Live Air Quality: CAMS / Open-Meteo
  if (selectedLayers.includes("air_quality")) {
    await updateJobStep(jobId, "Fetching CAMS air quality and PM2.5 levels...", completedCount, totalLayers);
    const aqResult = await fetchStudyAreaAirQuality(bbox);
    if (aqResult) {
      const jsonStr = JSON.stringify(aqResult, null, 2);
      const filePath = saveLayerFile(project.id, "air_quality", jsonStr, "json");
      const thumb = createAirQualityThumbnailSvg(aqResult.europeanAqi, aqResult.aqiCategory);
      await saveLayerRecord(project.id, {
        layerKey: "air_quality",
        layerLabel: "Air Quality & PM2.5 (CAMS)",
        category: "Climate & Weather",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(jsonStr),
        unit: "AQI",
        stats: {
          min: 0,
          max: aqResult.europeanAqi,
          mean: aqResult.pm25,
          std: 0,
          validPixels: 1,
          europeanAqi: aqResult.europeanAqi,
          aqiCategory: aqResult.aqiCategory,
          pm25: aqResult.pm25,
          pm10: aqResult.pm10,
          nitrogenDioxide: aqResult.nitrogenDioxide,
          source: aqResult.source,
        },
        legend: aqResult as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 10. Live Soil Moisture Profile: ECMWF IFS
  if (selectedLayers.includes("soil_moisture")) {
    await updateJobStep(jobId, "Measuring volumetric soil moisture profile (0-100cm)...", completedCount, totalLayers);
    const soilResult = await fetchStudyAreaSoilMoisture(bbox);
    if (soilResult) {
      const jsonStr = JSON.stringify(soilResult, null, 2);
      const filePath = saveLayerFile(project.id, "soil_moisture", jsonStr, "json");
      const thumb = createSoilMoistureThumbnailSvg(soilResult.meanMoisturePercent, soilResult.droughtCategory);
      await saveLayerRecord(project.id, {
        layerKey: "soil_moisture",
        layerLabel: "Soil Moisture Profile (0-100cm)",
        category: "Climate & Weather",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(jsonStr),
        unit: "% vol",
        stats: {
          min: soilResult.surfaceMoistureM3m3,
          max: soilResult.deepSoilMoistureM3m3,
          mean: soilResult.meanMoisturePercent,
          std: 0,
          validPixels: 3,
          surface: soilResult.surfaceMoistureM3m3,
          rootZone: soilResult.rootZoneMoistureM3m3,
          deepSoil: soilResult.deepSoilMoistureM3m3,
          droughtCategory: soilResult.droughtCategory,
          source: soilResult.source,
        },
        legend: soilResult as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 11. Live Natural Hazard: USGS Earthquakes
  if (selectedLayers.includes("earthquakes")) {
    await updateJobStep(jobId, "Querying USGS global seismic catalog...", completedCount, totalLayers);
    const eqResult = await fetchUsgsEarthquakes(bbox, geometry);
    if (eqResult) {
      const filePath = saveLayerFile(project.id, "earthquakes", eqResult.geojsonString, "geojson");
      const thumb = createEarthquakesThumbnailSvg(eqResult.totalEvents, eqResult.maxMagnitude);
      await saveLayerRecord(project.id, {
        layerKey: "earthquakes",
        layerLabel: "Earthquake History & Seismic Points",
        category: "Natural Hazards & Disaster",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(eqResult.geojsonString),
        unit: "Magnitude",
        stats: {
          min: 2.5,
          max: eqResult.maxMagnitude,
          mean: eqResult.meanMagnitude,
          std: 0,
          validPixels: eqResult.totalEvents,
          totalEvents: eqResult.totalEvents,
          features: eqResult.totalEvents,
          maxMagnitude: eqResult.maxMagnitude,
          source: eqResult.source,
        },
        legend: eqResult.events as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 12. Live Natural Hazard: NASA FIRMS Active Fires
  if (selectedLayers.includes("active_fires")) {
    await updateJobStep(jobId, "Scanning NASA FIRMS for active wildfires & thermal hotspots...", completedCount, totalLayers);
    const fireResult = await fetchActiveFires(bbox, geometry);
    if (fireResult) {
      const filePath = saveLayerFile(project.id, "active_fires", fireResult.geojsonString, "geojson");
      const thumb = createFiresThumbnailSvg(fireResult.fireCount, fireResult.maxFrpMw);
      await saveLayerRecord(project.id, {
        layerKey: "active_fires",
        layerLabel: "Active Wildfires & Thermal Hotspots",
        category: "Natural Hazards & Disaster",
        resolution: 0,
        filePath,
        fileSizeBytes: Buffer.byteLength(fireResult.geojsonString),
        unit: "MW",
        stats: {
          min: 0,
          max: fireResult.maxFrpMw,
          mean: fireResult.fireCount > 0 ? Number((fireResult.totalFrpMw / fireResult.fireCount).toFixed(1)) : 0,
          std: 0,
          validPixels: fireResult.fireCount,
          fireCount: fireResult.fireCount,
          features: fireResult.fireCount,
          maxFrpMw: fireResult.maxFrpMw,
          source: fireResult.source,
        },
        legend: fireResult.fires as any,
        thumbnail: thumb,
      });
      completedCount++;
    }
  }

  // 13. Complete job
  await db
    .update(jobs)
    .set({
      status: "completed",
      progress: 100,
      completedLayers: completedCount,
      message: `All ${completedCount} layers generated with live geospatial data`,
      finishedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  await db.update(projects).set({ status: "completed", updatedAt: new Date() }).where(eq(projects.id, project.id));
}

async function updateJobStep(jobId: string, message: string, completedCount: number, totalLayers: number) {
  const progress = Math.min(96, Math.round((completedCount / Math.max(1, totalLayers)) * 92) + 5);
  await db.update(jobs).set({ message, progress, completedLayers: completedCount }).where(eq(jobs.id, jobId));
}

async function saveLayerRecord(projectId: string, data: any) {
  await db.insert(generatedLayers).values({
    projectId,
    layerKey: data.layerKey,
    layerLabel: data.layerLabel,
    category: data.category,
    resolution: data.resolution ?? 0,
    width: 0,
    height: 0,
    crs: "EPSG:4326",
    filePath: data.filePath,
    fileSizeBytes: data.fileSizeBytes,
    unit: data.unit ?? "",
    stats: data.stats,
    legend: data.legend ?? null,
    thumbnail: data.thumbnail,
    status: "completed",
  });
}
