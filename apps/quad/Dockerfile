# ---- Build stage (TypeScript → JS) ----
FROM node:22-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY patches/ patches/
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/

RUN npx tsc

# ---- Runtime stage ----
# Base image includes: node:22-slim + ffmpeg + python3 + faster-whisper + CUDA libs + zeroc-ice
# Rebuild base with: gh workflow run quad-base-docker.yml (see Dockerfile.base)
FROM ghcr.io/paradoks81/quad-base:latest

WORKDIR /app

# Copy compiled JS + node_modules from build stage
COPY --from=build /app/dist/ dist/
COPY --from=build /app/node_modules/ node_modules/
COPY package.json ./

# Copy knowledge YAMLs (not compiled by tsc, needed at runtime)
COPY src/modules/processing/knowledge/ dist/modules/processing/knowledge/

# Copy Inter font files for canvas rendering
COPY fonts/ fonts/

# Copy Python scripts (transcription + Murmur ICE sidecar)
COPY scripts/transcribe.py scripts/transcribe.py
COPY scripts/mumble-ice.py scripts/mumble-ice.py
COPY scripts/MumbleServer.ice scripts/MumbleServer.ice

# Recordings volume mount point
RUN mkdir -p /app/recordings
VOLUME /app/recordings

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
