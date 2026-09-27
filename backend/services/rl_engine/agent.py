"""EpiGrid ML Engine — Reinforcement-learning policy agent.

The ``PolicyAgent`` class wraps what will eventually be a PyTorch-backed RL
model operating in an OpenAI-Gym–style spatial environment.  For the
prototype, it uses deterministic conditional logic that maps pathogen ×
environmental state to agronomically plausible containment policies.

The class is structured for drop-in replacement: swap the internals of
``evaluate_state`` once a trained model checkpoint is available.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from models.schemas import OutbreakPayload


# ---------------------------------------------------------------------------
#  Mitigation Knowledge Base
#  Scalable dictionary for crop-disease specific prevention strategies
# ---------------------------------------------------------------------------

MITIGATION_DB: dict[str, dict[str, list[str]]] = {
    "Sugarcane": {
        "Red Rot": [
            "1. Quarantine infected sugarcane plots and immediately halt irrigation runoff to neighboring fields.",
            "2. Apply Trichoderma viride enriched farmyard manure to the soil to suppress fungal growth.",
            "3. Issue localized alert for neighboring Ahmednagar sectors to monitor for yellowing/drying of third or fourth leaves.",
        ],
        "Mosaic Disease": [
            "1. Uproot and burn mosaic-infected clumps immediately.",
            "2. Control aphid vectors using recommended insecticides.",
            "3. Use certified virus-free seed setts for next planting.",
        ],
        "Rust": [
            "1. Apply Triadimefon or Mancozeb fungicide spray.",
            "2. Avoid excess nitrogen fertilization.",
            "3. Improve air circulation by adjusting row spacing.",
        ],
        "Healthy": [
            "1. Maintain current irrigation schedules.",
            "2. Continue routine soil nutrition management.",
            "3. No immediate mitigations required.",
        ],
    },
    "Potato": {
        "Late Blight": [
            "1. Apply systemic fungicide (Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/L) within 24 hours.",
            "2. Remove infected haulms and avoid overhead irrigation during evening hours.",
            "3. Establish quarantine buffer around affected fields to prevent spore dispersal.",
        ],
        "Early Blight": [
            "1. Spray Chlorothalonil 75% WP @ 2 g/L or Mancozeb 75% WP @ 2.5 g/L at 7–10 day intervals.",
            "2. Improve air flow by staking and remove lower infected leaves.",
            "3. Rotate with non-solanaceous crops for 2–3 seasons to break disease cycle.",
        ],
    },
    "Wheat": {
        "Leaf Rust": [
            "1. Spray Propiconazole 25% EC @ 1 ml/L at first pustule appearance.",
            "2. Prefer resistant wheat varieties recommended for the zone and avoid late sowing.",
            "3. Deploy spore-trap monitoring stations downwind of affected sectors.",
        ],
    },
    "Tomato": {
        "Bacterial Wilt": [
            "1. Uproot and destroy wilted plants immediately.",
            "2. Drench rhizosphere with bleaching powder (15–20 kg/ha) or copper oxychloride 50% WP @ 3 g/L.",
            "3. Rotate with non-solanaceous crops for 2–3 seasons to reduce soil inoculum.",
        ],
    },
}


def _generate_policy_id() -> str:
    """Return a unique, timestamped policy identifier."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    short_uid = uuid.uuid4().hex[:6]
    return f"POL-{ts}-{short_uid}"


class PolicyAgent:
    """Stub RL agent for outbreak containment policy generation.

    The production version will:

    1. Encode the ``OutbreakPayload`` into a tensor observation.
    2. Forward-pass through a trained policy network (``torch.nn.Module``).
    3. Decode the output logits into a ranked list of interventions.

    Parameters
    ----------
    model_path:
        Path to a serialised ``torch`` checkpoint.  ``None`` activates
        the deterministic stub fallback used in this prototype.
    """

    def __init__(self, model_path: str | None = None) -> None:
        self._model_path = model_path
        self._model: Any = None  # Will hold ``torch.nn.Module`` once loaded

        if model_path is not None:
            self._load_model(model_path)

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def evaluate_state(self, payload: OutbreakPayload) -> dict[str, Any]:
        """Evaluate the current outbreak state and return a policy.

        Parameters
        ----------
        payload:
            The validated outbreak telemetry from the frontend.

        Returns
        -------
        dict
            A dictionary with three keys:

            - ``policy_id`` (str): Unique evaluation identifier.
            - ``interventions`` (list[str]): Ordered containment actions.
            - ``risk_level`` (str): One of ``"critical"``, ``"warning"``,
              or ``"contained"``.
        """
        if self._model is not None:
            return self._infer(payload)
        return self._stub_evaluate(payload)

    # ------------------------------------------------------------------ #
    #  Internal — model loading                                           #
    # ------------------------------------------------------------------ #

    def _load_model(self, path: str) -> None:
        """Load a PyTorch checkpoint from disk.

        Placeholder — will use ``torch.load`` with ``weights_only=True``
        once a trained model is available.
        """
        # import torch
        # self._model = torch.load(path, weights_only=True)
        pass  # noqa: WPS420

    def _infer(self, payload: OutbreakPayload) -> dict[str, Any]:
        """Run a real forward pass through the loaded model."""
        raise NotImplementedError(
            "Model inference is not yet implemented. "
            "Train a policy network and point model_path to its checkpoint."
        )

    # ------------------------------------------------------------------ #
    #  Internal — prototype stub logic                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _stub_evaluate(payload: OutbreakPayload) -> dict[str, Any]:
        """Return a deterministic, agronomically plausible policy.

        Uses dynamic routing through MITIGATION_DB to avoid hardcoded if/else logic.
        Falls back to smart f-string generation for unknown crop-disease combinations.
        """
        policy_id: str = _generate_policy_id()
        humidity: float = payload.humidityPct
        crop_type: str = payload.cropType
        disease: str = payload.pathogen

        # Dynamic routing: Query MITIGATION_DB using .get() for safe key access
        crop_diseases = MITIGATION_DB.get(crop_type, {})
        interventions = crop_diseases.get(disease)

        if interventions:
            # Match found in database - return specific prevention steps
            risk_level = "critical" if humidity > 75.0 else "warning"
            return {
                "policy_id": policy_id,
                "interventions": interventions,
                "risk_level": risk_level,
            }

        # Smart fallback generator: Dynamic response using f-strings with payload variables
        fallback_interventions = [
            f"1. Isolate the symptomatic {crop_type} crops to prevent further spread.",
            f"2. Consult local agricultural extension offices regarding optimal fungicides for {disease}.",
            f"3. Adjust irrigation schedules for the {payload.district} region to limit canopy moisture.",
        ]
        risk_level = "warning" if humidity > 70.0 else "contained"

        return {
            "policy_id": policy_id,
            "interventions": fallback_interventions,
            "risk_level": risk_level,
        }
