/**
 * Real Climate & Weather Provider using Open-Meteo Historical Climate API
 * 100% Free - No API key or credit card required.
 */

export interface MonthlyClimateRecord {
  month: string; // "YYYY-MM"
  precipSumMm: number;
  tempMaxAvg: number;
  tempMinAvg: number;
  tempMeanAvg: number;
}

export interface ClimateSummaryResult {
  latitude: number;
  longitude: number;
  elevationMeters: number;
  dateRange: { start: string; end: string };
  annualPrecipitationMm: number;
  meanTemperatureC: number;
  maxTemperatureC: number;
  minTemperatureC: number;
  wettestMonth: { month: string; precipMm: number };
  driestMonth: { month: string; precipMm: number };
  hottestMonth: { month: string; tempC: number };
  coldestMonth: { month: string; tempC: number };
  monthlyData: MonthlyClimateRecord[];
  source: string;
}

export async function fetchStudyAreaClimate(
  bbox: [number, number, number, number]
): Promise<ClimateSummaryResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lat = Number(((minLat + maxLat) / 2).toFixed(4));
  const lon = Number(((minLng + maxLng) / 2).toFixed(4));

  // Determine a 12-month period for complete seasonal coverage
  const today = new Date();
  const endDateObj = new Date(today);
  endDateObj.setDate(endDateObj.getDate() - 5); // Archive API is up to ~5 days ago
  const startDateObj = new Date(endDateObj);
  startDateObj.setFullYear(startDateObj.getFullYear() - 1);

  const startDate = startDateObj.toISOString().split("T")[0];
  const endDate = endDateObj.toISOString().split("T")[0];

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GeoStudyAreaAnalyzer/1.0",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Open-Meteo archive returned status ${res.status}`);
      return null;
    }

    const json = await res.json();
    const daily = json.daily;
    if (!daily || !daily.time || daily.time.length === 0) return null;

    const times: string[] = daily.time;
    const precip: number[] = daily.precipitation_sum || [];
    const tmax: number[] = daily.temperature_2m_max || [];
    const tmin: number[] = daily.temperature_2m_min || [];
    const tmean: number[] = daily.temperature_2m_mean || [];

    // Aggregate by month (YYYY-MM)
    const monthMap = new Map<
      string,
      { precip: number[]; tmax: number[]; tmin: number[]; tmean: number[] }
    >();

    let totalPrecip = 0;
    let absoluteMax = -Infinity;
    let absoluteMin = Infinity;
    let sumMean = 0;
    let countMean = 0;

    for (let i = 0; i < times.length; i++) {
      const ym = times[i].slice(0, 7);
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { precip: [], tmax: [], tmin: [], tmean: [] });
      }
      const entry = monthMap.get(ym)!;

      const p = precip[i] ?? 0;
      const tx = tmax[i] ?? 0;
      const tn = tmin[i] ?? 0;
      const tm = tmean[i] ?? (tx + tn) / 2;

      entry.precip.push(p);
      entry.tmax.push(tx);
      entry.tmin.push(tn);
      entry.tmean.push(tm);

      totalPrecip += p;
      if (tx > absoluteMax) absoluteMax = tx;
      if (tn < absoluteMin) absoluteMin = tn;
      sumMean += tm;
      countMean++;
    }

    const monthlyData: MonthlyClimateRecord[] = [];
    let wettest = { month: "", precipMm: -Infinity };
    let driest = { month: "", precipMm: Infinity };
    let hottest = { month: "", tempC: -Infinity };
    let coldest = { month: "", tempC: Infinity };

    for (const [m, vals] of monthMap.entries()) {
      const mPrecip = Number(vals.precip.reduce((a, b) => a + b, 0).toFixed(1));
      const mMax = Number((vals.tmax.reduce((a, b) => a + b, 0) / vals.tmax.length).toFixed(1));
      const mMin = Number((vals.tmin.reduce((a, b) => a + b, 0) / vals.tmin.length).toFixed(1));
      const mMean = Number((vals.tmean.reduce((a, b) => a + b, 0) / vals.tmean.length).toFixed(1));

      monthlyData.push({
        month: m,
        precipSumMm: mPrecip,
        tempMaxAvg: mMax,
        tempMinAvg: mMin,
        tempMeanAvg: mMean,
      });

      if (mPrecip > wettest.precipMm) wettest = { month: m, precipMm: mPrecip };
      if (mPrecip < driest.precipMm) driest = { month: m, precipMm: mPrecip };
      if (mMean > hottest.tempC) hottest = { month: m, tempC: mMean };
      if (mMean < coldest.tempC) coldest = { month: m, tempC: mMean };
    }

    // Sort chronologically
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    return {
      latitude: lat,
      longitude: lon,
      elevationMeters: json.elevation ?? 0,
      dateRange: { start: startDate, end: endDate },
      annualPrecipitationMm: Number(totalPrecip.toFixed(1)),
      meanTemperatureC: Number((sumMean / Math.max(1, countMean)).toFixed(1)),
      maxTemperatureC: Number(absoluteMax.toFixed(1)),
      minTemperatureC: Number(absoluteMin.toFixed(1)),
      wettestMonth: wettest,
      driestMonth: driest,
      hottestMonth: hottest,
      coldestMonth: coldest,
      monthlyData,
      source: "Open-Meteo Climate Archive (ECMWF ERA5 reanalysis)",
    };
  } catch (err) {
    console.warn("Failed to fetch climate from Open-Meteo:", err);
    return null;
  }
}
