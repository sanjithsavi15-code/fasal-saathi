"""EpiGrid API — Telemetry ingestion router.

Exposes the ``POST /api/telemetry/ingest`` endpoint for persisting
outbreak field reports received from the Next.js frontend.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, status

from models.schemas import IngestResponse, OutbreakPayload

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest an outbreak payload from the field portal",
)
async def ingest_outbreak(payload: OutbreakPayload) -> IngestResponse:
    """Accept a validated outbreak report and persist it.

    **Current behaviour (stub):** returns an acknowledgement with the
    received data and a generated incident ID.  In production this will
    write to the Supabase ``incidents`` table via the service layer.
    """
    incident_id = (
        f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        f"-{uuid.uuid4().hex[:6]}"
    )

    # TODO: persist to Supabase
    # from services.supabase_client import supabase
    # supabase.table("incidents").insert({...}).execute()

    return IngestResponse(
        status="ok",
        message="Outbreak payload ingested successfully.",
        received=payload,
        incident_id=incident_id,
    )
