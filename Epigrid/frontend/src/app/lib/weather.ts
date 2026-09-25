/** Free Open-Meteo weather fetch (no API key). */

export interface LiveWeather {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
}

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
    throw new Error(`Weather API failed (${response.status})`);
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
  if (!c) throw new Error("Weather API returned no current data");

  return {
    temperatureC: Number(c.temperature_2m ?? 0),
    humidityPct: Number(c.relative_humidity_2m ?? 0),
    windSpeedKmh: Number(c.wind_speed_10m ?? 0),
    windDirectionDeg: Number(c.wind_direction_10m ?? 0),
  };
}

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
