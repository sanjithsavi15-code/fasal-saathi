/**
 * Weather-Driven Spread Projection Engine
 *
 * Generates a predictive dispersion polygon on the map based on
 * real-time weather metrics (temperature, humidity, wind speed/direction)
 * and the detected disease profile.
 *
 * The model uses a simplified Gaussian-plume approach:
 *  - Wind direction determines the primary axis of spread
 *  - Wind speed scales the downwind reach
 *  - Temperature & humidity modulate the effective spread radius
 *    (pathogens thrive in warm, humid conditions)
 *  - Disease-specific parameters tune the wind influence factor
 */

import type { LatLngTuple } from "leaflet";

/* ═══════════════════════════════════════════════════════════════════════════
 *  Disease-specific tuning parameters
 * ═══════════════════════════════════════════════════════════════════════════ */

interface DiseaseSpreadProfile {
  /** How sensitive this pathogen's spread is to wind (0–1) */
  windInfluence: number;
  /** Optimal temperature range [min, max] in °C */
  optimalTempRange: [number, number];
  /** Humidity % above which spread accelerates */
  criticalHumidity: number;
  /** Base radius in km (at neutral conditions) */
  baseRadiusKm: number;
  /** Risk label */
  riskLabel: string;
  /** Color for the overlay polygon */
  color: string;
}

const DISEASE_PROFILES: Record<string, DiseaseSpreadProfile> = {
  // Sugarcane diseases
  red_rot: {
    windInfluence: 0.3,
    optimalTempRange: [25, 32],
    criticalHumidity: 80,
    baseRadiusKm: 1.2,
    riskLabel: "Red Rot spread zone",
    color: "#dc2626",
  },
  smut: {
    windInfluence: 0.85,
    optimalTempRange: [25, 35],
    criticalHumidity: 70,
    baseRadiusKm: 2.0,
    riskLabel: "Smut spore dispersal",
    color: "#7c3aed",
  },
  wilt: {
    windInfluence: 0.1,
    optimalTempRange: [28, 35],
    criticalHumidity: 75,
    baseRadiusKm: 0.8,
    riskLabel: "Wilt spread zone",
    color: "#b45309",
  },
  rust: {
    windInfluence: 0.9,
    optimalTempRange: [20, 28],
    criticalHumidity: 85,
    baseRadiusKm: 2.5,
    riskLabel: "Rust urediniospore dispersal",
    color: "#ea580c",
  },
  // General crop diseases
  late_blight: {
    windInfluence: 0.7,
    optimalTempRange: [15, 22],
    criticalHumidity: 90,
    baseRadiusKm: 2.0,
    riskLabel: "Late Blight sporangia dispersal",
    color: "#6d28d9",
  },
  early_blight: {
    windInfluence: 0.5,
    optimalTempRange: [24, 30],
    criticalHumidity: 80,
    baseRadiusKm: 1.5,
    riskLabel: "Early Blight spread zone",
    color: "#b45309",
  },
  powdery_mildew: {
    windInfluence: 0.8,
    optimalTempRange: [20, 27],
    criticalHumidity: 60,
    baseRadiusKm: 1.8,
    riskLabel: "Powdery Mildew conidiospore zone",
    color: "#9ca3af",
  },
  bacterial_wilt: {
    windInfluence: 0.1,
    optimalTempRange: [25, 35],
    criticalHumidity: 75,
    baseRadiusKm: 0.6,
    riskLabel: "Bacterial Wilt soil spread",
    color: "#92400e",
  },
  mosaic_disease: {
    windInfluence: 0.4,
    optimalTempRange: [25, 35],
    criticalHumidity: 65,
    baseRadiusKm: 1.0,
    riskLabel: "Mosaic Disease vector zone",
    color: "#15803d",
  },
  anthracnose: {
    windInfluence: 0.6,
    optimalTempRange: [22, 30],
    criticalHumidity: 85,
    baseRadiusKm: 1.4,
    riskLabel: "Anthracnose dispersal zone",
    color: "#c2410c",
  },
};

