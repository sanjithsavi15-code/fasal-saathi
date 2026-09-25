"""Fasal Saathi Models — Request / response schemas for the API layer.

Field names that face the Next.js client use camelCase or the Fasal Saathi
contract names documented in the product brief.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
#  Request payloads
# ---------------------------------------------------------------------------


class OutbreakPayload(BaseModel):
    """Telemetry + biology payload for RL / dispersion simulation."""

    district: str = Field(..., min_length=1, examples=["Nashik"])
    sector: str = Field(default="Farm Block", min_length=1, examples=["Farm Block A"])
    cropType: str = Field(..., alias="cropType", min_length=1, examples=["Potato"])
    pathogen: str = Field(
        ..., min_length=1, examples=["Late Blight (Phytophthora infestans)"]
    )

    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[19.9975])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[73.7898])

    windSpeedKmh: float = Field(..., alias="windSpeedKmh", ge=0.0, examples=[14.5])
    windDirectionDeg: float = Field(
        ..., alias="windDirectionDeg", ge=0.0, le=360.0, examples=[217.0]
    )
    humidityPct: float = Field(..., alias="humidityPct", ge=0.0, le=100.0, examples=[84.0])
    temperatureC: float = Field(..., alias="temperatureC", examples=[22.4])

    sourceMode: str = Field(
        default="manual", alias="sourceMode", examples=["manual", "live"]
    )

    model_config = {"populate_by_name": True}


class RiskZone(BaseModel):
    """A labelled risk band for the map legend / UI."""

    level: str = Field(..., examples=["high", "monitor", "safe"])
    label: str = Field(..., examples=["High Risk"])
    color: str = Field(..., examples=["#b85d38"])
    description: str = Field(
        ..., examples=["Immediate containment recommended downwind."]
    )


# ---------------------------------------------------------------------------
#  Response payloads — Fasal Saathi RL contract
# ---------------------------------------------------------------------------


class SimulationResponse(BaseModel):
    """RL engine + dispersion output for the farmer Diagnostic Center.

    Contract:
      {
        "spread_polygon_coordinates": [[lat, lng], ...],
        "risk_zones": [...],
        "prevention_steps": ["...", "..."]
      }
    """

    spread_polygon_coordinates: list[list[float]] = Field(
        ...,
        description="Ordered [latitude, longitude] ring for the hazard cone",
        examples=[
            [
                [19.9975, 73.7898],
                [20.023, 73.832],
                [20.04, 73.857],
                [19.9975, 73.7898],
            ]
        ],
    )
    risk_zones: list[RiskZone] = Field(default_factory=list)
    prevention_steps: list[str] = Field(
        ...,
        examples=[
            [
                "Apply systemic fungicide within 24 hours",
                "Establish a 2 km quarantine buffer downwind",
            ]
        ],
    )

    # Convenience metadata (non-breaking extras for UI badges)
    risk_level: str = Field(default="warning", examples=["critical", "warning", "contained"])
    policy_id: str = Field(default="", examples=["POL-20260923-a1b2c3"])


# ---------------------------------------------------------------------------
#  Telemetry responses
# ---------------------------------------------------------------------------


class IngestResponse(BaseModel):
    """Acknowledgement returned after a successful telemetry ingest."""

    status: str = "ok"
    message: str = "Outbreak payload ingested successfully."
    received: OutbreakPayload
    incident_id: str | None = None
