import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Official European Space Agency (ESA) & Copernicus Sentinel Program Logo
 */
export function CopernicusLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Copernicus ESA Logo"
    >
      <circle cx="20" cy="20" r="16" fill="#003399" />
      {/* EU golden star ring snippet / orbit */}
      <path
        d="M20 7 C27.18 7 33 12.82 33 20 C33 27.18 27.18 33 20 33 C12.82 33 7 27.18 7 20"
        stroke="#FFCC00"
        strokeWidth="2.2"
        strokeDasharray="3 2"
      />
      {/* Central satellite eye */}
      <circle cx="20" cy="20" r="5" fill="#FFCC00" />
      <circle cx="20" cy="20" r="2.5" fill="#003399" />
      <path
        d="M12 20 L28 20 M20 12 L20 28"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Typography */}
      <text
        x="42"
        y="18"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.08em"
        fill="currentColor"
      >
        COPERNICUS
      </text>
      <text
        x="42"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.04em"
        fill="#0099FF"
      >
        ESA EARTH OBSERVATION
      </text>
    </svg>
  );
}

/**
 * Official NASA Insignia (Meatball) Vector
 */
export function NasaLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NASA Logo"
    >
      <g transform="translate(4, 2)">
        {/* Blue sphere */}
        <circle cx="18" cy="18" r="17" fill="#0B3D91" />
        {/* Stars */}
        <circle cx="9" cy="11" r="0.9" fill="#FFFFFF" />
        <circle cx="13" cy="7" r="0.7" fill="#FFFFFF" />
        <circle cx="25" cy="8" r="1" fill="#FFFFFF" />
        <circle cx="28" cy="13" r="0.8" fill="#FFFFFF" />
        <circle cx="10" cy="24" r="0.8" fill="#FFFFFF" />
        <circle cx="27" cy="25" r="0.9" fill="#FFFFFF" />
        {/* White orbit oval */}
        <ellipse
          cx="18"
          cy="18"
          rx="15"
          ry="6"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          transform="rotate(-28 18 18)"
        />
        {/* Red supersonic vector chevron */}
        <path
          d="M6 22 L20 7 L24 16 L33 9 L23 29 Z"
          fill="#FC3D21"
          opacity="0.95"
        />
        {/* NASA serif text */}
        <text
          x="18"
          y="23"
          textAnchor="middle"
          fontFamily="serif, 'Times New Roman'"
          fontSize="10"
          fontWeight="900"
          letterSpacing="0.05em"
          fill="#FFFFFF"
        >
          NASA
        </text>
      </g>
      <text
        x="44"
        y="18"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.08em"
        fill="currentColor"
      >
        NASA
      </text>
      <text
        x="44"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.04em"
        fill="#FC3D21"
      >
        EARTHDATA &amp; FIRMS
      </text>
    </svg>
  );
}

/**
 * Google Earth Engine (GEE) Vector
 */
export function GoogleEarthEngineLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 130 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Google Earth Engine Logo"
    >
      <g transform="translate(4, 6)">
        {/* Earth globe with latitude/longitude lines */}
        <circle cx="14" cy="14" r="13" fill="#1A73E8" />
        {/* Continents / eco patch */}
        <path
          d="M7 11 Q12 7 16 12 Q20 17 23 15 Q26 18 24 23 Q18 27 10 24 Q5 19 7 11 Z"
          fill="#34A853"
        />
        {/* Longitude ellipse */}
        <ellipse
          cx="14"
          cy="14"
          rx="6"
          ry="13"
          stroke="#FFFFFF"
          strokeWidth="0.9"
          fill="none"
          opacity="0.6"
        />
        <line
          x1="1"
          y1="14"
          x2="27"
          y2="14"
          stroke="#FFFFFF"
          strokeWidth="0.9"
          opacity="0.6"
        />
        {/* Small Google 4-color radar beam dot */}
        <circle cx="21" cy="7" r="3.5" fill="#EA4335" stroke="#FFFFFF" strokeWidth="1" />
      </g>
      <text
        x="40"
        y="17"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.04em"
        fill="currentColor"
      >
        Google
      </text>
      <text
        x="40"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="9"
        fontWeight="700"
        letterSpacing="0.02em"
        fill="#34A853"
      >
        Earth Engine
      </text>
    </svg>
  );
}

/**
 * United States Geological Survey (USGS) Logo
 */
