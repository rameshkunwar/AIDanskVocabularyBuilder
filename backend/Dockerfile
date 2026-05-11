# ============================================
# Stage 1: Install dependencies
# ============================================
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS deps

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
# Copy from the cache instead of linking since it's a separate volume
ENV UV_LINK_MODE=copy

# Install system dependencies required by psycopg2-binary
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# ============================================
# Stage 2: Production runtime
# ============================================
FROM python:3.13-slim-bookworm AS production

WORKDIR /app

# Install only the runtime library needed by psycopg2
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Copy the virtualenv from the deps stage
COPY --from=deps /app/.venv /app/.venv

# Ensure the virtualenv is used
ENV PATH="/app/.venv/bin:$PATH"

# Copy application source
COPY . .

# Create directories for runtime data
RUN mkdir -p /app/uploads /app/audio_cache

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "360"]