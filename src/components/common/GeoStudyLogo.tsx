"use client";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * GeoStudyLogo — Concept 1: The Isometric Layer Stack & Satellite Terrain
 * Represents 3 geospatial analysis planes:
 * 1. Bottom: Topographic Surface & Elevation Base (DEM)
 * 2. Middle: Vector AOI & Boundary Matrix (Infrastructure/Grid)
 * 3. Top: Satellite Remote Sensing & Spectral Scanner (Multispectral/NDVI)
 */
export function GeoStudyLogo({ className = "h-8 w-8", size }: LogoProps) {
  const width = size || undefined;
  const height = size || undefined;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
      aria-label="GeoStudy Logo"
    >
      <defs>
        {/* Top Layer Gradient: Vivid Emerald to Cyan */}
        <linearGradient id="gsl-top" x1="6" y1="12" x2="42" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Middle Layer Gradient: Tech Cyan to Slate */}
        <linearGradient id="gsl-mid" x1="6" y1="20" x2="42" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.7" />
        </linearGradient>

        {/* Bottom Layer Gradient: Topographic Deep Slate/Emerald */}
        <linearGradient id="gsl-bot" x1="6" y1="28" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
        </linearGradient>

        {/* Center Target Glow Filter */}
        <filter id="gsl-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Layer 3 (Bottom): Topographic / DEM Surface Layer */}
      <g opacity="0.65">
        <polygon
          points="24,31 42,21 24,14 6,21"
          transform="translate(0, 12)"
          fill="url(#gsl-bot)"
          stroke="#10b981"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Subtle contour lines on bottom layer */}
        <path
          d="M12 36 C18 33, 30 39, 36 33"
          stroke="#34d399"
          strokeWidth="0.8"
          strokeOpacity="0.5"
          fill="none"
        />
      </g>

      {/* Layer 2 (Middle): Vector AOI / Infrastructure Grid */}
      <g opacity="0.85">
        <polygon
          points="24,31 42,21 24,14 6,21"
          transform="translate(0, 6)"
          fill="url(#gsl-mid)"
          stroke="#38bdf8"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Crosshair grid lines */}
        <line x1="15" y1="24" x2="33" y2="30" stroke="#bae6fd" strokeWidth="0.9" strokeDasharray="1.5 2" />
        <line x1="33" y1="24" x2="15" y2="30" stroke="#bae6fd" strokeWidth="0.9" strokeDasharray="1.5 2" />
      </g>

      {/* Vertical Inter-Layer Geospatial Coordinates (Guide Beams) */}
      <line x1="6" y1="15" x2="6" y2="33" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="2 2" />
      <line x1="42" y1="15" x2="42" y2="33" stroke="#0ea5e9" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="2 2" />
      <line x1="24" y1="8" x2="24" y2="26" stroke="#38bdf8" strokeWidth="0.9" strokeOpacity="0.5" strokeDasharray="1 2" />

      {/* Layer 1 (Top): Active Satellite Scanning / Remote Sensing Band */}
      <polygon
        points="24,25 42,15 24,8 6,15"
        fill="url(#gsl-top)"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* AOI Bounding Target & Scan Aperture on Top Plate */}
      <polygon
        points="24,19 33,14 24,10.5 15,14"
        fill="#ffffff"
        fillOpacity="0.28"
        stroke="#ffffff"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Active Satellite Focal Point (Pulsing Target) */}
      <circle cx="24" cy="14" r="2.8" fill="#facc15" filter="url(#gsl-glow)" />
      <circle cx="24" cy="14" r="1.3" fill="#ffffff" />
    </svg>
  );
}

/**
 * Complete Brand Lockup (Logo Icon + Geometric Modern Wordmark)
 */
export function GeoStudyBrand({
  className = "",
  showBadge = true,
}: {
  className?: string;
  showBadge?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Hexagonal Isometric Logo Icon */}
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900/80 p-1 shadow-md ring-1 ring-emerald-500/25 dark:bg-slate-900/90 dark:ring-emerald-400/30">
        <GeoStudyLogo className="h-full w-full" />
      </div>

      {/* Typography: GeoStudy + Micro Tag */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white">
          Geo<span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">Study</span>
        </span>
        {showBadge && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
            GIS
          </span>
        )}
      </div>
    </div>
  );
}
