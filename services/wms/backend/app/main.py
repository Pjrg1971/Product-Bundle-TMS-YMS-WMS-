import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        logger.info(f"WMS started — schema={settings.DB_SCHEMA}, db={settings.DATABASE_URL.split('@')[-1]}")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "wms", "schema": settings.DB_SCHEMA}

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app


app = create_app()
