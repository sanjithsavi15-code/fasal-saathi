"""ICAR / govt crop-protection advisory lookup (MongoDB placeholder)."""

from __future__ import annotations

# Placeholder catalogue mirroring ICAR / SAU extension advisories.
# In production this would query MongoDB / an official package-of-practices API.
_ICAR_CURE_CATALOGUE: dict[str, str] = {
    "healthy": (
        "No pathogen detected. Continue ICAR-recommended scouting schedule "
        "and maintain field sanitation; no curative spray required."
    ),
    "late blight": (
        "ICAR advisory: Apply systemic fungicide (Metalaxyl 8% + Mancozeb 64% WP "
        "@ 2.5 g/L) within 24 hours; remove infected haulms; avoid overhead irrigation "
        "during evening hours (Package of Practices — potato)."
    ),
    "early blight": (
        "ICAR advisory: Spray Chlorothalonil 75% WP @ 2 g/L or Mancozeb 75% WP "
        "@ 2.5 g/L at 7–10 day intervals; improve air flow by staking; remove lower "
        "infected leaves (tomato / potato PoP)."
    ),
    "powdery mildew": (
        "ICAR advisory: Apply wettable sulphur 80% WP @ 2–3 g/L or Hexaconazole 5% EC "
        "@ 1 ml/L at first sign of white powdery patches; avoid excess nitrogen "
        "(grape / cucurbit PoP)."
    ),
    "bacterial wilt": (
        "ICAR advisory: Uproot and destroy wilted plants; drench rhizosphere with "
        "bleaching powder (15–20 kg/ha) or copper oxychloride 50% WP @ 3 g/L; "
        "rotate with non-solanaceous crops for 2–3 seasons."
    ),
    "leaf rust": (
        "ICAR advisory: Spray Propiconazole 25% EC @ 1 ml/L at first pustule appearance; "
        "prefer resistant wheat varieties recommended for the zone; avoid late sowing."
    ),
    "anthracnose": (
        "ICAR advisory: Apply Carbendazim 50% WP @ 1 g/L or Copper oxychloride 50% WP "
        "@ 2.5 g/L; remove infected debris; ensure seed treatment before next sowing "
        "(onion / chilli PoP)."
    ),
    "red rot": (
        "ICAR advisory: Immediately uproot and burn affected clumps. Do not ratoon the diseased crop. "
        "Ensure proper drainage to prevent water-borne spore spread. For next planting, treat setts with "
        "Carbendazim 50 WP @ 0.1%."
    ),
}

_DEFAULT_CURE = (
    "ICAR general advisory: Isolate affected rows, increase scouting frequency, "
    "and consult your local Krishi Vigyan Kendra (KVK) for zone-specific chemical "
    "and cultural recommendations."
)


def fetch_icar_cure(disease_name: str) -> str:
    """
    Placeholder for a MongoDB / govt dataset query.

    Example production shape::

        db.icar_advisories.find_one({"disease": disease_name})

    Returns the official cure / mitigation string for the diagnosed pathogen.
    """
    if not disease_name:
        return _DEFAULT_CURE

    key = (
        disease_name.lower()
        .replace("(no disease detected)", "")
        .strip()
    )
    # Strip common parentheticals
    if "(" in key:
        key = key.split("(", 1)[0].strip()

    for catalogue_key, cure in _ICAR_CURE_CATALOGUE.items():
        if catalogue_key in key or key in catalogue_key:
            return cure

    return _DEFAULT_CURE
