from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    trustfix_env: str = "development"
    trustfix_platform_project_id: str | None = None
    trustfix_target_project_id: str | None = None
    google_cloud_location: str = "global"
    google_cloud_region: str = "us-central1"
    trustfix_model: str = "gemini-3.5-flash"
    firestore_database: str = "(default)"
    evidence_bucket: str | None = None
    pubsub_scan_topic: str = "trustfix-scan-jobs"
    pubsub_remediation_topic: str = "trustfix-remediation-jobs"
    allowed_origins: str = "http://localhost:3000"
    preview_mode: bool = True
    store_backend: str = "memory"
    auth_mode: str = "dev"
    trustfix_iap_audience: str | None = None
    trustfix_dev_user_email: str = "owner@trustfix.local"
    web_app_url: str = "http://localhost:3000"
    trustfix_worker_role: str = "all"

    @property
    def live_mode(self) -> bool:
        return bool(self.trustfix_target_project_id) and not self.preview_mode


@lru_cache
def get_settings() -> Settings:
    return Settings()
