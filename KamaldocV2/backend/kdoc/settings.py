"""Centralised settings via pydantic-settings."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    env: str = "local"
    log_level: str = "INFO"
    secret_key: str = "change-me"
    app_port: int = 8000

    database_url: str = "sqlite+aiosqlite:///./storage/kdoc.db"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    mistral_api_key: str = ""
    mistral_text_model: str = "mistral-large-latest"
    mistral_ocr_model: str = "mistral-ocr-latest"
    mistral_timeout_seconds: float = 30.0

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "kdoc-documents"
    r2_region: str = "auto"
    r2_public_url: str = ""

    redis_url: str = "redis://localhost:6379/0"

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_basic_price_id: str = ""
    stripe_pro_price_id: str = ""

    fcm_project_id: str = ""
    fcm_service_account_json: str = ""

    sentry_dsn: str = ""

    allowed_origins: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.env == "production"


settings = Settings()
