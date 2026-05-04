"""FastAPI application entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kdoc import __version__
from kdoc.api import connectors, doka, documents, health, me, search, tasks, tools
from kdoc.db.base import Base
from kdoc.db.session import engine
from kdoc.settings import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("kdoc")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on dev (SQLite). Prod uses Alembic.
    if settings.env == "local":
        from kdoc.db import models  # noqa: F401  ensure import for metadata

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("DB initialised (local mode, tables created)")

    # Production-only: enforce Stripe webhook secret presence
    if settings.is_production and not settings.stripe_webhook_secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET required in production")

    logger.info("kdoc backend %s started in %s mode", __version__, settings.env)
    yield
    await engine.dispose()


app = FastAPI(
    title="kdoc API",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(me.router)
app.include_router(documents.router)
app.include_router(tasks.router)
app.include_router(tools.router)
app.include_router(search.router)
app.include_router(doka.router)
app.include_router(connectors.router)
