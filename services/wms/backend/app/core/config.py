from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Cowork WMS"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cowork_logistics"
    DB_SCHEMA: str = "wms"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
