/**
 * Vector, Disaster and Climate layer preview SVG thumbnail generators
 */

export function createRoadsThumbnailSvg(roadCount: number, totalLengthKm: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#0f172a" rx="12"/>
    <path d="M10 140 Q 60 100, 80 80 T 150 20" stroke="#f59e0b" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M20 30 Q 70 60, 100 90 T 140 150" stroke="#38bdf8" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M80 155 L 80 5" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,6" fill="none"/>
    <circle cx="80" cy="80" r="6" fill="#10b981"/>
    <text x="80" y="148" font-family="sans-serif" font-size="11" font-weight="bold" fill="#f8fafc" text-anchor="middle">OSM Roads (${roadCount})</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createWaterwaysThumbnailSvg(waterwayCount: number, totalLengthKm: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#03254c" rx="12"/>
    <path d="M0 50 Q 40 20, 80 50 T 160 50" stroke="#0096c7" stroke-width="8" fill="none"/>
    <path d="M0 90 Q 50 120, 100 85 T 160 110" stroke="#48cae4" stroke-width="6" fill="none"/>
    <path d="M30 0 Q 70 70, 120 160" stroke="#90e0ef" stroke-width="4" fill="none"/>
    <text x="80" y="148" font-family="sans-serif" font-size="11" font-weight="bold" fill="#caf0f8" text-anchor="middle">Rivers &amp; Canals (${waterwayCount})</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createClimateThumbnailSvg(annualPrecipMm: number, meanTempC: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#064e3b" rx="12"/>
    <rect x="20" y="100" width="14" height="35" rx="3" fill="#34d399"/>
    <rect x="42" y="80" width="14" height="55" rx="3" fill="#34d399"/>
    <rect x="64" y="45" width="14" height="90" rx="3" fill="#10b981"/>
    <rect x="86" y="30" width="14" height="105" rx="3" fill="#059669"/>
    <rect x="108" y="60" width="14" height="75" rx="3" fill="#34d399"/>
    <rect x="130" y="95" width="14" height="40" rx="3" fill="#34d399"/>
    <circle cx="130" cy="30" r="14" fill="#fbbf24"/>
    <text x="80" y="150" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ecfdf5" text-anchor="middle">${annualPrecipMm}mm · ${meanTempC}°C</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createFloodThumbnailSvg(peakDischargeM3s: number, riskLevel: string): string {
  const riskColor = riskLevel === "Severe" ? "#ef4444" : riskLevel === "High" ? "#f97316" : riskLevel === "Moderate" ? "#eab308" : "#0284c7";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#082f49" rx="12"/>
    <path d="M10 110 Q 40 80, 70 95 T 130 50 T 150 70" stroke="${riskColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M10 110 Q 40 80, 70 95 T 130 50 T 150 70 L 150 140 L 10 140 Z" fill="${riskColor}33"/>
    <circle cx="130" cy="50" r="6" fill="${riskColor}"/>
    <text x="80" y="35" font-family="sans-serif" font-size="12" font-weight="extrabold" fill="#f0f9ff" text-anchor="middle">GloFAS Flood Risk</text>
    <text x="80" y="148" font-family="sans-serif" font-size="10" font-weight="bold" fill="#e0f2fe" text-anchor="middle">Peak: ${peakDischargeM3s} m³/s (${riskLevel})</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createAirQualityThumbnailSvg(aqi: number, category: string): string {
  const color = aqi > 60 ? "#ef4444" : aqi > 40 ? "#f59e0b" : "#10b981";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#1e1b4b" rx="12"/>
    <circle cx="80" cy="70" r="42" fill="none" stroke="#312e81" stroke-width="12"/>
    <circle cx="80" cy="70" r="42" fill="none" stroke="${color}" stroke-width="12" stroke-dasharray="264" stroke-dashoffset="${Math.max(20, 264 - (aqi / 100) * 264)}" stroke-linecap="round"/>
    <text x="80" y="76" font-family="sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">${aqi}</text>
    <text x="80" y="125" font-family="sans-serif" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle">${category} AQI</text>
    <text x="80" y="148" font-family="sans-serif" font-size="9" fill="#a5b4fc" text-anchor="middle">CAMS European Index</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createSoilMoistureThumbnailSvg(moisturePercent: number, category: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#2e1065" rx="12"/>
    <rect x="25" y="40" width="110" height="24" rx="4" fill="#6d28d9" opacity="0.4"/>
    <rect x="25" y="40" width="${Math.min(110, (moisturePercent / 100) * 110)}" height="24" rx="4" fill="#a855f7"/>
    <text x="80" y="56" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">0-7cm Surface: ${moisturePercent}%</text>
    <rect x="25" y="70" width="110" height="24" rx="4" fill="#581c87" opacity="0.5"/>
    <rect x="25" y="70" width="${Math.min(110, (moisturePercent / 100) * 105)}" height="24" rx="4" fill="#9333ea"/>
    <text x="80" y="86" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">7-28cm Root Zone</text>
    <text x="80" y="122" font-family="sans-serif" font-size="11" font-weight="bold" fill="#c084fc" text-anchor="middle">${category}</text>
    <text x="80" y="148" font-family="sans-serif" font-size="9" fill="#e9d5ff" text-anchor="middle">Volumetric Profile (ECMWF)</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createEarthquakesThumbnailSvg(count: number, maxMag: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#450a0a" rx="12"/>
    <circle cx="80" cy="70" r="35" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,4"/>
    <circle cx="80" cy="70" r="22" fill="none" stroke="#ef4444" stroke-width="3"/>
    <circle cx="80" cy="70" r="8" fill="#f87171"/>
    <text x="80" y="30" font-family="sans-serif" font-size="11" font-weight="extrabold" fill="#fecaca" text-anchor="middle">USGS Earthquakes</text>
    <text x="80" y="125" font-family="sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">Max M${maxMag}</text>
    <text x="80" y="146" font-family="sans-serif" font-size="10" fill="#fca5a5" text-anchor="middle">${count} Events in Catalog</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createFiresThumbnailSvg(fireCount: number, maxFrp: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#431407" rx="12"/>
    <path d="M80 30 Q 95 60, 110 80 Q 120 105, 95 120 Q 80 130, 65 120 Q 40 105, 55 75 Q 70 85, 80 30 Z" fill="#ea580c"/>
    <path d="M80 65 Q 90 85, 95 95 Q 100 110, 85 115 Q 75 120, 68 115 Q 55 105, 65 85 Z" fill="#facc15"/>
    <text x="80" y="25" font-family="sans-serif" font-size="10" font-weight="bold" fill="#fed7aa" text-anchor="middle">NASA FIRMS Fires</text>
    <text x="80" y="148" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffedd5" text-anchor="middle">${fireCount} Hotspots · ${maxFrp} MW</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function createFacilitiesThumbnailSvg(total: number, health: number, education: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#042f2e" rx="12"/>
    <circle cx="50" cy="65" r="20" fill="#0d9488"/>
    <path d="M50 55 L 50 75 M 40 65 L 60 65" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="110" cy="65" r="20" fill="#0284c7"/>
    <circle cx="110" cy="65" r="8" fill="#ffffff"/>
    <text x="80" y="28" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ccfbf1" text-anchor="middle">OSM Infrastructure</text>
    <text x="80" y="115" font-family="sans-serif" font-size="11" font-weight="extrabold" fill="#ffffff" text-anchor="middle">${total} Facilities</text>
    <text x="80" y="146" font-family="sans-serif" font-size="9" fill="#99f6e4" text-anchor="middle">${health} Health · ${education} Education</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
