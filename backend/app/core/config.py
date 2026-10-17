# OWNER: Member 3
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+psycopg://careflow:careflow@localhost:5432/careflow"
    frontend_origin: str = "http://localhost:3000"

    session_secret: str = "change-me"
    session_max_age_seconds: int = 60 * 60 * 24 * 7
    demo_auth_enabled: bool = False
    email_provider_api_key: str = ""
    email_from: str = ""

    gemini_api_key: str = ""
    gemini_model: str = ""          # verify availability; no hardcoded default
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    elevenlabs_model_id: str = "eleven_multilingual_v2"
    presage_api_key: str = ""

    # Snowflake Cortex Search over public ClinicalTrials.gov data only (never patient data).
    snowflake_account_url: str = ""     # https://<account>.snowflakecomputing.com
    snowflake_pat: str = ""             # programmatic access token
    snowflake_database: str = "CAREFLOW"
    snowflake_schema: str = "TRIALS"
    snowflake_search_service: str = "TRIAL_SEARCH"
    snowflake_warehouse: str = "CAREFLOW_WH"    # used by scripts/sync_trials_snowflake.py


settings = Settings()