/** Fallback profile for diseases not in the lookup table */
const DEFAULT_PROFILE: DiseaseSpreadProfile = {
  windInfluence: 0.5,
  optimalTempRange: [22, 30],
  criticalHumidity: 75,
  baseRadiusKm: 1.5,
  riskLabel: "Predicted disease spread",
  color: "#b85d38",
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Weather inputs
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface WeatherMetrics {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Result
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface SpreadProjection {
  /** Leaflet-compatible polygon ring */
  polygon: LatLngTuple[];
  /** Human-readable label */
  label: string;
  /** Hex color for overlay */
  color: string;
  /** Fill opacity (0–1) */
  fillOpacity: number;
  /** Effective radius in km (before directional stretch) */
  effectiveRadiusKm: number;
  /** Risk classification */
  riskLevel: "critical" | "high" | "moderate" | "low";
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Math helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Score how well the current temperature fits the disease's optimal range.
 * Returns 1.0 inside the range, exponential decay outside.
 */
function tempFactor(tempC: number, range: [number, number]): number {
  const mid = (range[0] + range[1]) / 2;
  const halfSpan = (range[1] - range[0]) / 2;
  const dist = Math.abs(tempC - mid);
  if (dist <= halfSpan) return 1.0;
  return Math.max(0.1, Math.exp(-0.12 * (dist - halfSpan)));
}

/**
 * Score how conducive humidity is for disease spread.
 * Above critical threshold → rapid increase; below → linear ramp.
 */
function humidityFactor(humidity: number, critical: number): number {
  if (humidity >= critical) {
    return Math.min(1.5, 0.8 + 0.7 * ((humidity - critical) / (100 - critical)));
  }
  return Math.max(0.2, 0.8 * (humidity / critical));
}

/**
 * Meteorological wind direction is "where FROM", so spores travel +180°.
 */
function windDirToBearing(windDirDeg: number): number {
  return (windDirDeg + 180) % 360;
}

/**
 * Absolute angular difference (0–180°).
 */
function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 180) % 360) - 180);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Core projection function
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Normalise a raw disease string into a lookup key.
 * Mirrors `normalizePathogen` from api.ts but extended for this module.
 */
function normaliseDiseaseKey(raw: string): string {
  const k = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (k.includes("late_blight") || k.includes("phytophthora")) return "late_blight";
  if (k.includes("early_blight") || k.includes("alternaria")) return "early_blight";
  if (k.includes("powdery_mildew")) return "powdery_mildew";
  if (k.includes("bacterial_wilt") || k === "wilt") return "bacterial_wilt";
  if (k.includes("red_rot")) return "red_rot";
  if (k.includes("smut")) return "smut";
  if (k.includes("rust")) return "rust";
  if (k.includes("mosaic")) return "mosaic_disease";
  if (k.includes("anthracnose")) return "anthracnose";
  if (k.includes("fusarium") && k.includes("wilt")) return "wilt";
  return k;
}

/**
 * Compute a weather-driven spread projection polygon.
 *
 * @param epicenter  The [lat, lng] of the detected outbreak point.
 * @param weather    Current weather metrics.
 * @param disease    Raw disease name string.
 * @param segments   Number of polygon vertices (smoothness). Default 48.
 * @returns          SpreadProjection with polygon, label, color, and risk info.
 */
export function computeSpreadProjection(
  epicenter: LatLngTuple,
  weather: WeatherMetrics,
  disease: string,
  segments: number = 48,
): SpreadProjection {
  const key = normaliseDiseaseKey(disease);
  const profile = DISEASE_PROFILES[key] ?? DEFAULT_PROFILE;

  // ── Compute environmental multipliers ──
  const tFactor = tempFactor(weather.temperatureC, profile.optimalTempRange);
  const hFactor = humidityFactor(weather.humidityPct, profile.criticalHumidity);
  const windMultiplier = Math.min(2.5, weather.windSpeedKmh / 12);

  // Effective base radius (km), modulated by weather
  const effectiveRadiusKm =
    profile.baseRadiusKm *
    tFactor *
    hFactor *
    (1 + profile.windInfluence * (windMultiplier - 1));

  // Clamp to reasonable range
  const radiusKm = Math.max(0.2, Math.min(effectiveRadiusKm, 8.0));

  // ── Dispersal bearing (where spores travel TO) ──
  const dispersalBearing = windDirToBearing(weather.windDirectionDeg);

  // ── Generate the polygon as an elongated ellipse ──
  const points: LatLngTuple[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 360;
    const diff = angleDiff(angle, dispersalBearing);

    // Downwind elongation: cos-based stretch
    const alignFactor = Math.cos(deg2rad(diff));
    const stretchFactor =
      profile.windInfluence * (1.0 + 0.6 * alignFactor) +
      (1 - profile.windInfluence) * 1.0;
    const r = radiusKm * stretchFactor;

    // Convert km offsets to lat/lng degrees
    const latOffset = (r / 111.32) * Math.cos(deg2rad(angle));
    const lonOffset =
      (r / (111.32 * Math.cos(deg2rad(epicenter[0])))) *
      Math.sin(deg2rad(angle));

    points.push([epicenter[0] + latOffset, epicenter[1] + lonOffset]);
  }

  // ── Risk classification ──
  const riskScore = tFactor * hFactor * windMultiplier;
  let riskLevel: SpreadProjection["riskLevel"];
  if (riskScore >= 2.0) riskLevel = "critical";
  else if (riskScore >= 1.2) riskLevel = "high";
  else if (riskScore >= 0.6) riskLevel = "moderate";
  else riskLevel = "low";

  const fillOpacity =
    riskLevel === "critical"
      ? 0.32
      : riskLevel === "high"
        ? 0.24
        : riskLevel === "moderate"
          ? 0.18
          : 0.12;

  return {
    polygon: points,
    label: `${profile.riskLabel} (${riskLevel})`,
    color: profile.color,
    fillOpacity,
    effectiveRadiusKm: Math.round(radiusKm * 100) / 100,
    riskLevel,
  };
}
