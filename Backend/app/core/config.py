from typing import List, Union, Literal
from pydantic import field_validator, model_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "KayıpQR API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    SECRET_KEY: str = "supersecret_kayipqr_jwt_key_change_in_production_secure_random"
    ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24, ge=1, le=1440)

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./kayipqr.db"
    DB_POOL_SIZE: int = Field(default=5, ge=1, le=50)
    DB_MAX_OVERFLOW: int = Field(default=5, ge=0, le=50)
    REDIS_URL: str = ""
    REDIS_PREFIX: str = "kayipqr"
    APP_ROLE: Literal["web", "worker"] = "web"
    RUN_BACKGROUND_TASKS: bool = True  # Local/Compose only; Railway web sets false.
    RUN_MIGRATIONS: bool = False  # Railway uses a pre-deploy command instead.

    # URLs
    PUBLIC_APP_URL: str = "http://localhost:3000"
    BACKEND_BASE_URL: str = "http://localhost:8000"

    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = Field(default=5, ge=1, le=20)
    MAX_ACTIVE_REQUESTS: int = Field(default=200, ge=10, le=10000)
    MAX_STORAGE_SIZE_MB: int = Field(default=1024, ge=20)
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    S3_ENDPOINT_URL: str = ""
    S3_BUCKET: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "auto"
    S3_ADDRESSING_STYLE: Literal["virtual", "path"] = "virtual"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Security & Proxies
    TRUSTED_PROXIES: List[str] = ["127.0.0.1", "::1"]
    PROXY_MODE: Literal["explicit", "railway"] = "explicit"
    ENABLE_EXTERNAL_GEOIP: bool = False

    @field_validator("DATABASE_URL", mode="before")
    def assemble_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("PUBLIC_APP_URL", mode="after", check_fields=False)
    def assemble_public_app_url(cls, v: str) -> str:
        if v == "http://localhost:3000" and os.getenv("FRONTEND_URL"):
            return os.getenv("FRONTEND_URL", v)
        return v

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return []

    @field_validator("TRUSTED_PROXIES", mode="before")
    def assemble_trusted_proxies(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return ["127.0.0.1", "::1"]

    @field_validator("SECRET_KEY")
    def validate_secret_key(cls, v: str, info) -> str:
        # In production mode, forbid default or weak keys
        env = info.data.get("ENVIRONMENT", "development") if info.data else "development"
        if env in ("production", "staging"):
            if any(marker in v.lower() for marker in ("supersecret", "please-set", "change-in", "change_me", "changeme", "your-secret")) or len(v) < 32 or len(set(v)) < 12:
                raise ValueError("CRITICAL SECURITY RISK: In production, SECRET_KEY must be a cryptographically secure random string with at least 32 characters.")
        return v

    @field_validator("TRUSTED_PROXIES")
    def validate_proxy_networks(cls, values):
        import ipaddress
        for value in values:
            ipaddress.ip_network(value, strict=False)
        return values

    # Optional Email Settings
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = ""
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "info@kayipqr.com"
    EMAILS_FROM_NAME: str = "KayıpQR"
    EMAIL_PROVIDER: Literal["smtp", "resend"] = "smtp"
    RESEND_API_KEY: str = ""

    @model_validator(mode="after")
    def validate_production(self):
        if self.STORAGE_BACKEND == "s3" and not all((self.S3_ENDPOINT_URL, self.S3_BUCKET, self.S3_ACCESS_KEY_ID, self.S3_SECRET_ACCESS_KEY)):
            raise ValueError("S3 storage requires endpoint, bucket and credentials.")
        if self.ENVIRONMENT in ("production", "staging"):
            if self.STORAGE_BACKEND == "s3" and not self.S3_ENDPOINT_URL.startswith("https://"):
                raise ValueError("Production S3 endpoint must use HTTPS.")
            if self.EMAIL_PROVIDER == "resend" and not self.RESEND_API_KEY:
                raise ValueError("Resend requires RESEND_API_KEY.")
            if self.EMAIL_PROVIDER == "smtp" and not all((self.SMTP_HOST, self.SMTP_USER, self.SMTP_PASSWORD)):
                raise ValueError("Production requires SMTP_HOST, SMTP_USER and SMTP_PASSWORD.")
            if self.EMAIL_PROVIDER == "smtp" and self.SMTP_PORT != 465 and not self.SMTP_TLS:
                raise ValueError("Production SMTP must use TLS.")
            if not self.PUBLIC_APP_URL.startswith("https://"):
                raise ValueError("Production PUBLIC_APP_URL must use HTTPS.")
            if "*" in self.TRUSTED_PROXIES:
                raise ValueError("TRUSTED_PROXIES must contain explicit addresses or CIDRs.")
            if os.getenv("RAILWAY_PROJECT_ID"):
                if not self.REDIS_URL or self.STORAGE_BACKEND != "s3" or not self.DATABASE_URL.startswith("postgresql+asyncpg://"):
                    raise ValueError("Railway production requires PostgreSQL, Redis and S3 storage.")
                if self.RUN_MIGRATIONS:
                    raise ValueError("Railway migrations must run in pre-deploy, not in each replica.")
                if self.APP_ROLE == "web" and self.RUN_BACKGROUND_TASKS:
                    raise ValueError("Railway web must set RUN_BACKGROUND_TASKS=false and use a worker service.")
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", enable_decoding=False, hide_input_in_errors=True)


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
