# syntax=docker/dockerfile:1
# social-knowledge-base — single image that runs the web app and shells out to
# gallery-dl / yt-dlp / ffmpeg. `docker compose up` and it works anywhere.

# ---- builder: install deps + build the Next standalone bundle ----
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

# ---- runner: Node + Python downloaders + ffmpeg ----
FROM node:24-bookworm-slim AS runner
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \
 && pip3 install --no-cache-dir --break-system-packages "gallery-dl>=1.32" "yt-dlp>=2025.1" \
 && apt-get purge -y python3-pip && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PYTHON_BIN=python3 \
    SKB_ROOT=/data \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app
# Next standalone output: server.js + minimal node_modules + server chunks.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Data dir (downloads + manifests + cookies.txt) lives on a mounted volume.
RUN mkdir -p /data/downloads /data/manifests
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "server.js"]
