/**
 * Sugarcane Disease Spread Simulation Engine — Ahmednagar, Maharashtra
 *
 * Models sugarcane diseases (Red Rot, Smut, Wilt, Rust) spread patterns
 * using a simplified Gaussian-plume + cellular-automaton hybrid approach.
 *
 * Key factors:
 *  - Wind vector (speed + direction) → primary spore/pathogen transport
 *  - Temperature → pathogen growth rate (optimal 25-32°C for most sugarcane diseases)
 *  - Humidity → sporulation & infection probability (>80% critical)
 *  - Rainfall proxy (derived from humidity) → splash dispersal
 *  - Topography → Ahmednagar is on the Deccan plateau, gently undulating
 *
 * Disease profiles sourced from:
 *  - ICAR-SBI (Sugarcane Breeding Institute) disease bulletins
 *  - Maharashtra Sugar Commissioner advisories
 *  - FAO sugarcane IPM guidelines
 */

import type { LatLngTuple } from "leaflet";

/* ═══════════════════════════════════════════════════════════════════════════
 *  Ahmednagar Sugarcane Belt — Geographic Data
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Ahmednagar district center (near Ahmednagar city) */
export const AHMEDNAGAR_CENTER: LatLngTuple = [19.0952, 74.7496];

/**
 * Realistic sugarcane field polygons in Ahmednagar taluka.
 * These represent typical 5–20 acre plots in the Sina–Bhima river basin
 * where sugarcane is predominantly grown.
 */
export interface FieldPolygon {
  id: string;
  name: string;
  taluka: string;
  areaAcres: number;
  soilType: string;
  irrigationType: string;
  variety: string;
  plantingMonth: string;
  ageMonths: number;
  boundary: LatLngTuple[];
  center: LatLngTuple;
}

