/**
 * FastAPI client for Fasal Saathi Vision AI + RL Engine.
 */

function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
  // Empty string is truthy for ?? fallback — treat blank as unset.
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Vision AI — POST /api/diagnosis/classify */
export interface DiagnosisClassifyResponse {
  crop_type: string;
  disease: string;
  confidence?: number;
  /** ICAR / govt official mitigation advisory */
  cure?: string;
}

/** IMD / data.gov.in weather — GET /api/telemetry/weather */
export interface GovtWeatherResponse {
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  district?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  note?: string | null;
}

/** RL Engine request — POST /api/simulation/predict */
export interface SimulationPredictRequest {
  district: string;
  sector: string;
  cropType: string;
  pathogen: string;
  latitude: number;
  longitude: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  humidityPct: number;
  temperatureC: number;
  sourceMode: "manual" | "live";
}

export interface RiskZone {
  level: string;
  label: string;
  color: string;
  description: string;
}

/** RL Engine response — Fasal Saathi contract */
export interface SimulationPredictResponse {
  spread_polygon_coordinates: number[][];
  risk_zones: RiskZone[];
  prevention_steps: string[];
  risk_level?: string;
  policy_id?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function normalizePathogen(raw: string): string {
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (key.includes("late_blight") || key.includes("phytophthora")) return "late_blight";
  if (key.includes("early_blight")) return "early_blight";
  if (key.includes("powdery_mildew")) return "powdery_mildew";
  if (key.includes("bacterial_wilt") || key.includes("wilt")) return "bacterial_wilt";
  if (key.includes("rust")) return "rust";
  if (key.includes("anthracnose")) return "anthracnose";
  if (key.includes("healthy")) return "unknown";
  return key || "unknown";
}

/** Convert API [lat, lng] ring → Leaflet tuples; drop duplicate close. */
export function polygonToLatLng(
  ring: number[][] | undefined | null
): [number, number][] {
  if (!ring || ring.length === 0) return [];
  const tuples: [number, number][] = ring
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([lat, lng]) => [lat, lng] as [number, number]);

  if (tuples.length >= 2) {
    const [fLat, fLng] = tuples[0];
    const [lLat, lLng] = tuples[tuples.length - 1];
    if (fLat === lLat && fLng === lLng) {
      return tuples.slice(0, -1);
    }
  }
  return tuples;
}

export async function classifyCropImage(
  file: File,
  signal?: AbortSignal
): Promise<DiagnosisClassifyResponse> {
  const url = `${API_BASE_URL}/api/diagnosis/classify`;
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: formData, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Classification timed out. Enter crop and disease manually.", 0);
    }
    throw new ApiError(
      "Vision API unreachable. Start FastAPI on port 8000.",
      0
    );
  }

  if (!response.ok) {
    throw new ApiError("API returned an error", response.status);
  }

  const data = (await response.json()) as DiagnosisClassifyResponse;
  if (typeof data.disease !== "string") {
    throw new ApiError("Malformed diagnosis response.", response.status);
  }
  return {
    crop_type: typeof data.crop_type === "string" ? data.crop_type : "Potato",
    disease: data.disease,
    confidence: typeof data.confidence === "number" ? data.confidence : undefined,
    cure: typeof data.cure === "string" ? data.cure : undefined,
  };
}

/** Fetch IMD / data.gov.in weather (with server-side simulated fallback). */
export async function fetchGovtWeather(
  params: { district?: string; latitude?: number; longitude?: number },
  signal?: AbortSignal
): Promise<GovtWeatherResponse> {
  const qs = new URLSearchParams();
  if (params.district) qs.set("district", params.district);
  if (params.latitude != null) qs.set("latitude", String(params.latitude));
  if (params.longitude != null) qs.set("longitude", String(params.longitude));

  const url = `${API_BASE_URL}/api/telemetry/weather?${qs.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Weather request timed out.", 0);
    }
    throw new ApiError("Cannot reach weather API. Is FastAPI running?", 0);
  }

  if (!response.ok) {
    throw new ApiError(`Weather API failed (${response.status})`, response.status);
  }

  const data = (await response.json()) as GovtWeatherResponse;
  const temperature =
    typeof data.temperature_c === "number"
      ? data.temperature_c
      : Number(data.temperature_c);
  if (!Number.isFinite(temperature)) {
    throw new ApiError("Malformed weather response.", response.status);
  }
  return {
    ...data,
    temperature_c: temperature,
    humidity_pct: Number(data.humidity_pct),
    wind_speed_kmh: Number(data.wind_speed_kmh),
    wind_direction_deg: Number(data.wind_direction_deg),
  };
}

export async function predictSimulation(
  body: SimulationPredictRequest,
  signal?: AbortSignal
): Promise<SimulationPredictResponse> {
  const url = "http://127.0.0.1:8000/api/simulation/predict";

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...body,
        pathogen: normalizePathogen(body.pathogen),
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Simulation timed out. Please try again.", 0);
    }
    throw new ApiError(
      "Cannot reach the Fasal Saathi API. Is FastAPI running on port 8000?",
      0
    );
  }

  if (!response.ok) {
    let detail = `Simulation failed (${response.status})`;
    try {
      const errBody = (await response.json()) as { detail?: unknown };
      if (typeof errBody.detail === "string") detail = errBody.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  const data = (await response.json()) as SimulationPredictResponse;
  if (!Array.isArray(data.spread_polygon_coordinates) || !Array.isArray(data.prevention_steps)) {
    throw new ApiError("Malformed simulation response.", response.status);
  }
  return data;
}
