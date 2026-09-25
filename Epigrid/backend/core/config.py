"""EpiGrid Core — Application settings loaded from environment variables.

Uses ``pydantic-settings`` to parse and validate env vars at startup.
Missing required fields cause an immediate, descriptive crash rather than
a silent ``None`` at runtime.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised configuration backed by a ``.env`` file or real env vars.

    Attributes
    ----------
    SUPABASE_URL:
        Full URL to your Supabase project (e.g. ``https://xxx.supabase.co``).
    SUPABASE_KEY:
        Supabase service-role or anon key for server-side access.
    """

    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Optional — data.gov.in / IMD open API. Empty → simulated IMD fallback.
    DATA_GOV_IN_API_KEY: str = ""
    DATA_GOV_IMD_RESOURCE_ID: str = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Singleton — imported throughout the application
settings = Settings()  # type: ignore[call-arg]
