FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

COPY pyproject.toml ./
RUN pip install --no-cache-dir uv && \
    uv pip install --system --no-cache fastapi "uvicorn[standard]" pydantic pydantic-settings \
        "sqlalchemy[asyncio]" aiosqlite asyncpg alembic httpx "pyjwt[crypto]" python-multipart \
        boto3 redis arq structlog stripe cryptography pymupdf pillow "sentry-sdk[fastapi]"

COPY kdoc ./kdoc
COPY alembic ./alembic
COPY alembic.ini ./

EXPOSE 8000

CMD ["uvicorn", "kdoc.main:app", "--host", "0.0.0.0", "--port", "8000"]
