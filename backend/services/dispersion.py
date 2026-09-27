"""EpiGrid Services — Atmospheric dispersion trajectory calculator.

Implements a simplified downwind spread-cone model using flat-earth GIS
approximations (valid for distances < ~50 km at mid-latitudes).  The cone
projects outward from the infection origin in the wind-bearing direction.
"""

from __future__ import annotations

import math


# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------

_DEG_PER_KM_LAT: float = 1.0 / 111.0  # ≈ 0.009009°
_CONE_HALF_ANGLE_DEG: float = 15.0     # Total cone spread = 30°


def _deg_per_km_lng(latitude_deg: float) -> float:
    """Return degrees-of-longitude per kilometre at a given latitude.

    Uses the standard cos-correction:
        1° longitude ≈ 111 km × cos(lat)  →  1 km ≈ 1 / (111 × cos(lat)) °
    """
    cos_lat = math.cos(math.radians(latitude_deg))
    if cos_lat < 1e-9:
        # Near the poles the flat-earth model collapses; clamp to avoid ÷0.
        cos_lat = 1e-9
    return 1.0 / (111.0 * cos_lat)


def calculate_trajectory(
    lat: float,
    lon: float,
    wind_speed: float,
    wind_bearing: float,
) -> list[list[float]]:
    """Compute a 4-point spread-cone polygon downwind from *origin*.

    Parameters
    ----------
    lat, lon:
        Infection epicentre coordinates (decimal degrees).
    wind_speed:
        Surface wind speed in **km/h**.  Higher values produce a longer
        cone — the spore cloud can travel further before viability drops.
    wind_bearing:
        Meteorological wind bearing in degrees (0 = N, 90 = E, 180 = S,
        270 = W).

    Returns
    -------
    list[list[float]]
        Four ``[latitude, longitude]`` vertices forming a closed polygon:

        - **Point 0** — origin (epicentre)
        - **Point 1** — left edge of the cone
        - **Point 2** — tip (furthest downwind extent)
        - **Point 3** — right edge of the cone

        The first and last points are identical so the polygon closes
        properly on a Leaflet / Mapbox layer.

    Notes
    -----
    The projection uses a flat-earth approximation.  For the small
    distances typical of agricultural dispersion (< 10 km) the error is
    negligible compared to the inherent uncertainty of the atmospheric
    model itself.
    """

    # -- Distance scaling ----------------------------------------------------
    # Heuristic: the spore cloud travels ~1/10th of wind-speed (km/h) in km
    # over a 24-hour viability window, capped for the demo.
    travel_km: float = max(wind_speed * 0.10, 0.5)
    travel_km = min(travel_km, 10.0)

    # -- Convert meteorological bearing to math angle (radians) --------------
    # Meteorological: 0° = N (positive-y axis), clockwise.
    # Math angle:     0° = E (positive-x axis), counter-clockwise.
    wind_rad: float = math.radians(90.0 - wind_bearing)

    # -- Per-km degree factors at the origin latitude ------------------------
    dplat: float = _DEG_PER_KM_LAT
    dplng: float = _deg_per_km_lng(lat)

    # -- Half-angle of the spread cone (radians) -----------------------------
    half_angle: float = math.radians(_CONE_HALF_ANGLE_DEG)

    # -- Build the four vertices ---------------------------------------------
    # Helper to project a point at (angle, distance_km) from origin.
    def _project(angle_rad: float, dist_km: float) -> list[float]:
        return [
            lat + math.sin(angle_rad) * dist_km * dplat,
            lon + math.cos(angle_rad) * dist_km * dplng,
        ]

    origin: list[float] = [lat, lon]

    left_edge = _project(wind_rad + half_angle, travel_km)
    tip = _project(wind_rad, travel_km * 1.2)              # slightly beyond edges
    right_edge = _project(wind_rad - half_angle, travel_km)

    return [origin, left_edge, tip, right_edge]
