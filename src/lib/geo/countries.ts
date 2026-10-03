import worldCountries from "world-countries";

export interface CountryOption {
  iso3: string;
  name: string;
  region: string;
  flag: string;
  levelNames: string[]; // names for ADM1..ADM4 (as many as commonly meaningful)
}

// Custom, planner-friendly admin level naming for a curated set of countries.
// Matched to actual administrative levels provided in GADM datasets.
const LEVEL_NAME_OVERRIDES: Record<string, string[]> = {
  BGD: ["Division", "District", "Upazila / Thana", "Union / Ward"],
  IND: ["State", "District", "Sub-District (Tehsil)"],
  PAK: ["Province", "District", "Tehsil"],
  NPL: ["Province", "District", "Municipality"],
  USA: ["State", "County"],
  CAN: ["Province / Territory", "Census Division"],
  GBR: ["Region", "County", "District"],
  AUS: ["State / Territory", "Statistical Area"],
  FRA: ["Region", "Department", "Arrondissement"],
  DEU: ["State (Land)", "District (Kreis)", "Municipality Association"],
  IDN: ["Province", "Regency / City", "District"],
  NGA: ["State", "LGA", "Ward"],
  KEN: ["County", "Sub-County", "Ward"],
  BRA: ["State", "Meso-Region", "Micro-Region"],
  CHN: ["Province", "Prefecture", "County"],
  MMR: ["Region / State", "District", "Township"],
  LKA: ["Province", "District", "DS Division"],
  PHL: ["Region", "Province", "Municipality / City"],
  VNM: ["Province", "District", "Commune / Ward"],
  THA: ["Province", "District", "Sub-District"],
  EGY: ["Governorate", "District", "City / Markaz"],
  ZAF: ["Province", "District Municipality", "Local Municipality"],
};

export const COUNTRY_MAX_LEVELS: Record<string, number> = {
  BGD: 4,
  IND: 3,
  PAK: 3,
  NPL: 3,
  USA: 2,
  CAN: 2,
  GBR: 3,
  AUS: 2,
  FRA: 3,
  DEU: 3,
  IDN: 3,
  NGA: 3,
  KEN: 3,
  BRA: 3,
  CHN: 3,
  MMR: 3,
  LKA: 3,
  PHL: 3,
  VNM: 3,
  THA: 3,
  EGY: 3,
  ZAF: 3,
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
