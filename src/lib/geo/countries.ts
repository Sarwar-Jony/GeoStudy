import worldCountries from "world-countries";

export interface CountryOption {
  iso3: string;
  name: string;
  region: string;
  flag: string;
  levelNames: string[]; // names for ADM1..ADM4 (as many as commonly meaningful)
}

// Custom, planner-friendly admin level naming for a curated set of countries.
// Any country not listed here falls back to generic "Level 1..4" naming -
// the geoBoundaries API still supplies the real polygons for ANY ISO3 code.
const LEVEL_NAME_OVERRIDES: Record<string, string[]> = {
  BGD: ["Division", "District", "Upazila / Thana", "Union / Ward"],
  IND: ["State", "District", "Sub-District (Tehsil)", "Village / Town"],
  PAK: ["Province", "District", "Tehsil", "Union Council"],
  NPL: ["Province", "District", "Municipality", "Ward"],
  USA: ["State", "County", "County Subdivision", "Place"],
  GBR: ["Region", "County", "District", "Ward"],
  CAN: ["Province / Territory", "Census Division", "Census Subdivision", "Locality"],
  AUS: ["State / Territory", "Statistical Area 4", "Statistical Area 3", "Suburb"],
  FRA: ["Region", "Department", "Arrondissement", "Commune"],
  DEU: ["State (Land)", "District (Kreis)", "Municipality Association", "Municipality"],
  IDN: ["Province", "Regency / City", "District", "Village"],
  NGA: ["State", "LGA", "Ward", "Settlement"],
  KEN: ["County", "Sub-County", "Ward", "Locality"],
  BRA: ["State", "Meso-Region", "Micro-Region", "Municipality"],
  CHN: ["Province", "Prefecture", "County", "Township"],
  MMR: ["Region / State", "District", "Township", "Ward / Village Tract"],
  LKA: ["Province", "District", "DS Division", "GN Division"],
  PHL: ["Region", "Province", "Municipality / City", "Barangay"],
  VNM: ["Province", "District", "Commune / Ward", "Village"],
  THA: ["Province", "District", "Sub-District", "Village"],
  EGY: ["Governorate", "District", "City / Markaz", "Village"],
  ZAF: ["Province", "District Municipality", "Local Municipality", "Ward"],
};

const GENERIC_LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4"];

const isoToFlag = (iso2: string) =>
  iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

export const COUNTRIES: CountryOption[] = worldCountries
  .filter((c) => c.independent !== false || c.unMember)
  .map((c) => ({
    iso3: c.cca3,
    name: c.name.common,
    region: c.region || "Other",
    flag: isoToFlag(c.cca2),
    levelNames: LEVEL_NAME_OVERRIDES[c.cca3] ?? GENERIC_LEVELS,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY_ISO3 = "BGD";

export function getCountry(iso3: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.iso3 === iso3.toUpperCase());
}

export function levelName(iso3: string, level: number): string {
  if (level === 0) return "Country";
  const c = getCountry(iso3);
  const names = c?.levelNames ?? GENERIC_LEVELS;
  return names[level - 1] ?? `Level ${level}`;
}