export function UsgsLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="USGS Logo"
    >
      <g transform="translate(4, 5)">
        {/* USGS deep forest green rounded emblem */}
        <rect x="0" y="0" width="28" height="28" rx="6" fill="#006633" />
        <path
          d="M5 8 L10 8 C12 8 13 9 13 11 C13 13 11 14 9 14 L5 14 Z M5 14 L11 20"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Topographic contour wave */}
        <path
          d="M14 18 Q19 12 24 16"
          stroke="#78BE20"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="21" cy="9" r="2" fill="#78BE20" />
      </g>
      <text
        x="38"
        y="18"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="900"
        letterSpacing="0.08em"
        fill="currentColor"
      >
        USGS
      </text>
      <text
        x="38"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.03em"
        fill="#008844"
      >
        SEISMIC &amp; TOPO
      </text>
    </svg>
  );
}

/**
 * European Centre for Medium-Range Weather Forecasts (ECMWF) / Open-Meteo
 */
export function EcmwfLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 115 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ECMWF Logo"
    >
      <g transform="translate(4, 6)">
        {/* Atmosphere / meteorological isobar circle */}
        <circle cx="14" cy="14" r="13" fill="#0284C7" />
        {/* Isobar wavy curves */}
        <path
          d="M4 14 Q9 8 14 14 T24 14"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M6 19 Q11 13 16 19 T22 19"
          stroke="#38BDF8"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M7 9 Q12 5 17 9"
          stroke="#BAE6FD"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      <text
        x="38"
        y="17"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.05em"
        fill="currentColor"
      >
        ECMWF
      </text>
      <text
        x="38"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.03em"
        fill="#0284C7"
      >
        OPEN-METEO / CAMS
      </text>
    </svg>
  );
}

/**
 * OpenStreetMap (OSM) Official Logo Vector
 */
export function OsmLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OpenStreetMap Logo"
    >
      <g transform="translate(4, 6)">
        {/* Rounded map background */}
        <rect x="0" y="0" width="28" height="28" rx="6" fill="#78BE20" />
        {/* Road vector lines */}
        <path
          d="M3 8 L25 20 M3 22 L22 6"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Magnifying glass */}
        <circle
          cx="17"
          cy="12"
          r="6"
          fill="#3388FF"
          stroke="#FFFFFF"
          strokeWidth="1.8"
        />
        <line
          x1="21"
          y1="16"
          x2="26"
          y2="22"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="17" cy="12" r="2.5" fill="#FFFFFF" />
      </g>
      <text
        x="39"
        y="17"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="10"
        fontWeight="800"
        letterSpacing="0.02em"
        fill="currentColor"
      >
        OpenStreetMap
      </text>
      <text
        x="39"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.03em"
        fill="#78BE20"
      >
        OVERPASS INFRA
      </text>
    </svg>
  );
}

/**
 * Neon Postgres Official Vector Logo
 */
export function NeonLogo({ className = "h-6 w-auto", size = 24 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 95 40"
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Neon Database Logo"
    >
      <g transform="translate(4, 6)">
        {/* Neon green isometric glowing prism */}
        <path
          d="M14 0 L28 8 L28 20 L14 28 L0 20 L0 8 Z"
          fill="#00E599"
          opacity="0.9"
        />
        <path
          d="M14 0 L28 8 L14 15 L0 8 Z"
          fill="#00FFB2"
        />
        <path
          d="M0 8 L14 15 L14 28 L0 20 Z"
          fill="#00B377"
        />
        <path
          d="M28 8 L14 15 L14 28 L28 20 Z"
          fill="#008055"
        />
        {/* Database cylinder lines */}
        <ellipse cx="14" cy="9" rx="6" ry="2" fill="#051C14" opacity="0.6" />
      </g>
      <text
        x="37"
        y="18"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="900"
        letterSpacing="0.06em"
        fill="currentColor"
      >
        NEON
      </text>
      <text
        x="37"
        y="28"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="700"
        letterSpacing="0.05em"
        fill="#00E599"
      >
        LAKEBASE POSTGRES
      </text>
    </svg>
  );
}

/**
 * Product & Analysis Domain Logos
 */
export function SentinelBadge({ className = "h-5 w-auto" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      </svg>
      Sentinel-2 MSI
    </span>
  );
}

export function GlofasBadge({ className = "h-5 w-auto" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20 ${className}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12c.5-1.5 2-2 3.5-2s3 .5 4 2 2.5 2 4 2 3-.5 4-2 2.5-2 4.5-2" />
        <path d="M2 17c.5-1.5 2-2 3.5-2s3 .5 4 2 2.5 2 4 2 3-.5 4-2 2.5-2 4.5-2" />
      </svg>
      GloFAS River
    </span>
  );
}

export function CamsBadge({ className = "h-5 w-auto" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-teal-500/10 px-2 py-0.5 text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20 ${className}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </svg>
      CAMS Atmosphere
    </span>
  );
}
