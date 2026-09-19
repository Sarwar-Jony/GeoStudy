/**
 * Extended Open-Meteo Environmental & Hydrology Providers
 * 100% Free - No API key or credit card required.
 * Provides:
 * 1. GloFAS River Discharge & Flood Risk Forecast
 * 2. Real-time & Seasonal Air Quality (PM2.5, PM10, NO2, O3, European AQI)
 * 3. Volumetric Soil Moisture Profile (0-7cm, 7-28cm, 28-100cm)
 */

export interface FloodForecastDay {
  date: string;
  riverDischargeM3s: number;
}

export interface FloodRiskResult {
  latitude: number;
  longitude: number;
  forecastDays: FloodForecastDay[];
  currentDischargeM3s: number;
  peakDischargeM3s: number;
  peakDate: string;
  riskLevel: "Low" | "Moderate" | "High" | "Severe";
  source: string;
}

export interface AirQualityResult {
  latitude: number;
  longitude: number;
  europeanAqi: number; // 0-100+
  aqiCategory: "Good" | "Fair" | "Moderate" | "Poor" | "Very Poor";
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  nitrogenDioxide: number; // µg/m³
  ozone: number; // µg/m³
  carbonMonoxide: number; // µg/m³
  dust: number; // µg/m³
  source: string;
}

export interface SoilMoistureProfileResult {
  latitude: number;
  longitude: number;
  surfaceMoistureM3m3: number; // 0-7 cm (volumetric)
  rootZoneMoistureM3m3: number; // 7-28 cm (volumetric)
  deepSoilMoistureM3m3: number; // 28-100 cm (volumetric)
  meanMoisturePercent: number; // 0 - 100%
  droughtCategory: "Extremely Dry" | "Moderate Drought" | "Adequate" | "Saturated / Wet";
  source: string;
}

/**
 * Fetch 7-day river discharge & flood risk via Open-Meteo Flood API (GloFAS)
 */
export async function fetchStudyAreaFlood(
  bbox: [number, number, number, number]
): Promise<FloodRiskResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lat = Number(((minLat + maxLat) / 2).toFixed(4));
  const lon = Number(((minLng + maxLng) / 2).toFixed(4));

  try {
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&forecast_days=7`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GeoStudyAreaAnalyzer/1.0", Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Flood API returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    const daily = json.daily;
    if (!daily || !daily.time || daily.time.length === 0) return null;

    const times: string[] = daily.time;
    const discharge: number[] = daily.river_discharge || [];

    const forecastDays: FloodForecastDay[] = [];
    let peak = -Infinity;
    let peakDate = times[0];

    for (let i = 0; i < times.length; i++) {
      const q = discharge[i] != null ? Number(discharge[i].toFixed(2)) : 0;
      forecastDays.push({ date: times[i], riverDischargeM3s: q });
      if (q > peak) {
        peak = q;
        peakDate = times[i];
      }
    }

    const currentDischarge = forecastDays[0]?.riverDischargeM3s ?? 0;

    let riskLevel: FloodRiskResult["riskLevel"] = "Low";
    if (peak > 1500) riskLevel = "Severe";
    else if (peak > 500) riskLevel = "High";
    else if (peak > 100) riskLevel = "Moderate";

    return {
      latitude: lat,
      longitude: lon,
      forecastDays,
      currentDischargeM3s: currentDischarge,
      peakDischargeM3s: Number(peak.toFixed(2)),
      peakDate,
      riskLevel,
      source: "Global Flood Awareness System (GloFAS) via Open-Meteo",
    };
  } catch (err) {
    console.warn("Failed to fetch flood forecast:", err);
    return null;
  }
}

/**
 * Fetch live and forecast Air Quality indices (PM2.5, PM10, NO2, O3, European AQI)
 */
export async function fetchStudyAreaAirQuality(
  bbox: [number, number, number, number]
): Promise<AirQualityResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lat = Number(((minLat + maxLat) / 2).toFixed(4));
  const lon = Number(((minLng + maxLng) / 2).toFixed(4));

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,carbon_monoxide,dust`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GeoStudyAreaAnalyzer/1.0", Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Air Quality API returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    const cur = json.current;
    if (!cur) return null;

    const aqi = cur.european_aqi ?? 20;
    let aqiCategory: AirQualityResult["aqiCategory"] = "Good";
    if (aqi > 80) aqiCategory = "Very Poor";
    else if (aqi > 60) aqiCategory = "Poor";
    else if (aqi > 40) aqiCategory = "Moderate";
    else if (aqi > 20) aqiCategory = "Fair";

    return {
      latitude: lat,
      longitude: lon,
      europeanAqi: aqi,
      aqiCategory,
      pm25: Number((cur.pm2_5 ?? 0).toFixed(1)),
      pm10: Number((cur.pm10 ?? 0).toFixed(1)),
      nitrogenDioxide: Number((cur.nitrogen_dioxide ?? 0).toFixed(1)),
      ozone: Number((cur.ozone ?? 0).toFixed(1)),
      carbonMonoxide: Number((cur.carbon_monoxide ?? 0).toFixed(1)),
      dust: Number((cur.dust ?? 0).toFixed(1)),
      source: "Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo",
    };
  } catch (err) {
    console.warn("Failed to fetch air quality:", err);
    return null;
  }
}

/**
 * Fetch 3-level volumetric soil moisture profile
 */
export async function fetchStudyAreaSoilMoisture(
  bbox: [number, number, number, number]
): Promise<SoilMoistureProfileResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lat = Number(((minLat + maxLat) / 2).toFixed(4));
  const lon = Number(((minLng + maxLng) / 2).toFixed(4));

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GeoStudyAreaAnalyzer/1.0", Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Soil Moisture API returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    const cur = json.current;
    if (!cur) return null;

    const surface = Number((cur.soil_moisture_0_to_7cm ?? 0.25).toFixed(3));
    const rootZone = Number((cur.soil_moisture_7_to_28cm ?? 0.28).toFixed(3));
    const deepSoil = Number((cur.soil_moisture_28_to_100cm ?? 0.30).toFixed(3));

    const avgVolumetric = (surface + rootZone + deepSoil) / 3;
    const meanPercent = Number((avgVolumetric * 100).toFixed(1));

    let droughtCategory: SoilMoistureProfileResult["droughtCategory"] = "Adequate";
    if (meanPercent < 15) droughtCategory = "Extremely Dry";
    else if (meanPercent < 25) droughtCategory = "Moderate Drought";
    else if (meanPercent > 45) droughtCategory = "Saturated / Wet";

    return {
      latitude: lat,
      longitude: lon,
      surfaceMoistureM3m3: surface,
      rootZoneMoistureM3m3: rootZone,
      deepSoilMoistureM3m3: deepSoil,
      meanMoisturePercent: meanPercent,
      droughtCategory,
      source: "ECMWF IFS High-Resolution Land Surface Model via Open-Meteo",
    };
  } catch (err) {
    console.warn("Failed to fetch soil moisture:", err);
    return null;
  }
}
