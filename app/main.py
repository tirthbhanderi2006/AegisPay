import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.lifecycle_routes import lifecycle_router
from app.api.firewall_routes import firewall_router
from app.config import settings
from app.db import repository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title="AegisPay", version="0.3.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.include_router(lifecycle_router)
    app.include_router(firewall_router)

    @app.on_event("startup")
    def _startup():
        if repository.init_schema():
            logger.info("Database schema ready at %s", settings.database_url)
        else:
            logger.warning(
                "Database unreachable; start it with `docker compose up -d`. "
                "Webhook processing will still work but results will not persist."
            )

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "model": settings.model_name,
            "database": "up" if repository.available() else "down",
        }

    return app


app = create_app()
