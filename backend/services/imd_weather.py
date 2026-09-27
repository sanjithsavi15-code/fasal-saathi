"""IMD / data.gov.in weather client with simulated regional fallback."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("fasal_saathi.imd_weather")

# Resource id commonly used for IMD current-weather style catalogues on data.gov.in.
# Override via DATA_GOV_IMD_RESOURCE_ID when a project-specific dataset is registered.
_DEFAULT_RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
_DATA_GOV_BASE = "https://api.data.gov.in/resource"

# Approximate district centroids (Maharashtra focus) for fallback / query hints.
DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "nashik": (19.9975, 73.7898),
    "pune rural": (18.5204, 73.8567),
    "pune": (18.5204, 73.8567),
    "ahmednagar": (19.0952, 74.7496),
    "satara": (17.6805, 74.0183),
    "kolhapur": (16.7050, 74.2433),
    "solapur": (17.6599, 75.9064),
    "aurangabad": (19.8762, 75.3433),
    "chhatrapati sambhajinagar": (19.8762, 75.3433),
    "jalgaon": (21.0077, 75.5626),
}

# Realistic IMD-style climatology for western Maharashtra kharif / rabi shoulder.
_SIMULATED_BY_DISTRICT: dict[str, dict[str, float]] = {
    "nashik": {
        "temperature_c": 24.6,
        "humidity_pct": 78.0,
        "wind_speed_kmh": 12.4,
        "wind_direction_deg": 225.0,
    },
    "pune": {
        "temperature_c": 26.1,
        "humidity_pct": 72.0,
        "wind_speed_kmh": 10.8,
        "wind_direction_deg": 210.0,
    },
    "pune rural": {
        "temperature_c": 25.4,
        "humidity_pct": 74.0,
        "wind_speed_kmh": 11.2,
        "wind_direction_deg": 215.0,
    },
    "ahmednagar": {
        "temperature_c": 27.2,
        "humidity_pct": 68.0,
        "wind_speed_kmh": 13.5,
        "wind_direction_deg": 240.0,
    },
    "satara": {
        "temperature_c": 23.8,
        "humidity_pct": 80.0,
        "wind_speed_kmh": 9.6,
        "wind_direction_deg": 200.0,
    },
    "kolhapur": {
        "temperature_c": 25.9,
        "humidity_pct": 82.0,
        "wind_speed_kmh": 8.4,
        "wind_direction_deg": 195.0,
    },
    "solapur": {
        "temperature_c": 29.1,
        "humidity_pct": 55.0,
        "wind_speed_kmh": 15.2,
        "wind_direction_deg": 260.0,
    },
    "aurangabad": {
        "temperature_c": 28.4,
        "humidity_pct": 58.0,
        "wind_speed_kmh": 14.1,
        "wind_direction_deg": 250.0,
    },
    "jalgaon": {
        "temperature_c": 28.8,
        "humidity_pct": 60.0,
        "wind_speed_kmh": 13.0,
        "wind_direction_deg": 245.0,
    },
}

_DEFAULT_SIMULATED = {
    "temperature_c": 25.0,
    "humidity_pct": 75.0,
    "wind_speed_kmh": 12.0,
    "wind_direction_deg": 220.0,
}


def resolve_district_coords(district: str | None) -> tuple[float, float] | None:
    if not district:
        return None
    key = district.strip().lower()
    return DISTRICT_COORDS.get(key)


def simulated_imd_payload(
    *,
    district: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict[str, Any]:
    """Realistic IMD-shaped fallback when data.gov.in is unavailable."""
    key = (district or "Nashik").strip().lower()
    base = dict(_SIMULATED_BY_DISTRICT.get(key, _DEFAULT_SIMULATED))
    coords = resolve_district_coords(district) or (
        (latitude, longitude) if latitude is not None and longitude is not None else (19.9975, 73.7898)
    )
    return {
        "temperature_c": base["temperature_c"],
        "humidity_pct": base["humidity_pct"],
        "wind_speed_kmh": base["wind_speed_kmh"],
        "wind_direction_deg": base["wind_direction_deg"],
        "district": district or "Nashik",
        "latitude": float(coords[0]),
        "longitude": float(coords[1]),
        "source": "simulated_imd",
        "note": "Fallback IMD-style payload — data.gov.in key missing or upstream timeout.",
    }


def _parse_data_gov_records(records: list[dict[str, Any]]) -> dict[str, float] | None:
    """Best-effort field mapping across IMD / open data catalogue variants."""
    if not records:
        return None
    row = records[0]
    # Normalise keys to lowercase for fuzzy matching
    lower = {str(k).lower(): v for k, v in row.items()}

    def pick(*names: str) -> float | None:
        for name in names:
            if name in lower and lower[name] not in (None, ""):
                try:
                    return float(lower[name])
                except (TypeError, ValueError):
                    continue
        return None

    temp = pick("temperature", "temp", "temp_c", "air_temperature", "tmax", "temperature_c")
    humidity = pick("humidity", "rh", "relative_humidity", "humidity_pct")
    wind_speed = pick("wind_speed", "ws", "windspeed", "wind_speed_kmh", "wind_speed_kmph")
    wind_dir = pick("wind_direction", "wd", "winddir", "wind_direction_deg", "wind_dir")

    if temp is None and humidity is None:
        return None

    return {
        "temperature_c": temp if temp is not None else 25.0,
        "humidity_pct": humidity if humidity is not None else 70.0,
        "wind_speed_kmh": wind_speed if wind_speed is not None else 10.0,
        "wind_direction_deg": wind_dir if wind_dir is not None else 200.0,
    }


async def fetch_imd_weather(
    *,
    latitude: float | None = None,
    longitude: float | None = None,
    district: str | None = None,
) -> dict[str, Any]:
    """
    Hit api.data.gov.in IMD weather resource.

    Falls back to a simulated regional payload when the API key is missing,
    the request times out, or the response cannot be parsed.
    """
    if latitude is None or longitude is None:
        coords = resolve_district_coords(district)
        if coords:
            latitude, longitude = coords
        else:
            latitude, longitude = 19.9975, 73.7898

    api_key = os.getenv("DATA_GOV_IN_API_KEY", "").strip()
    resource_id = os.getenv("DATA_GOV_IMD_RESOURCE_ID", _DEFAULT_RESOURCE_ID).strip()

    try:
        from core.config import settings

        if not api_key:
            api_key = (settings.DATA_GOV_IN_API_KEY or "").strip()
        if settings.DATA_GOV_IMD_RESOURCE_ID:
            resource_id = settings.DATA_GOV_IMD_RESOURCE_ID.strip()
    except Exception:  # noqa: BLE001
        pass

    if not api_key:
        logger.warning("DATA_GOV_IN_API_KEY missing — using simulated IMD weather")
        return simulated_imd_payload(
            district=district, latitude=latitude, longitude=longitude
        )

    url = f"{_DATA_GOV_BASE}/{resource_id}"
    params: dict[str, Any] = {
        "api-key": api_key,
        "format": "json",
        "limit": 10,
    }
    # Optional filters — catalogues differ; ignored harmlessly if unsupported.
    if district:
        params["filters[district]"] = district
        params["filters[station]"] = district

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:  # noqa: BLE001 — timeout / network / 4xx/5xx → demo fallback
        logger.warning("IMD / data.gov.in request failed (%s) — using fallback", exc)
        return simulated_imd_payload(
            district=district, latitude=latitude, longitude=longitude
        )

    records = payload.get("records") if isinstance(payload, dict) else None
    if not isinstance(records, list):
        logger.warning("IMD response missing records — using fallback")
        return simulated_imd_payload(
            district=district, latitude=latitude, longitude=longitude
        )

    parsed = _parse_data_gov_records(records)
    if parsed is None:
        logger.warning("Could not parse IMD fields — using fallback")
        return simulated_imd_payload(
            district=district, latitude=latitude, longitude=longitude
        )

    return {
        **parsed,
        "district": district or "Unknown",
        "latitude": float(latitude),
        "longitude": float(longitude),
        "source": "data.gov.in/imd",
        "note": None,
    }
