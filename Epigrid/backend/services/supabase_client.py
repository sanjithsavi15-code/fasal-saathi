"""EpiGrid Services — Supabase Python client singleton."""

from __future__ import annotations

from supabase import Client, create_client

from core.config import settings


def get_supabase_client() -> Client:
    """Create and return a Supabase client instance.

    Called lazily so that import-time errors are avoided when the env vars
    are not yet loaded (e.g. during unit tests with monkeypatched settings).
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# Module-level convenience reference.
# Import as:  ``from services.supabase_client import supabase``
supabase: Client = get_supabase_client()
