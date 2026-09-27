"""Fasal Saathi Backend — FastAPI application entry point.

Start with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from transformers import pipeline

from api.routes.simulation import router as simulation_router
from api.routes.telemetry import router as telemetry_router
from services.icar_cures import fetch_icar_cure
from services.imd_weather import fetch_imd_weather, simulated_imd_payload

logger = logging.getLogger("epigrid.diagnosis")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
#  Crop-disease vision model (Hugging Face Transformers - CLIP Zero-Shot)
#  Stable zero-shot classification with exact dictionary key matching
# ---------------------------------------------------------------------------

# Initialize Hugging Face CLIP zero-shot image classification pipeline
print("[diagnosis] Loading CLIP zero-shot classification pipeline...")
logger.info("Loading CLIP zero-shot classification pipeline")
disease_classifier = pipeline(
    "zero-shot-image-classification",
    model="openai/clip-vit-base-patch32"
)
print("[diagnosis] CLIP pipeline loaded successfully")
logger.info("CLIP pipeline loaded successfully")


# ---------------------------------------------------------------------------
#  Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Fasal Saathi AI API",
    description=(
        "Backend for Fasal Saathi — crop disease vision diagnosis, "
        "IMD / data.gov.in weather telemetry, ICAR mitigation advisories, "
        "and RL-driven risk simulation."
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow the Next.js frontend (and other local origins) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def log_incoming_requests(request, call_next):
    """Debug networking — prove requests reach FastAPI (incl. CORS preflight)."""
    print(f"[http] {request.method} {request.url.path}")
    logger.info("%s %s", request.method, request.url.path)
    return await call_next(request)


# ---------------------------------------------------------------------------
#  Routers
# ---------------------------------------------------------------------------

app.include_router(simulation_router)
app.include_router(telemetry_router)

# ---------------------------------------------------------------------------
#  IMD / data.gov.in weather telemetry
# ---------------------------------------------------------------------------


@app.get("/api/telemetry/weather", tags=["Telemetry"])
async def get_imd_weather(
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    district: str | None = Query(default=None, min_length=1),
) -> dict[str, Any]:
    """
    Fetch current weather from the IMD catalogue on api.data.gov.in.

    Accepts ``latitude`` + ``longitude`` and/or a ``district`` name.
    Missing API key, upstream timeout, or any IMD failure returns a
    realistic simulated payload with HTTP 200 — the intended demo path.
    """
    if latitude is None and longitude is None and not district:
        # Still succeed for the demo shell with a default Nashik payload.
        return simulated_imd_payload(district="Nashik")

    try:
        return await fetch_imd_weather(
            latitude=latitude,
            longitude=longitude,
            district=district,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Weather route falling back to simulated IMD (%s)", exc
        )
        return simulated_imd_payload(
            district=district,
            latitude=latitude,
            longitude=longitude,
        )


# ---------------------------------------------------------------------------
#  Vision diagnosis + ICAR cure
# ---------------------------------------------------------------------------


@app.post("/api/diagnosis/classify", tags=["Diagnosis"])
async def classify_disease(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Run the sugarcane disease classifier on an uploaded leaf image,
    then attach the official ICAR mitigation advisory for the pathogen.

    Returns
    -------
    {"crop_type": "Sugarcane", "disease": "Red Rot Disease", "confidence": 0.98, "cure": "..."}
    """
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty upload.")

        # Open PIL Image - sugarcane model handles preprocessing automatically
        image = Image.open(io.BytesIO(raw)).convert("RGB")
        image.load()

        print("[diagnosis] Running CLIP zero-shot inference...")
        logger.info("Running CLIP zero-shot inference")

        # Define exact candidate labels that map directly to database keys
        candidate_labels = [
            "Sugarcane Red Rot",
            "Sugarcane Mosaic Disease",
            "Sugarcane Rust",
            "Healthy Sugarcane",
            "Not a Sugarcane plant",
        ]

        # Run CLIP inference with candidate labels
        results = disease_classifier(image, candidate_labels=candidate_labels)
        raw_label = results[0]["label"]
        confidence = round(results[0]["score"], 2)
        
        # Rejection logic: intercept negative class
        if raw_label == "Not a Sugarcane plant":
            raise HTTPException(
                status_code=400,
                detail="Classification failed. Image does not appear to be a sugarcane plant."
            )
        
        # Dynamically clean label to match database key by stripping crop name
        disease_key = raw_label.replace("Sugarcane", "").strip()
        
        # Set crop_type and assign cleaned disease
        crop_type = "Sugarcane"
        disease = disease_key
        
        # Pass dynamically predicted disease to ICAR database lookup
        cure = fetch_icar_cure(disease)

        print(
            f"[diagnosis] Prediction: crop_type={crop_type!r} "
            f"disease={disease!r} confidence={confidence}"
        )
        logger.info(
            "Prediction: crop_type=%s disease=%s confidence=%.2f",
            crop_type,
            disease,
            confidence,
        )

        return {
            "crop_type": crop_type,
            "disease": disease,
            "confidence": confidence,
            "cure": cure,
        }
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        print(f"[diagnosis] Inference failed: {e}")
        logger.exception("Vision inference failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ---------------------------------------------------------------------------
#  Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["Infrastructure"])
async def health_check() -> dict[str, str]:
    """Liveness probe — returns ``{"status": "ok"}``."""
    return {"status": "ok"}
