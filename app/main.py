import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.lifecycle_routes import lifecycle_router
from app.api.firewall_routes import firewall_router
from app.api.entity_routes import entity_router
from app.api.audit_routes import audit_router
from app.api.calibration_routes import calibration_router
from app.api.monitoring_routes import monitoring_router
from app.api.v1 import v1_risk_router, v1_event_router, v1_sandbox_router
from app.errors.handlers import register_error_handlers
from app.config import settings
from app.db import repository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="AegisPay",
        version="0.5.0",
        description="AegisPay Deterministic Risk Decisioning & Production Operations Engine",
    )
    register_error_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Internal & Admin Routers
    app.include_router(router)
    app.include_router(lifecycle_router)
    app.include_router(firewall_router)
    app.include_router(entity_router)
    app.include_router(audit_router)
    app.include_router(calibration_router)
    app.include_router(monitoring_router)

    # Public V1 API Routers
    app.include_router(v1_risk_router)
    app.include_router(v1_event_router)
    app.include_router(v1_sandbox_router)

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
