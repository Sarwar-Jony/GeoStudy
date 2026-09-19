export interface Suggestion {
  goal: string;
  recommendedLayers: string[];
  reasoning: string;
}

const RULES: Record<string, Suggestion> = {
  "flood risk": {
    goal: "Flood Risk Assessment",
    recommendedLayers: ["dem", "slope", "ndwi", "water_bodies", "lulc", "hillshade"],
    reasoning:
      "Elevation (DEM) and Slope identify low-lying, flat catchment areas prone to inundation. NDWI and the Water Bodies mask reveal existing surface water and drainage. LULC highlights impervious built-up zones with poor infiltration, and Hillshade helps visualize flow direction.",
  },
  "urban expansion": {
    goal: "Urban Expansion / Growth Monitoring",
    recommendedLayers: ["ndbi", "built_up_intensity", "night_lights", "population_density", "lulc", "ndvi"],
    reasoning:
      "NDBI and Built-up Intensity track impervious surface growth. Night-time Lights and Population Density proxy urban activity and densification. LULC vs NDVI shows conversion of vegetated/agricultural land into built-up areas over time.",
  },
  agriculture: {
    goal: "Agricultural / Crop Monitoring",
    recommendedLayers: ["ndvi", "savi", "evi", "ndmi", "lulc", "slope"],
    reasoning:
      "NDVI, SAVI and EVI quantify vegetation vigor and biomass while minimizing soil/background noise. NDMI tracks crop moisture stress. LULC isolates cropland extent, and Slope flags erosion-prone or difficult-to-irrigate fields.",
  },
  deforestation: {
    goal: "Deforestation / Forest Change",
    recommendedLayers: ["ndvi", "tree_cover", "lulc", "slope", "dem"],
    reasoning:
      "Tree Cover and NDVI are the primary vegetation-health indicators. LULC differentiates forest from cleared/agricultural land, while Slope and DEM highlight terrain accessible to logging or vulnerable to erosion after clearing.",
  },
  "water resources": {
    goal: "Water Resource Management",
    recommendedLayers: ["ndwi", "water_bodies", "ndmi", "dem", "slope", "curvature"],
    reasoning:
      "NDWI and the Water Bodies mask map surface water extent. NDMI adds soil/vegetation moisture context. DEM, Slope and Curvature define watershed boundaries and flow-accumulation-prone valleys.",
  },
  "landslide / disaster risk": {
    goal: "Landslide & Disaster Risk",
    recommendedLayers: ["slope", "aspect", "curvature", "dem", "hillshade", "lulc"],
    reasoning:
      "Slope and Curvature identify steep, unstable terrain. Aspect affects sun/rain exposure and vegetation stability. Hillshade supports visual terrain interpretation and LULC flags human settlements exposed to hazard zones.",
  },
  "urban heat island": {
    goal: "Urban Heat Island / Climate Study",
    recommendedLayers: ["ndbi", "built_up_intensity", "tree_cover", "ndvi", "night_lights"],
    reasoning:
      "Built-up Intensity/NDBI correlate with heat retention, while Tree Cover/NDVI show cooling vegetation. Night-time Lights approximate energy/urban activity intensity contributing to heat generation.",
  },
  biodiversity: {
    goal: "Biodiversity / Habitat Assessment",
    recommendedLayers: ["lulc", "ndvi", "tree_cover", "water_bodies", "slope"],
    reasoning:
      "LULC and Tree Cover map habitat types and fragmentation. NDVI indicates vegetation health/productivity. Water Bodies and Slope help identify wetlands and refugia less accessible to disturbance.",
  },
};

export function suggestLayers(goalText: string): Suggestion {
  const q = goalText.toLowerCase();
  for (const [key, suggestion] of Object.entries(RULES)) {
    if (q.includes(key) || key.split(" / ").some((k) => q.includes(k))) {
      return suggestion;
    }
  }
  const keywordMap: [string[], keyof typeof RULES][] = [
    [["flood", "inundation", "rain"], "flood risk"],
    [["urban", "city growth", "sprawl", "expansion"], "urban expansion"],
    [["crop", "farm", "irrigation", "agri"], "agriculture"],
    [["forest", "logging", "tree loss"], "deforestation"],
    [["water", "river", "watershed", "reservoir"], "water resources"],
    [["landslide", "slope failure", "disaster", "hazard"], "landslide / disaster risk"],
    [["heat", "temperature", "climate"], "urban heat island"],
    [["biodiversity", "habitat", "wildlife", "ecology"], "biodiversity"],
  ];
  for (const [keywords, ruleKey] of keywordMap) {
    if (keywords.some((k) => q.includes(k))) return RULES[ruleKey];
  }

  return {
    goal: goalText || "General Study Area Analysis",
    recommendedLayers: ["dem", "slope", "ndvi", "lulc", "hillshade"],
    reasoning:
      "A balanced general-purpose starter set: terrain context (DEM, Slope, Hillshade), vegetation status (NDVI) and land cover classification (LULC). Tell the assistant your specific goal (e.g. 'flood risk', 'urban expansion', 'agriculture') for a tailored recommendation.",
  };
}

/** Optional live-LLM upgrade path: if GEMINI_API_KEY is configured, ask Gemini
 * to refine the rule-based suggestion; otherwise the rule engine above is used
 * directly (fully offline, no external key required). */
export async function getAiSuggestion(goalText: string): Promise<Suggestion & { source: "gemini" | "rules" }> {
  const base = suggestLayers(goalText);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ...base, source: "rules" };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `A GIS analyst wants to study: "${goalText}". From this raster layer catalog: dem, dsm, elevation, slope, aspect, hillshade, curvature, ndvi, ndwi, ndbi, ndmi, savi, evi, lulc, population_density, night_lights, built_up_intensity, tree_cover, water_bodies. Reply ONLY with strict JSON: {"recommendedLayers": string[], "reasoning": string} choosing 4-7 of the most relevant layer keys.`,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) return { ...base, source: "rules" };
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ...base, source: "rules" };
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { ...base, source: "rules" };
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.recommendedLayers) && parsed.recommendedLayers.length > 0) {
      return {
        goal: goalText,
        recommendedLayers: parsed.recommendedLayers,
        reasoning: parsed.reasoning || base.reasoning,
        source: "gemini",
      };
    }
    return { ...base, source: "rules" };
  } catch {
    return { ...base, source: "rules" };
  }
}
