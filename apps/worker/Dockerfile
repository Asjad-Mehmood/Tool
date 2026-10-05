# Worker image: Node + every native binary the server tools need.
FROM node:22-bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc libreoffice-impress fonts-dejavu fonts-noto-core fonts-noto-ui-core \
      ghostscript qpdf ffmpeg ocrmypdf tesseract-ocr tesseract-ocr-eng tesseract-ocr-ara tesseract-ocr-urd \
      python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*
# Background removal: model is baked in at build time because the runtime has no internet.
RUN python3 -m venv /opt/rembg && /opt/rembg/bin/pip install --no-cache-dir "rembg[cpu,cli]" \
    && U2NET_HOME=/opt/u2net /opt/rembg/bin/rembg d u2net
ENV PATH="/opt/rembg/bin:${PATH}" U2NET_HOME=/opt/u2net NUMBA_CACHE_DIR=/tmp
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/server-common/package.json packages/server-common/
RUN npm ci -w apps/worker -w packages/server-common --include-workspace-root=false
COPY packages/server-common packages/server-common
COPY apps/worker apps/worker
USER node
WORKDIR /app/apps/worker
CMD ["npx", "tsx", "src/index.ts"]
