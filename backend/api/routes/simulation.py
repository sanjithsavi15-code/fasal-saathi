"""Fasal Saathi API — Simulation & RL prediction router.

POST /api/simulation/predict
  Accepts weather + crop + disease telemetry and returns spread geometry,
  risk zones, and RL prevention steps.
"""

from __future__ import annotations

from fastapi import APIRouter

from models.schemas import OutbreakPayload, RiskZone, SimulationResponse
from services.dispersion import calculate_trajectory
from services.rl_engine.agent import PolicyAgent

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

_agent = PolicyAgent(model_path=None)

_RISK_ZONE_CATALOGUE: dict[str, list[RiskZone]] = {
    "critical": [
        RiskZone(
            level="high",
            label="High Risk",
            color="#b85d38",
            description="Immediate containment required in the cone.",
        ),
        RiskZone(
            level="monitor",
            label="Monitor",
            color="#c99a3e",
            description="Watch neighbouring plots for early symptoms.",
        ),
        RiskZone(
            level="safe",
            label="Lower Risk",
            color="#1b4332",
            description="Upwind / buffered zones remain lower risk.",
        ),
    ],
    "warning": [
        RiskZone(
            level="monitor",
            label="Monitor",
            color="#c99a3e",
            description="Elevated spore pressure — scout twice daily.",
        ),
        RiskZone(
            level="high",
            label="High Risk",
            color="#b85d38",
            description="Core outbreak node and near-downwind strips.",
        ),
        RiskZone(
            level="safe",
            label="Lower Risk",
            color="#1b4332",
            description="Distant upwind fields.",
        ),
    ],
    "contained": [
        RiskZone(
            level="safe",
            label="Contained",
            color="#1b4332",
            description="Spread trajectory is limited under current weather.",
        ),
        RiskZone(
            level="monitor",
            label="Monitor",
            color="#c99a3e",
            description="Continue routine scouting for 7 days.",
        ),
    ],
}


@router.post(
    "/predict",
    response_model=SimulationResponse,
    summary="Run dispersion prediction and generate RL prevention steps",
)
async def predict(payload: OutbreakPayload) -> SimulationResponse:
    """Combine atmospheric dispersion with the RL policy agent."""

    policy: dict = _agent.evaluate_state(payload)

    trajectory: list[list[float]] = calculate_trajectory(
        lat=payload.latitude,
        lon=payload.longitude,
        wind_speed=payload.windSpeedKmh,
        wind_bearing=payload.windDirectionDeg,
    )

    risk_level = str(policy.get("risk_level", "warning"))
    interventions = list(policy.get("interventions") or [])
    if not interventions:
        interventions = [
            "Apply systemic fungicide within 24 hours",
            "Increase field scouting along the downwind edge",
        ]

    return SimulationResponse(
        spread_polygon_coordinates=trajectory,
        risk_zones=_RISK_ZONE_CATALOGUE.get(
            risk_level, _RISK_ZONE_CATALOGUE["warning"]
        ),
        prevention_steps=interventions,
        risk_level=risk_level,
        policy_id=str(policy.get("policy_id", "")),
    )