export const SUGARCANE_FIELDS: FieldPolygon[] = [
  {
    id: "field-01",
    name: "Kharwandi Farm",
    taluka: "Ahmednagar",
    areaAcres: 12,
    soilType: "Medium Black (clay-loam)",
    irrigationType: "Drip",
    variety: "Co 86032",
    plantingMonth: "February",
    ageMonths: 7,
    boundary: [
      [19.1020, 74.7380],
      [19.1020, 74.7460],
      [19.0965, 74.7460],
      [19.0965, 74.7380],
    ],
    center: [19.0993, 74.7420],
  },
  {
    id: "field-02",
    name: "Bhingar Plot A",
    taluka: "Ahmednagar",
    areaAcres: 8,
    soilType: "Light Black (loam)",
    irrigationType: "Canal",
    variety: "CoM 0265",
    plantingMonth: "January",
    ageMonths: 8,
    boundary: [
      [19.1055, 74.7510],
      [19.1055, 74.7570],
      [19.1010, 74.7570],
      [19.1010, 74.7510],
    ],
    center: [19.1033, 74.7540],
  },
  {
    id: "field-03",
    name: "Vilad Farm",
    taluka: "Rahuri",
    areaAcres: 18,
    soilType: "Deep Black (vertisol)",
    irrigationType: "Flood",
    variety: "Co 86032",
    plantingMonth: "October",
    ageMonths: 11,
    boundary: [
      [19.0880, 74.7280],
      [19.0880, 74.7400],
      [19.0810, 74.7400],
      [19.0810, 74.7280],
    ],
    center: [19.0845, 74.7340],
  },
  {
    id: "field-04",
    name: "Dahigaon Nursery",
    taluka: "Ahmednagar",
    areaAcres: 6,
    soilType: "Medium Black (clay-loam)",
    irrigationType: "Drip",
    variety: "CoVSI 9805",
    plantingMonth: "March",
    ageMonths: 6,
    boundary: [
      [19.0920, 74.7580],
      [19.0920, 74.7630],
      [19.0890, 74.7630],
      [19.0890, 74.7580],
    ],
    center: [19.0905, 74.7605],
  },
  {
    id: "field-05",
    name: "Savedi Ratoon",
    taluka: "Ahmednagar",
    areaAcres: 15,
    soilType: "Medium Black (clay-loam)",
    irrigationType: "Canal + Drip",
    variety: "Co 86032",
    plantingMonth: "December",
    ageMonths: 9,
    boundary: [
      [19.1100, 74.7320],
      [19.1100, 74.7430],
      [19.1040, 74.7430],
      [19.1040, 74.7320],
    ],
    center: [19.1070, 74.7375],
  },
  {
    id: "field-06",
    name: "Kedgaon Block B",
    taluka: "Ahmednagar",
    areaAcres: 10,
    soilType: "Light Black (loam)",
    irrigationType: "Sprinkler",
    variety: "CoM 0265",
    plantingMonth: "February",
    ageMonths: 7,
    boundary: [
      [19.0850, 74.7500],
      [19.0850, 74.7570],
      [19.0800, 74.7570],
      [19.0800, 74.7500],
    ],
    center: [19.0825, 74.7535],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  Disease Profiles
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface DiseaseProfile {
  name: string;
  pathogen: string;
  spreadMechanism: string;
  optimalTempRange: [number, number]; // °C
  criticalHumidity: number; // % above which rapid spread
  baseSpreadRateKmPerDay: number;
  windInfluenceFactor: number; // 0–1, how much wind affects spread
  description: string;
}

export const SUGARCANE_DISEASES: Record<string, DiseaseProfile> = {
  red_rot: {
    name: "Red Rot",
    pathogen: "Colletotrichum falcatum",
    spreadMechanism: "Soil-borne + water-splash + infected setts",
    optimalTempRange: [25, 32],
    criticalHumidity: 80,
    baseSpreadRateKmPerDay: 0.15,
    windInfluenceFactor: 0.3,
    description:
      "Most destructive sugarcane disease in Maharashtra. Causes internal reddening of stalks, white spots in red tissue. Spreads via infected seed cane and waterlogged soil.",
  },
  smut: {
    name: "Smut",
    pathogen: "Sporisorium scitamineum",
    spreadMechanism: "Airborne spores (teliospores) + wind dispersal",
    optimalTempRange: [25, 35],
    criticalHumidity: 70,
    baseSpreadRateKmPerDay: 0.25,
    windInfluenceFactor: 0.85,
    description:
      "Whip-like black structure emerges from growing point. Teliospores spread rapidly by wind. Severe in ratoon crops.",
  },
  wilt: {
    name: "Wilt",
    pathogen: "Fusarium sacchari",
    spreadMechanism: "Soil-borne, root infection, waterlogging",
    optimalTempRange: [28, 35],
    criticalHumidity: 75,
    baseSpreadRateKmPerDay: 0.08,
    windInfluenceFactor: 0.1,
    description:
      "Yellowing and wilting of leaves, purple discolouration of internal tissue. Worsened by waterlogged conditions.",
  },
  rust: {
    name: "Rust",
    pathogen: "Puccinia melanocephala",
    spreadMechanism: "Airborne urediniospores, wind-driven",
    optimalTempRange: [20, 28],
    criticalHumidity: 85,
    baseSpreadRateKmPerDay: 0.35,
    windInfluenceFactor: 0.9,
    description:
      "Orange-brown pustules on leaf surfaces. Highly wind-dependent. Favoured by cool, humid conditions.",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Weather State
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface WeatherState {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  rainfallMmPerDay: number;
}

/** Ahmednagar September climatology (Kharif season peak) */
export const AHMEDNAGAR_SEPT_WEATHER: WeatherState = {
  temperatureC: 27.2,
  humidityPct: 78,
  windSpeedKmh: 13.5,
  windDirectionDeg: 240, // WSW (typical monsoon tail)
  rainfallMmPerDay: 4.2,
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  Simulation Engine
 * ═══════════════════════════════════════════════════════════════════════════ */

export type RiskLevel = "critical" | "high" | "monitor" | "low";

export interface FieldRiskAssessment {
  fieldId: string;
  field: FieldPolygon;
  riskLevel: RiskLevel;
  riskScore: number; // 0–100
  infectionProbability: number; // 0–1
  estimatedSpreadDaysTillReach: number | null;
  factors: {
    temperatureScore: number;
    humidityScore: number;
    windAlignmentScore: number;
    proximityScore: number;
    varietySusceptibility: number;
    ageVulnerability: number;
    irrigationRisk: number;
  };
  recommendations: string[];
}

export interface SpreadContour {
  dayIndex: number;
  polygon: LatLngTuple[];
  radiusKm: number;
  riskLevel: RiskLevel;
}

export interface SimulationResult {
  disease: DiseaseProfile;
  weather: WeatherState;
  epicenterFieldId: string;
  epicenter: LatLngTuple;
  fieldAssessments: FieldRiskAssessment[];
  spreadContours: SpreadContour[];
  totalDaysSimulated: number;
  overallRiskSummary: {
    critical: number;
    high: number;
    monitor: number;
    low: number;
  };
  simulationTimestamp: string;
}

/**
 * Convert wind direction (meteorological: where FROM) to bearing (where TO).
 * Meteorological 240° means wind comes from WSW, so spores travel toward ENE.
 */
function windDirToBearing(windDirDeg: number): number {
  return (windDirDeg + 180) % 360;
}

/** Degrees → radians */
function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Haversine distance in km */
function haversineKm(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371;
  const dLat = deg2rad(b[0] - a[0]);
  const dLon = deg2rad(b[1] - a[1]);
  const lat1 = deg2rad(a[0]);
  const lat2 = deg2rad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Bearing from point a to point b (degrees, 0=N, clockwise) */
function bearingDeg(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = deg2rad(a[0]);
  const lat2 = deg2rad(b[0]);
  const dLon = deg2rad(b[1] - a[1]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Angular difference (0–180°) */
function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b + 180) % 360) - 180);
  return d;
}

/** Score 0–1 for how well temperature falls in disease optimal range */
function temperatureScore(
  tempC: number,
  range: [number, number]
): number {
  const mid = (range[0] + range[1]) / 2;
  const halfSpan = (range[1] - range[0]) / 2;
  const dist = Math.abs(tempC - mid);
  if (dist <= halfSpan) return 1.0;
  // Exponential decay outside optimal
  return Math.max(0, Math.exp(-0.15 * (dist - halfSpan)));
}

/** Score 0–1 for humidity influence on disease */
function humidityScore(humidity: number, critThreshold: number): number {
  if (humidity >= critThreshold) {
    // Rapid increase above critical
    return Math.min(1.0, 0.7 + 0.3 * ((humidity - critThreshold) / (100 - critThreshold)));
  }
  // Linear below critical
  return 0.7 * (humidity / critThreshold);
}

/** Score 0–1 for wind alignment (is target field downwind from epicenter?) */
function windAlignmentScore(
  epicenter: LatLngTuple,
  target: LatLngTuple,
  windDirDeg: number,
  windFactor: number
): number {
  const dispersalBearing = windDirToBearing(windDirDeg);
  const targetBearing = bearingDeg(epicenter, target);
  const diff = angleDiff(dispersalBearing, targetBearing);

  // Gaussian-like cone: peak at 0° difference, drops at 90°+
  const alignScore = Math.exp(-0.5 * (diff / 45) ** 2);
  // Blend with isotropic component (soil/water spread isn't directional)
  return windFactor * alignScore + (1 - windFactor) * 0.3;
}

/** Variety susceptibility to disease (lookup) */
function varietySusceptibility(variety: string, diseaseName: string): number {
  const table: Record<string, Record<string, number>> = {
    "Co 86032": { red_rot: 0.75, smut: 0.4, wilt: 0.6, rust: 0.5 },
    "CoM 0265": { red_rot: 0.45, smut: 0.7, wilt: 0.3, rust: 0.65 },
    "CoVSI 9805": { red_rot: 0.35, smut: 0.5, wilt: 0.4, rust: 0.55 },
  };
  return table[variety]?.[diseaseName] ?? 0.5;
}

/** Crop age vulnerability — younger crops more susceptible to some diseases */
function ageVulnerabilityScore(ageMonths: number, diseaseName: string): number {
  if (diseaseName === "smut") {
    // Smut: ratoon/older crops more vulnerable
    return Math.min(1.0, 0.3 + ageMonths * 0.07);
  }
  if (diseaseName === "red_rot") {
    // Red rot: mid-maturity (6–10 months) most vulnerable
    const peak = 8;
    return Math.max(0.2, 1.0 - 0.04 * Math.abs(ageMonths - peak) ** 1.5);
  }
  // Default: moderate linear increase
  return Math.min(1.0, 0.4 + ageMonths * 0.05);
}

/** Irrigation type risk multiplier */
function irrigationRiskFactor(
  irrigationType: string,
  diseaseName: string
): number {
  const lower = irrigationType.toLowerCase();
  if (diseaseName === "red_rot" || diseaseName === "wilt") {
    // Waterlogging diseases
    if (lower.includes("flood")) return 0.9;
    if (lower.includes("canal")) return 0.7;
    if (lower.includes("sprinkler")) return 0.5;
    return 0.35; // drip
  }
  // Airborne diseases less affected by irrigation
  return 0.4;
}

/** Generate spread contour polygon for a given radius around a center */
function generateContour(
  center: LatLngTuple,
  radiusKm: number,
  windDirDeg: number,
  windFactor: number,
  segments: number = 36
): LatLngTuple[] {
  const dispersalBearing = windDirToBearing(windDirDeg);
  const points: LatLngTuple[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 360;
    const diff = angleDiff(angle, dispersalBearing);

    // Elongate in wind direction: downwind is 1.5x, upwind is 0.5x
    const alignFactor = Math.cos(deg2rad(diff));
    const stretchFactor =
      windFactor * (1.0 + 0.5 * alignFactor) + (1 - windFactor) * 1.0;
    const effectiveRadius = radiusKm * stretchFactor;

    // Convert km to degree offsets (approximate at this latitude)
    const latOffset =
      (effectiveRadius / 111.32) * Math.cos(deg2rad(angle));
    const lonOffset =
      (effectiveRadius / (111.32 * Math.cos(deg2rad(center[0])))) *
      Math.sin(deg2rad(angle));

    points.push([center[0] + latOffset, center[1] + lonOffset]);
  }

  return points;
}

/**
 * Run the full simulation.
 *
 * @param diseaseKey  Key from SUGARCANE_DISEASES
 * @param epicenterFieldId  Which field is the initial infection source
 * @param weather  Current weather conditions
 * @param days  How many days to simulate (default 14)
 */
export function runSimulation(
  diseaseKey: string,
  epicenterFieldId: string,
  weather: WeatherState,
  days: number = 14
): SimulationResult {
  const disease = SUGARCANE_DISEASES[diseaseKey] ?? SUGARCANE_DISEASES.red_rot;
  const epicenterField =
    SUGARCANE_FIELDS.find((f) => f.id === epicenterFieldId) ??
    SUGARCANE_FIELDS[0];
  const epicenter = epicenterField.center;

  // ── Compute environmental multipliers ──
  const tempScore = temperatureScore(weather.temperatureC, disease.optimalTempRange);
  const humScore = humidityScore(weather.humidityPct, disease.criticalHumidity);
  const windSpeedMultiplier = Math.min(2.0, weather.windSpeedKmh / 15);

  // Effective daily spread rate (km)
  const effectiveSpreadRate =
    disease.baseSpreadRateKmPerDay *
    tempScore *
    humScore *
    (1 + disease.windInfluenceFactor * (windSpeedMultiplier - 1));

  // ── Generate spread contours for each day ──
  const spreadContours: SpreadContour[] = [];
  for (let d = 1; d <= days; d++) {
    const radiusKm = effectiveSpreadRate * d;
    let riskLevel: RiskLevel;
    if (d <= 3) riskLevel = "critical";
    else if (d <= 7) riskLevel = "high";
    else if (d <= 11) riskLevel = "monitor";
    else riskLevel = "low";

    spreadContours.push({
      dayIndex: d,
      polygon: generateContour(
        epicenter,
        radiusKm,
        weather.windDirectionDeg,
        disease.windInfluenceFactor
      ),
      radiusKm,
      riskLevel,
    });
  }

  // ── Assess each field ──
  const fieldAssessments: FieldRiskAssessment[] = SUGARCANE_FIELDS.map(
    (field) => {
      const distance = haversineKm(epicenter, field.center);
      const isEpicenter = field.id === epicenterFieldId;

      // Individual factor scores
      const tScore = tempScore;
      const hScore = humScore;
      const wAlignment = isEpicenter
        ? 1.0
        : windAlignmentScore(
            epicenter,
            field.center,
            weather.windDirectionDeg,
            disease.windInfluenceFactor
          );
      const proxScore = isEpicenter
        ? 1.0
        : Math.max(0, 1.0 - distance / 5.0); // decay over 5km
      const varSusc = varietySusceptibility(field.variety, diseaseKey);
      const ageVuln = ageVulnerabilityScore(field.ageMonths, diseaseKey);
      const irrigRisk = irrigationRiskFactor(field.irrigationType, diseaseKey);

      // Weighted composite risk score
      const weights = {
        temperature: 0.12,
        humidity: 0.15,
        windAlignment: 0.18,
        proximity: 0.2,
        variety: 0.15,
        age: 0.1,
        irrigation: 0.1,
      };

      const rawScore = isEpicenter
        ? 95
        : (tScore * weights.temperature +
            hScore * weights.humidity +
            wAlignment * weights.windAlignment +
            proxScore * weights.proximity +
            varSusc * weights.variety +
            ageVuln * weights.age +
            irrigRisk * weights.irrigation) *
          100;

      const riskScore = Math.min(100, Math.round(rawScore));
      const infectionProbability = isEpicenter
        ? 0.98
        : Math.min(0.95, rawScore / 100);

      // Estimate days until spread reaches this field
      const spreadDays =
        isEpicenter || effectiveSpreadRate <= 0
          ? 0
          : distance / effectiveSpreadRate;

      // Classification
      let riskLevel: RiskLevel;
      if (riskScore >= 75 || isEpicenter) riskLevel = "critical";
      else if (riskScore >= 55) riskLevel = "high";
      else if (riskScore >= 35) riskLevel = "monitor";
      else riskLevel = "low";

      // Generate tailored recommendations
      const recommendations = generateRecommendations(
        disease,
        riskLevel,
        field,
        weather
      );

      return {
        fieldId: field.id,
        field,
        riskLevel,
        riskScore,
        infectionProbability,
        estimatedSpreadDaysTillReach: isEpicenter
          ? 0
          : Math.round(spreadDays * 10) / 10,
        factors: {
          temperatureScore: Math.round(tScore * 100) / 100,
          humidityScore: Math.round(hScore * 100) / 100,
          windAlignmentScore: Math.round(wAlignment * 100) / 100,
          proximityScore: Math.round(proxScore * 100) / 100,
          varietySusceptibility: Math.round(varSusc * 100) / 100,
          ageVulnerability: Math.round(ageVuln * 100) / 100,
          irrigationRisk: Math.round(irrigRisk * 100) / 100,
        },
        recommendations,
      };
    }
  );

  // Sort by risk score descending
  fieldAssessments.sort((a, b) => b.riskScore - a.riskScore);

  const overallRiskSummary = {
    critical: fieldAssessments.filter((a) => a.riskLevel === "critical").length,
    high: fieldAssessments.filter((a) => a.riskLevel === "high").length,
    monitor: fieldAssessments.filter((a) => a.riskLevel === "monitor").length,
    low: fieldAssessments.filter((a) => a.riskLevel === "low").length,
  };

  return {
    disease,
    weather,
    epicenterFieldId,
    epicenter,
    fieldAssessments,
    spreadContours,
    totalDaysSimulated: days,
    overallRiskSummary,
    simulationTimestamp: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Recommendation Generator
 * ═══════════════════════════════════════════════════════════════════════════ */

function generateRecommendations(
  disease: DiseaseProfile,
  riskLevel: RiskLevel,
  field: FieldPolygon,
  weather: WeatherState
): string[] {
  const steps: string[] = [];
  const dn = disease.name;

  if (riskLevel === "critical") {
    steps.push(
      `URGENT: Immediately inspect ${field.name} for ${dn} symptoms.`
    );
    if (dn === "Red Rot") {
      steps.push(
        "Remove and destroy infected setts. Do NOT use infected cane for planting.",
        "Apply Carbendazim 50% WP (1g/L) as stalk drench.",
        "Sett treatment with Trichoderma viride (4g/kg seed) before replanting.",
        "Avoid waterlogging — improve drainage channels immediately."
      );
    } else if (dn === "Smut") {
      steps.push(
        "Uproot and burn all whip-bearing clumps to prevent spore release.",
        "Do NOT ratoon this crop — plough and replant with disease-free seed.",
        "Apply hot-water treatment (52°C for 30 min) to all seed cane."
      );
    } else if (dn === "Rust") {
      steps.push(
        "Apply Propiconazole 25% EC (1ml/L) foliar spray.",
        "Reduce irrigation frequency to lower leaf wetness duration.",
        "Consider early harvest if infection exceeds 40% leaf area."
      );
    } else {
      steps.push(
        "Consult nearest ICAR-SBI or KVK office for specific treatment.",
        "Isolate infected area, restrict movement of plant material."
      );
    }
  } else if (riskLevel === "high") {
    steps.push(
      `HIGH ALERT: Scout ${field.name} every 2 days for early ${dn} signs.`
    );
    steps.push(
      "Apply preventive fungicide (Mancozeb 75% WP at 2.5g/L) as foliar spray.",
      "Ensure proper field sanitation — remove crop debris."
    );
    if (weather.humidityPct > 80) {
      steps.push(
        "Reduce irrigation: current humidity exceeds safe threshold."
      );
    }
  } else if (riskLevel === "monitor") {
    steps.push(
      `Monitor ${field.name} weekly. ${dn} risk is moderate.`,
      "Maintain field hygiene, ensure good air circulation between rows.",
      `Variety ${field.variety}: check resistance rating for ${dn}.`
    );
  } else {
    steps.push(
      `${field.name} is currently low-risk. Continue routine scouting.`,
      "Maintain balanced nutrition (avoid excess nitrogen which increases susceptibility)."
    );
  }

  return steps;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Risk colour helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "#dc2626"; // red-600
    case "high":
      return "#ea580c"; // orange-600
    case "monitor":
      return "#d97706"; // amber-600
    case "low":
      return "#16a34a"; // green-600
  }
}

export function riskFillOpacity(level: RiskLevel): number {
  switch (level) {
    case "critical":
      return 0.35;
    case "high":
      return 0.25;
    case "monitor":
      return 0.18;
    case "low":
      return 0.12;
  }
}
