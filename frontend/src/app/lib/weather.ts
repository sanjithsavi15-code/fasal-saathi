/**
 * Fasal Saathi — Weather data services.
 *
 * Three sources, tried in priority order:
 *  1. Open-Meteo (free, no key, GPS-based, global coverage)
 *  2. data.gov.in / IMD via FastAPI backend (if running)
 *  3. Simulated regional fallback (hard-coded Maharashtra climatology)
 *
 * All inputs remain manually editable regardless of source.
 */

export interface LiveWeather {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  source: "open-meteo" | "imd-backend" | "imd-direct" | "simulated";
  district?: string;
  latitude?: number;
  longitude?: number;
  note?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 *  1. Open-Meteo — free, no key required
 * ────────────────────────────────────────────────────────────────────────── */

export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<LiveWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m` +
    `&wind_speed_unit=kmh`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo API failed (${response.status})`);
  }

  const json = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
      wind_direction_10m?: number;
    };
  };

  const c = json.current;
  if (!c) throw new Error("Open-Meteo returned no current data");

  return {
    temperatureC: Number(c.temperature_2m ?? 0),
    humidityPct: Number(c.relative_humidity_2m ?? 0),
    windSpeedKmh: Number(c.wind_speed_10m ?? 0),
    windDirectionDeg: Number(c.wind_direction_10m ?? 0),
    source: "open-meteo",
    latitude,
    longitude,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 *  2. data.gov.in / IMD — direct frontend call (requires API key in env)
 * ────────────────────────────────────────────────────────────────────────── */

const DATA_GOV_API_KEY = (
  process.env.NEXT_PUBLIC_DATA_GOV_IN_API_KEY ?? ""
).trim();
const DATA_GOV_RESOURCE_ID = (
  process.env.NEXT_PUBLIC_DATA_GOV_IMD_RESOURCE_ID ??
  "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
).trim();

export async function fetchDataGovWeather(
  district: string,
  signal?: AbortSignal
): Promise<LiveWeather | null> {
  if (!DATA_GOV_API_KEY) return null; // No key → skip

  const url = new URL(
    `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE_ID}`
  );
  url.searchParams.set("api-key", DATA_GOV_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  if (district) {
    url.searchParams.set("filters[district]", district);
    url.searchParams.set("filters[station]", district);
  }

  try {
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      records?: Array<Record<string, unknown>>;
    };
    const records = payload?.records;
    if (!Array.isArray(records) || records.length === 0) return null;

    const row = records[0];
    const lower: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      lower[k.toLowerCase()] = v;
    }

    const pick = (...names: string[]): number | null => {
      for (const name of names) {
        const val = lower[name];
        if (val != null && val !== "") {
          const num = Number(val);
          if (Number.isFinite(num)) return num;
        }
      }
      return null;
    };

    const temp = pick(
      "temperature",
      "temp",
      "temp_c",
      "air_temperature",
      "tmax",
      "temperature_c"
    );
    const humidity = pick("humidity", "rh", "relative_humidity", "humidity_pct");
    const windSpeed = pick(
      "wind_speed",
      "ws",
      "windspeed",
      "wind_speed_kmh",
      "wind_speed_kmph"
    );
    const windDir = pick(
      "wind_direction",
      "wd",
      "winddir",
      "wind_direction_deg",
      "wind_dir"
    );

    if (temp === null && humidity === null) return null;

    return {
      temperatureC: temp ?? 25.0,
      humidityPct: humidity ?? 70.0,
      windSpeedKmh: windSpeed ?? 10.0,
      windDirectionDeg: windDir ?? 200.0,
      source: "imd-direct",
      district,
      note: "data.gov.in / IMD",
    };
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 *  3. Simulated regional fallback (Maharashtra focus)
 * ────────────────────────────────────────────────────────────────────────── */

const SIMULATED_BY_DISTRICT: Record<
  string,
  { temperatureC: number; humidityPct: number; windSpeedKmh: number; windDirectionDeg: number }
> = {
  nashik: { temperatureC: 24.6, humidityPct: 78, windSpeedKmh: 12.4, windDirectionDeg: 225 },
  pune: { temperatureC: 26.1, humidityPct: 72, windSpeedKmh: 10.8, windDirectionDeg: 210 },
  "pune rural": { temperatureC: 25.4, humidityPct: 74, windSpeedKmh: 11.2, windDirectionDeg: 215 },
  ahmednagar: { temperatureC: 27.2, humidityPct: 68, windSpeedKmh: 13.5, windDirectionDeg: 240 },
  satara: { temperatureC: 23.8, humidityPct: 80, windSpeedKmh: 9.6, windDirectionDeg: 200 },
  kolhapur: { temperatureC: 25.9, humidityPct: 82, windSpeedKmh: 8.4, windDirectionDeg: 195 },
  solapur: { temperatureC: 29.1, humidityPct: 55, windSpeedKmh: 15.2, windDirectionDeg: 260 },
  aurangabad: { temperatureC: 28.4, humidityPct: 58, windSpeedKmh: 14.1, windDirectionDeg: 250 },
  jalgaon: { temperatureC: 28.8, humidityPct: 60, windSpeedKmh: 13.0, windDirectionDeg: 245 },
};

const DEFAULT_SIMULATED = {
  temperatureC: 25.0,
  humidityPct: 75.0,
  windSpeedKmh: 12.0,
  windDirectionDeg: 220.0,
};

export function getSimulatedWeather(district?: string): LiveWeather {
  const key = (district ?? "nashik").trim().toLowerCase();
  const data = SIMULATED_BY_DISTRICT[key] ?? DEFAULT_SIMULATED;
  return {
    ...data,
    source: "simulated",
    district: district ?? "Nashik",
    note: "Simulated regional data (no live API available)",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Smart auto-fill: tries sources in priority order
 * ────────────────────────────────────────────────────────────────────────── */

export interface SmartWeatherResult extends LiveWeather {
  triedSources: string[];
}

export async function fetchSmartWeather(opts: {
  latitude?: number;
  longitude?: number;
  district?: string;
  signal?: AbortSignal;
}): Promise<SmartWeatherResult> {
  const triedSources: string[] = [];
  const { latitude, longitude, district, signal } = opts;

  // 1. Try Open-Meteo if we have coordinates
  if (latitude != null && longitude != null) {
    triedSources.push("open-meteo");
    try {
      const result = await fetchOpenMeteoWeather(latitude, longitude, signal);
      return { ...result, triedSources };
    } catch {
      // fall through
    }
  }

  // 2. Try data.gov.in direct (if API key is configured)
  if (district && DATA_GOV_API_KEY) {
    triedSources.push("data.gov.in");
    try {
      const result = await fetchDataGovWeather(district, signal);
      if (result) return { ...result, triedSources };
    } catch {
      // fall through
    }
  }

  // 3. Simulated fallback
  triedSources.push("simulated");
  return { ...getSimulatedWeather(district), triedSources };
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Geolocation helper
 * ────────────────────────────────────────────────────────────────────────── */

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    });
  });
}
