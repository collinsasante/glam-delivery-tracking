#!/usr/bin/env bash
# One-time TLS bootstrap for a fresh VPS deploy — run once before the first
# `docker compose up -d nginx`. After this, the `certbot` service in
# docker-compose.yml handles renewal automatically via the webroot method.
#
# Usage: docker/bootstrap-tls.sh your-domain.example.com you@example.com
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"

sed -i.bak "s/YOUR_DOMAIN/${DOMAIN}/g" docker/nginx.conf && rm docker/nginx.conf.bak

echo "▶ Requesting initial certificate for ${DOMAIN} (standalone, port 80 must be free)..."
docker compose --env-file .env.production run --rm \
  -p 80:80 \
  --entrypoint "certbot certonly --standalone --non-interactive --agree-tos -m ${EMAIL} -d ${DOMAIN}" \
  certbot

echo "▶ Starting the full stack..."
docker compose --env-file .env.production up -d

echo "✅ Done. nginx is now serving https://${DOMAIN} — the certbot service will auto-renew."
